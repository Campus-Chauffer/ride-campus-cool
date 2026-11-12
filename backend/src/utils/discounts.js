const pool = require('../db/pool');

// Conditions (fare threshold, day/night) and scope/expiry/active checks a
// code must pass for THIS specific ride and user, independent of stock —
// shared by the manual-code lookup and the auto-apply search so they can
// never drift into checking different things.
function isEligible(code, { passenger_id, originalFare, isNight }) {
  if (!code.active) return false;
  if (code.expires_at && new Date(code.expires_at) <= new Date()) return false;
  if (code.scope === 'user_specific' && code.target_user_id !== passenger_id) return false;
  if (code.min_fare_condition != null && originalFare < parseFloat(code.min_fare_condition)) return false;
  if (code.time_condition === 'night' && !isNight) return false;
  if (code.time_condition === 'day' && isNight) return false;
  return true;
}

function computeNominalDiscount(code, originalFare) {
  if (code.type === 'percent') {
    return Math.round(originalFare * (parseFloat(code.value) / 100) * 100) / 100;
  }
  return parseFloat(code.value);
}

// Looks up a code by exact string (case-insensitive) and checks everything
// EXCEPT stock/per-user limits, which can only be checked atomically at
// claim time without a race. Returns the code row, or throws an Error
// whose message is safe to show the passenger directly.
async function findCodeByString(client, codeString, { passenger_id, originalFare, isNight }) {
  const result = await client.query(
    'SELECT * FROM discount_codes WHERE UPPER(code) = UPPER($1)',
    [codeString]
  );
  const code = result.rows[0];
  if (!code) throw new Error('That discount code was not found.');
  if (!isEligible(code, { passenger_id, originalFare, isNight })) {
    if (code.min_fare_condition != null && originalFare < parseFloat(code.min_fare_condition)) {
      throw new Error(`This code requires a fare over ₵${code.min_fare_condition}.`);
    }
    if (code.time_condition === 'night' && !isNight) {
      throw new Error('This code is only valid for night rides.');
    }
    if (code.time_condition === 'day' && isNight) {
      throw new Error('This code is only valid for day rides.');
    }
    throw new Error('This code is no longer valid.');
  }
  return code;
}

// Among codes eligible for this ride, find the best auto-apply one with
// stock/per-user capacity actually remaining. No string lookup — these are
// discovered, not entered.
async function findBestAutoApplyCode(client, { passenger_id, originalFare, isNight }) {
  const result = await client.query(
    `SELECT * FROM discount_codes
     WHERE auto_apply = TRUE AND active = TRUE
     AND (expires_at IS NULL OR expires_at > NOW())
     AND (scope = 'general' OR target_user_id = $1)`,
    [passenger_id]
  );
  const candidates = result.rows.filter((code) =>
    isEligible(code, { passenger_id, originalFare, isNight })
  );
  if (candidates.length === 0) return null;

  // Stock/per-user capacity isn't checked here — claimDiscount re-verifies
  // it atomically at claim time regardless, so a candidate that turns out
  // to be exhausted just falls through to "no discount" rather than
  // blocking the ride. Picking by nominal value is a reasonable proxy for
  // "best" even though the actual applied amount may be capped later.
  candidates.sort((a, b) => computeNominalDiscount(b, originalFare) - computeNominalDiscount(a, originalFare));
  return candidates[0];
}

// Atomically claims one use of `code` for `passenger_id` against `trip_id`,
// inside the given transaction client, and returns the fare/commission the
// trip should actually be inserted with. Returns null (not an error) if the
// claim fails — callers decide whether that should block the ride (manual
// code) or just mean "no discount, proceed anyway" (auto-apply).
async function claimDiscount(client, { code, passenger_id, trip_id, originalFare, commissionRate }) {
  // Row lock on discount_codes serializes every concurrent claim attempt
  // for this exact code — including two requests from the same user at the
  // same instant — so the per-user count check below is never racing
  // against an uncommitted claim from another transaction. Verified against
  // a real database for the equivalent pattern in the ride-accept race
  // earlier in this project; this reuses the same mechanism.
  const claim = await client.query(
    `UPDATE discount_codes SET uses_count = uses_count + 1
     WHERE id = $1 AND active = TRUE
     AND (expires_at IS NULL OR expires_at > NOW())
     AND (max_uses IS NULL OR uses_count < max_uses)
     RETURNING *`,
    [code.id]
  );
  if (claim.rows.length === 0) return null; // sold out, deactivated, or expired since lookup

  const claimedCode = claim.rows[0];
  const perUserCount = await client.query(
    'SELECT COUNT(*) FROM discount_redemptions WHERE discount_code_id = $1 AND user_id = $2',
    [code.id, passenger_id]
  );
  if (parseInt(perUserCount.rows[0].count, 10) >= claimedCode.max_uses_per_user) {
    return null; // this user already used their allowance — the row lock above
    // means this count is accurate even under concurrent requests.
  }

  // 'free_ride' (the referral-program reward) is a deliberate, bounded
  // giveaway — fare and commission both go to zero, and Campus Chauffeur
  // reimburses the driver's entire fare out of pocket. It's rare by design
  // (once per referral_reward_threshold qualifying referrals), so a full
  // cash payout is acceptable here specifically.
  if (claimedCode.type === 'free_ride') {
    const actualDiscount = originalFare;
    await client.query(
      'INSERT INTO discount_redemptions (discount_code_id, user_id, trip_id, amount_discounted) VALUES ($1, $2, $3, $4)',
      [code.id, passenger_id, trip_id, actualDiscount]
    );
    return { fare: 0, commission: 0, amountDiscounted: actualDiscount };
  }

  // Every other discount (the welcome discount, any admin promo code) eats
  // into the platform's own commission first — free for the company, and
  // keeps the driver's net pay unaffected on its own, same as before today.
  // Only the portion that would still cut into the driver's own take-home
  // beyond that — a flat discount bigger than what commission on this fare
  // alone can cover — gets reimbursed in cash, so the driver's net never
  // actually drops below what they'd have earned on the same ride at full
  // price. amount_discounted here is exactly that cash reimbursement (what
  // the admin Redemptions view tracks as "owed to driver"), not the
  // passenger's total discount — those two can now differ, by design.
  const normalCommission = Math.round(originalFare * commissionRate * 100) / 100;
  const nominalDiscount = Math.min(computeNominalDiscount(claimedCode, originalFare), originalFare);
  const commissionAbsorbed = Math.min(nominalDiscount, normalCommission);
  const reimbursed = Math.round((nominalDiscount - commissionAbsorbed) * 100) / 100;

  await client.query(
    'INSERT INTO discount_redemptions (discount_code_id, user_id, trip_id, amount_discounted) VALUES ($1, $2, $3, $4)',
    [code.id, passenger_id, trip_id, reimbursed]
  );

  return {
    fare: Math.round((originalFare - nominalDiscount) * 100) / 100,
    commission: Math.round((normalCommission - commissionAbsorbed) * 100) / 100,
    amountDiscounted: reimbursed,
  };
}

module.exports = { isEligible, computeNominalDiscount, findCodeByString, findBestAutoApplyCode, claimDiscount };
