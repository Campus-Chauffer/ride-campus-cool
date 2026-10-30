import { useState, useEffect } from "react";
import { RefreshCw, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import api from "../../api";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "commission", label: "Commission charges" },
  { id: "payment", label: "Payments" },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchTransactions(); }, [filter]);

  async function fetchTransactions() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/transactions", {
        params: filter === "all" ? {} : { type: filter },
      });
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }

  const totalCommission = transactions
    .filter((t) => t.type === "commission")
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalPaid = transactions
    .filter((t) => t.type === "payment")
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const stats = [
    { label: "Commission charged", value: `₵${Math.abs(totalCommission).toFixed(2)}` },
    { label: "Payments received", value: `₵${totalPaid.toFixed(2)}` },
    { label: "Transactions shown", value: transactions.length },
  ];

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-white text-xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Every commission charge and payment across all drivers, most recent first
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-500 text-xs mb-1.5">{s.label}</p>
            <p className="text-white text-2xl font-semibold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                filter === f.id
                  ? "bg-yellow-400 text-gray-900"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchTransactions}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 px-3 py-2 rounded-lg text-sm transition"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-16">Loading…</div>
        ) : transactions.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-16">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs">
                  {["Driver", "Type", "Amount", "Via", "Note", "Date"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => {
                  const isPayment = t.type === "payment";
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition ${i === transactions.length - 1 ? "border-none" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{t.first_name} {t.last_name}</p>
                        <p className="text-gray-500 text-xs">{t.phone_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                          isPayment ? "bg-green-500/10 text-green-400" : "bg-yellow-400/10 text-yellow-400"
                        }`}>
                          {isPayment ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          {isPayment ? "Payment" : "Commission charge"}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-medium ${isPayment ? "text-green-400" : "text-gray-300"}`}>
                        ₵{Math.abs(parseFloat(t.amount)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {isPayment ? (t.paystack_reference ? "Paystack" : "Manual") : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{t.description || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(t.created_at).toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
