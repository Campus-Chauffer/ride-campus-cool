import { useState, useEffect, useMemo } from "react";
import { Download, RefreshCw, Mail } from "lucide-react";
import api from "../../api";

// Same "who counts as a driver / student" split already used on the Users
// page — a dual-role account currently browsing as a passenger still has
// to show up here as a driver if that's who a mass email should reach.
const isApprovedDriver = (u) => u.driver_status === "approved";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "student", label: "Passengers" },
  { key: "driver", label: "Drivers" },
];

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Emails() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

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

  // No email means either the user never added one, or the account was
  // deleted (requestAccountDeletion nulls it out) — either way there's
  // nothing to email, so it's excluded everywhere here, not just in the CSV.
  const withEmail = useMemo(() => users.filter((u) => u.email), [users]);

  const filtered = useMemo(
    () =>
      withEmail.filter((u) => {
        if (filter === "student") return u.role === "passenger";
        if (filter === "driver") return isApprovedDriver(u);
        return true;
      }),
    [withEmail, filter]
  );

  function roleLabel(u) {
    if (u.role === "admin") return "Admin";
    if (u.role === "driver") return isApprovedDriver(u) ? "Driver" : "Driver (unapproved)";
    return isApprovedDriver(u) ? "Student · Driver" : "Student";
  }

  function downloadCsv() {
    const rows = [
      ["Name", "Email", "Role"],
      ...filtered.map((u) => [`${u.first_name || ""} ${u.last_name || ""}`.trim(), u.email, roleLabel(u)]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const suffix = filter === "all" ? "all" : filter === "student" ? "passengers" : "drivers";
    a.href = url;
    a.download = `campus-chauffeur-emails-${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-white text-xl font-semibold tracking-tight">Emails</h1>
        <p className="text-gray-500 text-sm mt-1">
          Everyone who's signed up with an email — export a list for mass communication
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? withEmail.length
              : f.key === "student"
              ? withEmail.filter((u) => u.role === "passenger").length
              : withEmail.filter((u) => isApprovedDriver(u)).length;
          return (
            <div key={f.key} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <p className="text-gray-500 text-xs mb-1.5">{f.label}</p>
              <p className="text-white text-2xl font-semibold tracking-tight">{count}</p>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                filter === f.key ? "bg-yellow-400/10 text-yellow-400" : "text-gray-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 px-3 py-2 rounded-lg text-sm transition"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
        <button
          onClick={downloadCsv}
          disabled={filtered.length === 0}
          className="ml-auto flex items-center gap-2 bg-yellow-400 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm transition hover:bg-yellow-300 disabled:opacity-50"
        >
          <Download size={14} />
          Download CSV ({filtered.length})
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-16">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-16">No one matches this filter</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`border-b border-gray-800/50 ${i === filtered.length - 1 ? "border-none" : ""}`}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-400 flex items-center gap-1.5">
                      <Mail size={12} className="text-gray-600" /> {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          isApprovedDriver(u) || u.role === "driver"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {roleLabel(u)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
