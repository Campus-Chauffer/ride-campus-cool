import { useState, useEffect } from "react";
import { Search, Ban, CheckCircle, RefreshCw, User, X, Mail, Phone } from "lucide-react";
import api from "../../api";
import RideHistoryPanel from "../../components/RideHistoryPanel";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [actioningId, setActioningId] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
    } catch (err) {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleBlock(user) {
    const isBlocked = user.status === "blocked";
    try {
      setActioningId(user.id);
      await api.patch(`/admin/users/${user.id}/block`, {
        action: isBlocked ? "unblock" : "block",
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: isBlocked ? "active" : "blocked" } : u
        )
      );
      if (selected?.id === user.id) {
        setSelected((prev) => ({ ...prev, status: isBlocked ? "active" : "blocked" }));
      }
    } catch (err) {
      setError("Failed to update user.");
    } finally {
      setActioningId(null);
    }
  }

  // A user "is a driver" for management purposes if they have an approved
  // driver profile, independent of which mode (role) they're currently
  // browsing in — a dual-role account switched to passenger mode still
  // needs to show up wherever the admin is tracking driver counts.
  const isApprovedDriver = (u) => u.driver_status === "approved";

  const filtered = users.filter((u) => {
    const matchFilter =
      filter === "all" ||
      (filter === "active" && u.status !== "blocked") ||
      (filter === "blocked" && u.status === "blocked") ||
      (filter === "student" && u.role === "passenger") ||
      (filter === "driver" && isApprovedDriver(u));
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone_number?.includes(q);
    return matchFilter && matchSearch;
  });

  const stats = [
    { label: "Total users", value: users.length },
    { label: "Students", value: users.filter((u) => u.role === "passenger").length },
    { label: "Drivers", value: users.filter((u) => isApprovedDriver(u)).length },
    { label: "Blocked", value: users.filter((u) => u.status === "blocked").length },
  ];

  function formatDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-white text-xl font-semibold tracking-tight">Users</h1>
        <p className="text-gray-500 text-sm mt-1">All registered students and drivers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 transition"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400/50 transition"
        >
          <option value="all">All users</option>
          <option value="student">Students only</option>
          <option value="driver">Drivers only</option>
          <option value="active">Active only</option>
          <option value="blocked">Blocked only</option>
        </select>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 px-3 py-2 rounded-lg text-sm transition"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="flex gap-5 items-start">
        {/* Table */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden min-w-0">
          {loading ? (
            <div className="text-center text-gray-500 text-sm py-16">Loading users…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-16">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs">
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium">Phone</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Joined</th>
                    <th className="text-left px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user, i) => (
                    <tr
                      key={user.id}
                      onClick={() => setSelected(user)}
                      className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition cursor-pointer ${
                        i === filtered.length - 1 ? "border-none" : ""
                      } ${selected?.id === user.id ? "bg-gray-800/40" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-yellow-400/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-yellow-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-gray-500 text-xs">{user.email || "No email"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{user.phone_number || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            user.role === "driver"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-purple-500/10 text-purple-400"
                          }`}
                        >
                          {user.role === "driver"
                            ? "Driver"
                            : user.role === "admin"
                            ? "Admin"
                            : isApprovedDriver(user)
                            ? "Student · Driver"
                            : "Student"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            user.status === "blocked"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-green-500/10 text-green-400"
                          }`}
                        >
                          {user.status === "blocked" ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleBlock(user); }}
                          disabled={actioningId === user.id}
                          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                            user.status === "blocked"
                              ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                              : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          }`}
                        >
                          {actioningId === user.id ? (
                            "Updating…"
                          ) : user.status === "blocked" ? (
                            <>
                              <CheckCircle size={12} /> Unblock
                            </>
                          ) : (
                            <>
                              <Ban size={12} /> Block
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">
                {selected.role === "driver"
                  ? "Driver"
                  : isApprovedDriver(selected)
                  ? "Student · Driver"
                  : "Student"} Profile
              </h2>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Basic info — kept to what's directly relevant for admin
                  decisions (identity + contact for support purposes), not
                  anything beyond what this app itself collects. */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-yellow-400/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={22} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">{selected.first_name} {selected.last_name}</p>
                  <p className="text-gray-400 text-sm flex items-center gap-1.5">
                    <Phone size={11} /> {selected.phone_number || "—"}
                  </p>
                  <p className="text-gray-500 text-xs flex items-center gap-1.5">
                    <Mail size={11} /> {selected.email || "No email"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    selected.role === "driver" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                  }`}
                >
                  {selected.role === "driver"
                    ? "Driver"
                    : selected.role === "admin"
                    ? "Admin"
                    : isApprovedDriver(selected)
                    ? "Student · Driver"
                    : "Student"}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    selected.status === "blocked" ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
                  }`}
                >
                  {selected.status === "blocked" ? "Blocked" : "Active"}
                </span>
              </div>

              <div className="text-sm flex justify-between">
                <span className="text-gray-500">Joined</span>
                <span className="text-white">{formatDate(selected.created_at)}</span>
              </div>

              {/* Ride history, ratings & complaints */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={14} className="text-yellow-400" />
                  <p className="text-white font-medium text-sm">Ride History & Ratings</p>
                </div>
                <RideHistoryPanel userId={selected.id} />
              </div>

              {selected.role !== "admin" && (
                <button
                  onClick={() => toggleBlock(selected)}
                  disabled={actioningId === selected.id}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition disabled:opacity-50 ${
                    selected.status === "blocked"
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  }`}
                >
                  {selected.status === "blocked" ? (
                    <>
                      <CheckCircle size={14} /> Unblock
                    </>
                  ) : (
                    <>
                      <Ban size={14} /> Block
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
