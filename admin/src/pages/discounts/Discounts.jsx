import { useState, useEffect } from "react";
import { RefreshCw, Plus, X, Ban, CheckCircle2 } from "lucide-react";
import api from "../../api";

const TYPE_OPTIONS = [
  { value: "percent", label: "Percentage off" },
  { value: "flat", label: "Flat cedis off" },
];

function formatExpiry(ts) {
  if (!ts) return "No expiry";
  return new Date(ts).toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(ts) {
  return new Date(ts).toLocaleString("en-GH", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const TABS = [
  { id: "codes", label: "Codes" },
  { id: "redemptions", label: "Redemptions" },
];

export default function Discounts() {
  const [activeTab, setActiveTab] = useState("codes");
  const [codes, setCodes] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: "", type: "percent", value: "", scope: "general", target_user_id: "",
    max_uses: "", min_fare_condition: "", time_condition: "", expires_at: "",
    auto_apply: false, visible: true, description: "",
  });

  useEffect(() => { fetchCodes(); fetchUsers(); fetchRedemptions(); }, []);

  async function fetchRedemptions() {
    try {
      setRedemptionsLoading(true);
      const res = await api.get("/discounts/redemptions");
      setRedemptions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError("Failed to load redemptions.");
    } finally {
      setRedemptionsLoading(false);
    }
  }

  async function fetchCodes() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/discounts");
      setCodes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError("Failed to load discount codes.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await api.get("/admin/users");
      setUsers(Array.isArray(res.data) ? res.data.filter((u) => u.role === "passenger") : []);
    } catch (err) {
      // Non-fatal — only needed for the user-specific picker
    }
  }

  function resetForm() {
    setForm({
      code: "", type: "percent", value: "", scope: "general", target_user_id: "",
      max_uses: "", min_fare_condition: "", time_condition: "", expires_at: "",
      auto_apply: false, visible: true, description: "",
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return;
    try {
      setSubmitting(true);
      setError(null);
      await api.post("/discounts", {
        code: form.code.trim(),
        type: form.type,
        value: parseFloat(form.value),
        scope: form.scope,
        target_user_id: form.scope === "user_specific" ? parseInt(form.target_user_id, 10) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
        min_fare_condition: form.min_fare_condition ? parseFloat(form.min_fare_condition) : null,
        time_condition: form.time_condition || null,
        expires_at: form.expires_at || null,
        auto_apply: form.auto_apply,
        visible: form.visible,
        description: form.description || null,
      });
      setShowForm(false);
      resetForm();
      fetchCodes();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(code) {
    try {
      await api.patch(`/discounts/${code.id}`, { active: !code.active });
      fetchCodes();
    } catch (err) {
      setError("Failed to update code.");
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-semibold tracking-tight">Discounts</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage passenger promo codes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { fetchCodes(); fetchRedemptions(); }}
            className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 px-3 py-2 rounded-lg text-sm transition"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-yellow-400 text-gray-900 font-semibold px-3 py-2 rounded-lg text-sm hover:bg-yellow-300 transition"
          >
            <Plus size={14} /> New code
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab.id
                ? "border-yellow-400 text-yellow-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {activeTab === "codes" && (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-16">Loading…</div>
        ) : codes.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-16">No discount codes yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs">
                  {["Code", "Discount", "Scope", "Uses", "Conditions", "Expires", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((c, i) => (
                  <tr key={c.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition ${i === codes.length - 1 ? "border-none" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium font-mono">{c.code}</p>
                      {c.description && <p className="text-gray-500 text-xs mt-0.5">{c.description}</p>}
                      {!c.visible && <span className="text-xs text-gray-500">Hidden</span>}
                      {c.auto_apply && <span className="text-xs text-yellow-400 ml-2">Auto-apply</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {c.type === "percent" ? `${parseFloat(c.value)}%` : `₵${parseFloat(c.value).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {c.scope === "user_specific" ? `${c.target_first_name || ""} ${c.target_last_name || ""}`.trim() || "1 user" : "Everyone"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {c.uses_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {c.min_fare_condition ? `Over ₵${parseFloat(c.min_fare_condition).toFixed(0)}` : ""}
                      {c.min_fare_condition && c.time_condition ? " · " : ""}
                      {c.time_condition ? `${c.time_condition} only` : ""}
                      {!c.min_fare_condition && !c.time_condition ? "—" : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatExpiry(c.expires_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${c.active ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>
                        {c.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(c)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-800/60 text-gray-300 hover:bg-gray-800 transition"
                      >
                        {c.active ? <Ban size={12} /> : <CheckCircle2 size={12} />}
                        {c.active ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {activeTab === "redemptions" && (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {redemptionsLoading ? (
          <div className="text-center text-gray-500 text-sm py-16">Loading…</div>
        ) : redemptions.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-16">No discounted rides yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs">
                  {["Rider", "Driver", "Code", "Original Fare", "Discounted Fare", "Owed to Driver", "Route", "Date"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition ${i === redemptions.length - 1 ? "border-none" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{r.first_name} {r.last_name}</p>
                      <p className="text-gray-500 text-xs">{r.phone_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.driver_first_name ? (
                        <>
                          <p className="text-white font-medium">{r.driver_first_name} {r.driver_last_name}</p>
                          <p className="text-gray-500 text-xs">{r.driver_phone_number}</p>
                        </>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300 font-mono">{r.code}</span>
                      {r.discount_type === "free_ride" && (
                        <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Free ride</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 line-through">₵{parseFloat(r.original_fare).toFixed(2)}</td>
                    <td className="px-4 py-3 text-white font-medium">₵{parseFloat(r.discounted_fare).toFixed(2)}</td>
                    <td className="px-4 py-3 text-green-400 font-medium">₵{parseFloat(r.amount_discounted).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                      {r.pickup_address} → {r.dropoff_address}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(r.trip_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <form
            onSubmit={handleCreate}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg space-y-4"
          >
            <div className="flex items-start justify-between">
              <h2 className="text-white font-semibold text-lg">New discount code</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Code</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE10"
                  className="w-full bg-gray-800/60 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-yellow-400/50"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-gray-800/60 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                >
                  {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5">
                Value ({form.type === "percent" ? "%" : "₵"})
              </label>
              <input
                type="number" step="0.01" min="0"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-32 bg-gray-800/60 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5">Who can use it</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setForm({ ...form, scope: "general" })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${form.scope === "general" ? "bg-yellow-400 text-gray-900" : "bg-gray-800/60 text-gray-400"}`}>
                  Anyone
                </button>
                <button type="button" onClick={() => setForm({ ...form, scope: "user_specific" })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${form.scope === "user_specific" ? "bg-yellow-400 text-gray-900" : "bg-gray-800/60 text-gray-400"}`}>
                  One specific rider
                </button>
              </div>
              {form.scope === "user_specific" && (
                <select
                  value={form.target_user_id}
                  onChange={(e) => setForm({ ...form, target_user_id: e.target.value })}
                  className="w-full bg-gray-800/60 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                >
                  <option value="">Select a rider…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.phone_number})</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">
                  Stock limit (blank = unlimited)
                </label>
                <input
                  type="number" min="1"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="e.g. 40"
                  className="w-full bg-gray-800/60 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                />
                {form.max_uses && (
                  <p className="text-gray-600 text-xs mt-1">Locked to 1 use per account</p>
                )}
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Expires</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full bg-gray-800/60 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">
                  Minimum fare (optional)
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.min_fare_condition}
                  onChange={(e) => setForm({ ...form, min_fare_condition: e.target.value })}
                  placeholder="e.g. 16"
                  className="w-full bg-gray-800/60 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs font-medium mb-1.5">Time of day</label>
                <select
                  value={form.time_condition}
                  onChange={(e) => setForm({ ...form, time_condition: e.target.value })}
                  className="w-full bg-gray-800/60 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                >
                  <option value="">Any</option>
                  <option value="day">Day only</option>
                  <option value="night">Night only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5">Description (admin note)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Launch week promo"
                className="w-full bg-gray-800/60 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.auto_apply} onChange={(e) => setForm({ ...form, auto_apply: e.target.checked })} />
                Auto-apply (no code entry needed)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />
                Visible in Discounts tab
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-800 rounded-lg transition">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !form.code.trim() || !form.value}
                className="px-4 py-2 text-sm font-semibold bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 disabled:opacity-40 transition"
              >
                {submitting ? "Creating…" : "Create code"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
