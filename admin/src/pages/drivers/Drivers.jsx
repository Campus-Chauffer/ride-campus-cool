import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, Ban, X, FileText, Car, User, MapPin, Pencil } from "lucide-react";
import api from "../../api";
import RideHistoryPanel from "../../components/RideHistoryPanel";

const EDITABLE_FIELDS = [
  { key: "vehicle_make", label: "Make" },
  { key: "vehicle_model", label: "Model" },
  { key: "vehicle_color", label: "Color" },
  { key: "plate_number", label: "Plate" },
  { key: "ghana_card_number", label: "Ghana Card No." },
  { key: "license_number", label: "License No." },
  { key: "license_expiry", label: "License Expiry", type: "date" },
];

// The API returns license_expiry as a full ISO timestamp — <input type="date">
// needs just the YYYY-MM-DD portion, otherwise it renders blank.
function toDateInputValue(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

const APPROVAL_STYLES = {
  approved: "bg-green-500/10 text-green-400",
  pending: "bg-yellow-500/10 text-yellow-400",
  blocked: "bg-red-500/10 text-red-400",
  rejected: "bg-red-500/10 text-red-400",
};

function ImagePreview({ url, label }) {
  if (!url) return (
    <div className="bg-gray-800/60 rounded-lg h-28 flex items-center justify-center text-gray-500 text-xs">{label} — not uploaded</div>
  );
  return (
    <div>
      <p className="text-gray-500 text-xs mb-1.5">{label}</p>
      <img
        src={url}
        alt={label}
        className="w-full h-28 object-cover rounded-lg border border-gray-800 cursor-pointer hover:opacity-90 hover:border-gray-700 transition"
        onClick={() => window.open(url, "_blank")}
      />
    </div>
  );
}

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchDrivers(); }, []);

  function startEditing() {
    const form = {};
    EDITABLE_FIELDS.forEach(({ key, type }) => {
      form[key] = type === "date" ? toDateInputValue(selected[key]) : (selected[key] || "");
    });
    setEditForm(form);
    setEditing(true);
  }

  async function saveDriverEdits() {
    try {
      setSaving(true);
      setError(null);
      const res = await api.patch(`/admin/drivers/${selected.id}`, editForm);
      const updated = res.data.driver;
      setDrivers((prev) => prev.map((d) => d.id === selected.id ? { ...d, ...updated } : d));
      setSelected((prev) => ({ ...prev, ...updated }));
      setEditing(false);
      setSuccessMsg("Driver profile updated.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update driver profile.");
    } finally {
      setSaving(false);
    }
  }

  async function fetchDrivers() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/drivers");
      setDrivers(Array.isArray(res.data) ? res.data : res.data.drivers || []);
    } catch (err) {
      setError("Failed to load drivers.");
    } finally {
      setLoading(false);
    }
  }

  async function approveDriver(driverId) {
    try {
      setActioningId(driverId);
      await api.patch(`/admin/drivers/${driverId}/approve`);
      setDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, approval_status: "approved" } : d));
      if (selected?.id === driverId) setSelected((prev) => ({ ...prev, approval_status: "approved" }));
      setSuccessMsg("Driver approved successfully.");
    } catch (err) {
      setError("Failed to approve driver.");
    } finally {
      setActioningId(null);
    }
  }

  async function blockDriver(driverId) {
    try {
      setActioningId(driverId);
      await api.patch(`/admin/drivers/${driverId}/block`);
      setDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, approval_status: "blocked" } : d));
      if (selected?.id === driverId) setSelected((prev) => ({ ...prev, approval_status: "blocked" }));
      setSuccessMsg("Driver blocked.");
    } catch (err) {
      setError("Failed to block driver.");
    } finally {
      setActioningId(null);
    }
  }

  const filtered = drivers.filter((d) => {
    if (filter === "all") return true;
    if (filter === "online") return d.is_online;
    return d.approval_status === filter;
  });

  const stats = [
    { label: "Total drivers", value: drivers.length },
    { label: "Online now", value: drivers.filter((d) => d.is_online).length },
    { label: "Pending review", value: drivers.filter((d) => d.approval_status === "pending").length },
    { label: "Approved", value: drivers.filter((d) => d.approval_status === "approved").length },
    { label: "Blocked", value: drivers.filter((d) => d.approval_status === "blocked").length },
  ];

  function formatDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-white text-xl font-semibold tracking-tight">Drivers</h1>
        <p className="text-gray-500 text-sm mt-1">Review and manage driver applications</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-500 text-xs mb-1.5">{s.label}</p>
            <p className="text-white text-2xl font-semibold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 text-sm flex justify-between items-center">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="text-green-400/60 hover:text-green-400 text-lg leading-none">×</button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400/50 transition">
          <option value="all">All drivers</option>
          <option value="online">Online now</option>
          <option value="pending">Pending review</option>
          <option value="approved">Approved</option>
          <option value="blocked">Blocked</option>
        </select>
        <button onClick={fetchDrivers}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 px-3 py-2 rounded-lg text-sm transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex gap-5 items-start">
        {/* Table */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden min-w-0">
          {loading ? (
            <div className="text-center text-gray-500 text-sm py-16">Loading drivers…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-16">No drivers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs">
                    {["Driver", "Vehicle", "Plate", "Submitted", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((driver, i) => (
                    <tr
                      key={driver.id}
                      onClick={() => { setSelected(driver); setEditing(false); }}
                      className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition cursor-pointer ${i === filtered.length - 1 ? "border-none" : ""} ${selected?.id === driver.id ? "bg-gray-800/40" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-8 h-8 bg-yellow-400/10 rounded-full flex items-center justify-center">
                              <User size={14} className="text-yellow-400" />
                            </div>
                            {driver.is_online && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-900"
                                title="Online"
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{driver.first_name} {driver.last_name}</p>
                            <p className="text-gray-500 text-xs flex items-center gap-1.5">
                              {driver.phone_number}
                              {driver.is_online && <span className="text-green-400 font-medium">· Online</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {driver.vehicle_make && driver.vehicle_model
                          ? `${driver.vehicle_make} ${driver.vehicle_model}`
                          : "—"}
                        {driver.vehicle_color && <span className="text-gray-500"> · {driver.vehicle_color}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{driver.plate_number || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(driver.submission_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${APPROVAL_STYLES[driver.approval_status] || "bg-gray-500/10 text-gray-400"}`}>
                          {driver.approval_status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {driver.approval_status !== "approved" && (
                            <button
                              onClick={() => approveDriver(driver.id)}
                              disabled={actioningId === driver.id}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition disabled:opacity-50"
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                          )}
                          {driver.approval_status !== "blocked" && (
                            <button
                              onClick={() => blockDriver(driver.id)}
                              disabled={actioningId === driver.id}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                            >
                              <Ban size={12} /> Block
                            </button>
                          )}
                        </div>
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
            {/* Panel header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">Driver Profile</h2>
              <div className="flex items-center gap-3">
                {!editing && (
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-1.5 text-xs font-medium text-yellow-400 hover:text-yellow-300 transition"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                )}
                <button onClick={() => { setSelected(null); setEditing(false); }} className="text-gray-500 hover:text-white transition">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Basic info */}
              <div className="flex items-center gap-3">
                {selected.profile_photo ? (
                  <img
                    src={selected.profile_photo}
                    alt="Driver"
                    className="w-14 h-14 rounded-full object-cover border-2 border-yellow-400/30 flex-shrink-0 cursor-pointer hover:opacity-90 transition"
                    onClick={() => window.open(selected.profile_photo, "_blank")}
                  />
                ) : (
                  <div className="w-14 h-14 bg-yellow-400/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={22} className="text-yellow-400" />
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold">{selected.first_name} {selected.last_name}</p>
                  <p className="text-gray-400 text-sm">{selected.phone_number}</p>
                  <p className="text-gray-500 text-xs">{selected.email || "No email"}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${APPROVAL_STYLES[selected.approval_status] || "bg-gray-500/10 text-gray-400"}`}>
                  {selected.approval_status || "—"}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${selected.is_online ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${selected.is_online ? "bg-green-400" : "bg-gray-500"}`} />
                  {selected.is_online ? "Online" : "Offline"}
                </span>
              </div>

              {editing ? (
                /* Edit form — covers everything an admin might need to fill
                   in or correct after the fact (vehicle + document fields),
                   whether or not the driver's already approved. */
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Pencil size={14} className="text-yellow-400" />
                    <p className="text-white font-medium text-sm">Edit Driver Info</p>
                  </div>
                  <div className="space-y-3">
                    {EDITABLE_FIELDS.map(({ key, label, type }) => (
                      <div key={key}>
                        <label className="text-gray-500 text-xs block mb-1">{label}</label>
                        <input
                          type={type || "text"}
                          value={editForm[key] || ""}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400/50 transition"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={saveDriverEdits}
                      disabled={saving}
                      className="flex-1 py-2 text-sm font-semibold bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 rounded-lg transition disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      disabled={saving}
                      className="flex-1 py-2 text-sm font-semibold bg-gray-800 text-gray-400 hover:text-white rounded-lg transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Vehicle info */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Car size={14} className="text-yellow-400" />
                      <p className="text-white font-medium text-sm">Vehicle Details</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      {[
                        ["Make", selected.vehicle_make],
                        ["Model", selected.vehicle_model],
                        ["Color", selected.vehicle_color],
                        ["Plate", selected.plate_number],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between">
                          <span className="text-gray-500">{label}</span>
                          <span className="text-white">{value || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={14} className="text-yellow-400" />
                      <p className="text-white font-medium text-sm">Documents</p>
                    </div>
                    <div className="space-y-2 text-sm mb-4">
                      {[
                        ["Ghana Card No.", selected.ghana_card_number],
                        ["License No.", selected.license_number],
                        ["License Expiry", formatDate(selected.license_expiry)],
                        ["Submitted", formatDate(selected.submission_date)],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between">
                          <span className="text-gray-500">{label}</span>
                          <span className="text-white">{value || "—"}</span>
                        </div>
                      ))}
                    </div>

                {/* Document images */}
                <div className="space-y-3">
                  <ImagePreview url={selected.profile_photo} label="Driver Face Photo" />
                  <ImagePreview url={selected.ghana_card_image} label="Ghana Card" />
                  <ImagePreview url={selected.license_image} label="Driver's License" />
                  <ImagePreview url={selected.vehicle_front_image} label="Vehicle Front" />
                  <ImagePreview url={selected.vehicle_side_image} label="Vehicle Side" />
                  <ImagePreview url={selected.vehicle_back_image} label="Vehicle Back" />
                </div>
              </div>

              {/* Vehicle Checklist */}
              {selected.vehicle_checklist && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle size={14} className="text-yellow-400" />
                    <p className="text-white font-medium text-sm">Vehicle Requirements</p>
                  </div>
                  <div className="bg-gray-800/60 rounded-lg overflow-hidden">
                    {[
                      { id: 'ac', label: 'Working air conditioning' },
                      { id: 'seatbelts', label: 'All seatbelts functional' },
                      { id: 'clean', label: 'Vehicle clean and presentable' },
                      { id: 'roadworthy', label: 'Roadworthy and insured' },
                      { id: 'phone', label: 'Phone mount for navigation' },
                    ].map((item, index, arr) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm ${index < arr.length - 1 ? 'border-b border-gray-800' : ''}`}
                      >
                        <span className="text-gray-400">{item.label}</span>
                        {selected.vehicle_checklist[item.id]
                          ? <span className="text-green-400 font-medium text-xs">✓ Confirmed</span>
                          : <span className="text-red-400 font-medium text-xs">✗ Not confirmed</span>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ride history, ratings & complaints */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} className="text-yellow-400" />
                  <p className="text-white font-medium text-sm">Ride History & Ratings</p>
                </div>
                <RideHistoryPanel userId={selected.user_id} />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                {selected.approval_status !== "approved" && (
                  <button
                    onClick={() => approveDriver(selected.id)}
                    disabled={actioningId === selected.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition disabled:opacity-50"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                )}
                {selected.approval_status !== "blocked" && (
                  <button
                    onClick={() => blockDriver(selected.id)}
                    disabled={actioningId === selected.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition disabled:opacity-50"
                  >
                    <Ban size={14} /> Block
                  </button>
                )}
              </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}