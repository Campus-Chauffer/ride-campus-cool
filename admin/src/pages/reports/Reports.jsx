import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import api from "../../api";

const STATUS_STYLES = {
  pending: "bg-yellow-500/10 text-yellow-400",
  reviewed: "bg-blue-500/10 text-blue-400",
  resolved: "bg-green-500/10 text-green-400",
  dismissed: "bg-gray-500/10 text-gray-400",
};

const TYPE_STYLES = {
  passenger: "bg-purple-500/10 text-purple-400",
  driver: "bg-blue-500/10 text-blue-400",
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/reports/admin");
      setReports(Array.isArray(res.data) ? res.data : res.data.reports || []);
    } catch (err) {
      setError("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(reportId, newStatus) {
    try {
      setUpdatingId(reportId);
      await api.patch(`/reports/admin/${reportId}/review`, { status: newStatus });
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: newStatus } : r));
      if (selected?.id === reportId) setSelected((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      setError("Failed to update report.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = reports.filter((r) => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchType = typeFilter === "all" || r.type === typeFilter;
    return matchStatus && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function formatDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric" });
  }

  const stats = [
    { label: "Total", value: reports.length },
    { label: "Pending", value: reports.filter((r) => r.status === "pending").length },
    { label: "Resolved", value: reports.filter((r) => r.status === "resolved").length },
    { label: "Dismissed", value: reports.filter((r) => r.status === "dismissed").length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-xl font-semibold">Reports</h1>
        <p className="text-gray-400 text-sm mt-1">Complaints submitted by passengers and drivers</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className="text-white text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400">
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400">
          <option value="all">All types</option>
          <option value="passenger">Passenger reports</option>
          <option value="driver">Driver reports</option>
        </select>
        <button onClick={fetchReports}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden min-w-0">
          {loading ? (
            <div className="text-center text-gray-500 text-sm py-16">Loading reports…</div>
          ) : paginated.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-16">No reports found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs">
                    {["ID", "Reporter", "Reported", "Type", "Status", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((report, i) => (
                    <tr
                      key={report.id}
                      onClick={() => setSelected(report)}
                      className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition cursor-pointer ${i === paginated.length - 1 ? "border-none" : ""} ${selected?.id === report.id ? "bg-gray-800/40" : ""}`}
                    >
                      <td className="px-4 py-3 text-white font-medium">#{report.id}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {report.reporter_first_name ? `${report.reporter_first_name} ${report.reporter_last_name}` : report.reporter_id || "—"}
                        </td>
                      <td className="px-4 py-3 text-gray-400">
                        {report.reported_first_name ? `${report.reported_first_name} ${report.reported_last_name}` : report.reported_id || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_STYLES[report.type] || "bg-gray-500/10 text-gray-400"}`}>
                          {report.type || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[report.status] || "bg-gray-500/10 text-gray-400"}`}>
                          {report.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(report.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="w-72 flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-semibold">Report #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="flex gap-2 mb-4">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_STYLES[selected.type] || "bg-gray-500/10 text-gray-400"}`}>{selected.type || "—"}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[selected.status] || "bg-gray-500/10 text-gray-400"}`}>{selected.status || "—"}</span>
            </div>
            <div className="space-y-2 text-sm mb-4">
              {[
                ["Reporter", selected.reporter_first_name ? `${selected.reporter_first_name} ${selected.reporter_last_name}` : selected.reporter_id],
                ["Reported", selected.reported_first_name ? `${selected.reported_first_name} ${selected.reported_last_name}` : selected.reported_id],
                ["Trip", selected.trip_id ? `#${selected.trip_id}` : "—"],
                ["Date", formatDate(selected.created_at)]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-white">{value || "—"}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300 leading-relaxed mb-5">
              {selected.description || "No description provided."}
            </div>
            <p className="text-gray-500 text-xs font-medium mb-2">Update status</p>
            <div className="space-y-2">
              {["reviewed", "resolved", "dismissed"].map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(selected.id, s)}
                  disabled={selected.status === s || updatingId === selected.id}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition ${selected.status === s ? "border-gray-700 text-gray-600 cursor-default" : "border-gray-700 text-gray-300 hover:border-yellow-400 hover:text-yellow-400"}`}
                >
                  {updatingId === selected.id ? "Updating…" : `Mark as ${s.charAt(0).toUpperCase() + s.slice(1)}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!loading && filtered.length > PER_PAGE && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs hover:text-white disabled:opacity-40 transition">← Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs hover:text-white disabled:opacity-40 transition">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}