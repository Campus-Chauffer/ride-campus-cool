import { useState, useEffect } from "react";
import { RefreshCw, DollarSign } from "lucide-react";
import api from "../../api";

export default function Wallet() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [filter, setFilter] = useState("all");
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => { fetchWallets(); fetchLedger(); }, []);

  async function fetchWallets() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/drivers");
      const drivers = Array.isArray(res.data) ? res.data : res.data.drivers || [];
      setWallets(drivers);
    } catch (err) {
      setError("Failed to load wallet data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordPayment() {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) return;
    try {
      setSubmitting(true);
      await api.post("/wallet/payment", {
        driver_id: paymentModal.driverId,
        amount: parseFloat(paymentAmount),
        description: paymentNote || "Admin recorded payment",
      });
      setSuccessMsg(`Payment of ₵${paymentAmount} recorded for ${paymentModal.driverName}`);
      setPaymentModal(null);
      setPaymentAmount("");
      setPaymentNote("");
      fetchWallets();
      fetchLedger();
    } catch (err) {
      setError("Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  }
  async function fetchLedger() {
  try {
    setLedgerLoading(true);
    const res = await api.get("/admin/ledger");
    setLedger(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.log("Ledger error:", err);
  } finally {
    setLedgerLoading(false);
  }
}

  const filtered = wallets.filter((d) => {
    if (filter === "locked") return d.is_locked;
    if (filter === "active") return !d.is_locked;
    return true;
  });

  const totalOutstanding = wallets.reduce(
    (sum, d) => sum + parseFloat(d.outstanding_balance || 0), 0
  );
  const lockedCount = wallets.filter((d) => d.is_locked).length;

  const stats = [
    { label: "Total drivers", value: wallets.length },
    { label: "Locked out", value: lockedCount },
    { label: "Total outstanding", value: `₵${Math.abs(totalOutstanding).toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-xl font-semibold">Wallet & Commission</h1>
        <p className="text-gray-400 text-sm mt-1">Track driver commission balances and record payments</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className="text-white text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 text-sm flex justify-between items-center">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="text-green-400 hover:text-green-300 ml-4">×</button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
        >
          <option value="all">All drivers</option>
          <option value="locked">Locked only</option>
          <option value="active">Active only</option>
        </select>
        <button
          onClick={fetchWallets}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm transition"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-16">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-16">No drivers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs">
                  {["Driver", "Total Owed", "Total Paid", "Outstanding", "Status", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((driver, i) => {
                  const w = driver;
                  const outstanding = parseFloat(driver.outstanding_balance || 0);
                  return (
                    <tr
                      key={driver.id}
                      className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition ${i === filtered.length - 1 ? "border-none" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{driver.first_name} {driver.last_name}</p>
                        <p className="text-gray-500 text-xs">{driver.phone_number}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-400">₵{parseFloat(w.total_commission_owed || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-400">₵{parseFloat(w.total_paid || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={outstanding < 0 ? "text-red-400 font-medium" : "text-white"}>
                          ₵{Math.abs(outstanding).toFixed(2)}{outstanding < 0 ? " owed" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${w.is_locked ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                          {w.is_locked ? "Locked" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setPaymentModal({
                            driverId: driver.id,
                            driverName: `${driver.first_name} ${driver.last_name}`,
                            outstanding: Math.abs(outstanding),
                          })}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 transition"
                        >
                          <DollarSign size={12} /> Record payment
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setPaymentModal(null)}
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-white font-semibold text-lg mb-1">Record Payment</h2>
            <p className="text-gray-400 text-sm mb-6">
              {paymentModal.driverName} — ₵{paymentModal.outstanding.toFixed(2)} outstanding
            </p>

            <label className="block text-gray-400 text-sm font-medium mb-1">Amount paid (GH₵)</label>
            <input
              type="number"
              placeholder="e.g. 40"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 mb-4"
            />

            <label className="block text-gray-400 text-sm font-medium mb-1">Note (optional)</label>
            <input
              type="text"
              placeholder="e.g. Cash payment at office"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 mb-6"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPaymentModal(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={submitting || !paymentAmount}
                className="px-4 py-2 text-sm font-semibold bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 disabled:opacity-50 transition"
              >
                {submitting ? "Saving…" : "Confirm payment"}
              </button>
            </div>
          </div>
        </div>
      )}
      
       {/* Payment History */}
      <div>
        <h2 className="text-white font-semibold mb-4">Payment History</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {ledgerLoading ? (
            <div className="text-center text-gray-500 text-sm py-8">Loading…</div>
          ) : ledger.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">No payments recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs">
                    {["Driver", "Amount", "Note", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry, i) => (
                    <tr key={entry.id} className={`border-b border-gray-800/50 ${i === ledger.length - 1 ? "border-none" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{entry.first_name} {entry.last_name}</p>
                        <p className="text-gray-500 text-xs">{entry.phone_number}</p>
                      </td>
                      <td className="px-4 py-3 text-green-400 font-medium">₵{parseFloat(entry.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-400">{entry.description || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(entry.created_at).toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}