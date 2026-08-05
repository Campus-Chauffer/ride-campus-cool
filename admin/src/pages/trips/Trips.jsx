import { useState, useEffect } from "react";
import { Search, RefreshCw, MapPin } from "lucide-react";
import api from "../../api";

const STATUS_STYLES = {
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-red-500/10 text-red-400",
  in_progress: "bg-blue-500/10 text-blue-400",
  active: "bg-blue-500/10 text-blue-400",
  arrived: "bg-purple-500/10 text-purple-400",
  offered: "bg-yellow-500/10 text-yellow-400",
  accepted: "bg-yellow-500/10 text-yellow-400",
  requested: "bg-gray-500/10 text-gray-300",
  pending: "bg-yellow-500/10 text-yellow-400",
  no_driver_found: "bg-orange-500/10 text-orange-400",
};

function statusLabel(status) {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  useEffect(() => {
    fetchTrips();
  }, []);

  async function fetchTrips() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/trips");
      setTrips(Array.isArray(res.data) ? res.data : res.data.trips || []);
    } catch (err) {
      setError("Failed to load trips.");
    } finally {
      setLoading(false);
    }
  }

  const totalRevenue = trips
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(t.fare || 0), 0);

  const totalCommission = trips
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(t.commission || 0), 0);

  const stats = [
    { label: "Total trips", value: trips.length },
    { label: "Completed", value: trips.filter((t) => t.status === "completed").length },
    { label: "Cancelled", value: trips.filter((t) => t.status === "cancelled").length },
    { label: "Revenue", value: `₵${totalRevenue.toFixed(2)}` },
    { label: "Commission", value: `₵${totalCommission.toFixed(2)}` },
  ];

  const filtered = trips.filter((t) => {
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      String(t.id).includes(q) ||
      String(t.passenger_id || "").includes(q) ||
      String(t.driver_id || "").includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function formatDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-white text-xl font-semibold tracking-tight">Trips</h1>
        <p className="text-gray-500 text-sm mt-1">All rides on Campus Chauffeur</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-500 text-xs mb-1.5">{s.label}</p>
            <p className="text-white text-2xl font-semibold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by trip ID, passenger, driver…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400/50 transition"
        >
          <option value="all">All statuses</option>
          <option value="requested">Requested</option>
          <option value="offered">Offered</option>
          <option value="accepted">Accepted</option>
          <option value="arrived">Arrived</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_driver_found">No Driver Found</option>
        </select>
        <button
          onClick={fetchTrips}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 px-3 py-2 rounded-lg text-sm transition"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-16">Loading trips…</div>
        ) : paginated.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-16">No trips found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">Passenger</th>
                  <th className="text-left px-4 py-3 font-medium">Driver</th>
                  <th className="text-left px-4 py-3 font-medium">Fare</th>
                  <th className="text-left px-4 py-3 font-medium">Commission</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((trip, i) => (
                  <tr
                    key={trip.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition ${
                      i === paginated.length - 1 ? "border-none" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-yellow-400" />
                        <span className="text-white font-medium">#{trip.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{trip.passenger_id || "—"}</td>
                    <td className="px-4 py-3 text-gray-400">{trip.driver_id || "Unassigned"}</td>
                    <td className="px-4 py-3 text-white font-medium">
                      {trip.fare ? `₵${parseFloat(trip.fare).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {trip.commission ? `₵${parseFloat(trip.commission).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          STATUS_STYLES[trip.status] || "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {statusLabel(trip.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(trip.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PER_PAGE && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-400 hover:text-white hover:border-gray-700 disabled:opacity-40 transition"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-400 hover:text-white hover:border-gray-700 disabled:opacity-40 transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}