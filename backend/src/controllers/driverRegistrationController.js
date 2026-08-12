const pool = require('../db/pool');

const submitRegistration = async (req, res) => {
  const user_id = req.user.id;
  const {
    ghana_card_number,
    ghana_card_image,
    license_number,
    license_image,
    license_expiry,
    vehicle_make,
    vehicle_model,
    vehicle_color,
    plate_number,
    vehicle_front_image,
    vehicle_side_image,
    vehicle_back_image,
    vehicle_checklist,
    profile_photo,
  } = req.body;

  const formattedExpiry = license_expiry
    ? `${license_expiry.split('/')[1]}-${license_expiry.split('/')[0]}-01`
    : null;

  if (!ghana_card_number || !license_number || !vehicle_make || !vehicle_model || !plate_number) {
    return res.status(400).json({ error: 'All required fields must be filled' });
  }

  try {
    let driverResult = await pool.query(
      'SELECT * FROM drivers WHERE user_id = $1',
      [user_id]
    );

    if (driverResult.rows.length === 0) {
      // No drivers row yet — true for an existing passenger applying to
      // become a driver for the first time, since that row was previously
      // only ever created at initial signup when role='driver'. Create it
      // (plus the wallet every driver needs) so the UPDATE below has
      // something to act on, same as the original signup path does.
      const created = await pool.query(
        'INSERT INTO drivers (user_id) VALUES ($1) RETURNING *',
        [user_id]
      );
      await pool.query('INSERT INTO wallets (driver_id) VALUES ($1)', [created.rows[0].id]);
      driverResult = created;
    }

    await pool.query(
      `UPDATE drivers SET
        ghana_card_number = $1,
        ghana_card_image = $2,
        license_number = $3,
        license_image = $4,
        license_expiry = $5,
        vehicle_make = $6,
        vehicle_model = $7,
        vehicle_color = $8,
        plate_number = $9,
        vehicle_front_image = $10,
        vehicle_side_image = $11,
        vehicle_back_image = $12,
        vehicle_checklist = $13,
        approval_status = 'pending',
        submission_date = NOW()
       WHERE user_id = $14`,
      [
        ghana_card_number, ghana_card_image,
        license_number, license_image, formattedExpiry,
        vehicle_make, vehicle_model, vehicle_color, plate_number,
        vehicle_front_image, vehicle_side_image, vehicle_back_image,
        vehicle_checklist ? JSON.stringify(vehicle_checklist) : null,
        user_id
      ]
    );
    if (profile_photo) {
      await pool.query(
        'UPDATE users SET profile_photo = $1 WHERE id = $2',
        [profile_photo, user_id]
      );
    }

    res.json({ message: 'Registration submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getRegistrationStatus = async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT approval_status, submission_date, vehicle_make, 
              vehicle_model, vehicle_color, plate_number
       FROM drivers WHERE user_id = $1`,
      [user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { submitRegistration, getRegistrationStatus };