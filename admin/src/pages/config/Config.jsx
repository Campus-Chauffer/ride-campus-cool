import { useState, useEffect } from "react";
import { RefreshCw, Save } from "lucide-react";
import api from "../../api";

const CONFIG_FIELDS = [
  { key: "flat_rate_short", label: "Flat rate under 0.7km (day)", description: "Fixed fare for trips shorter than 0.7km during the day", prefix: "₵" },
  { key: "flat_rate_short_night", label: "Flat rate under 0.7km (night)", description: "Fixed fare for trips shorter than 0.7km between 11PM–5AM", prefix: "₵" },
  { key: "base_fare", label: "Base fare (0.7km–4km)", description: "Starting fare for mid-distance trips", prefix: "₵" },
  { key: "per_km_rate", label: "Per km rate (0.7km–4km)", description: "Added per kilometre on top of base fare", prefix: "₵" },
  { key: "flat_rate_long_day", label: "Flat rate over 4km (day)", description: "Fixed fare for trips longer than 4km during the day", prefix: "₵" },
  { key: "flat_rate_long_night", label: "Flat rate over 4km (night)", description: "Fixed fare for trips longer than 4km between 11PM–5AM", prefix: "₵" },
  { key: "commission_rate", label: "Commission rate", description: "Percentage of each fare taken as platform commission", prefix: "%" },
  { key: "lockout_threshold", label: "Lockout threshold", description: "Outstanding balance at which a driver gets locked out", prefix: "₵" },
];

export default function Config() {
  const [values, setValues] = useState({});
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => { fetchConfig(); }, []);

  async function fetchConfig() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/config");
      let flat = {};
      if (Array.isArray(res.data)) {
        res.data.forEach((row) => { flat[row.key] = row.value; });
      } else {
        flat = res.data;
      }
      setValues(flat);
      setOriginal(flat);
    } catch (err) {
      setError("Failed to load config settings.");
    } finally {
      setLoading(false);
    }
  }

  function hasChanges() {
    return CONFIG_FIELDS.some((f) => String(values[f.key] ?? "") !== String(original[f.key] ?? ""));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      const changed = CONFIG_FIELDS.filter((f) => String(values[f.key] ?? "") !== String(original[f.key] ?? ""));
      await Promise.all(changed.map((f) => api.patch("/admin/config", { key: f.key, value: values[f.key] })));
      setOriginal({ ...values });
      setSuccessMsg(`${changed.length} setting${changed.length > 1 ? "s" : ""} updated successfully.`);
    } catch (err) {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-white text-xl font-semibold">Pricing & Config</h1>
        <p className="text-gray-400 text-sm mt-1">Update fare rates and platform settings. Changes apply to all new trips immediately.</p>
      </div>

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 text-sm flex justify-between items-center">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-4">×</button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm py-8">Loading settings…</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/50">
              <p className="text-white font-medium text-sm">Fare settings</p>
            </div>
            {CONFIG_FIELDS.map((field, i) => (
              <div
                key={field.key}
                className={`flex items-center justify-between px-4 py-4 gap-4 flex-wrap ${i < CONFIG_FIELDS.length - 1 ? "border-b border-gray-800" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{field.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{field.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm w-4 text-right">{field.prefix}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={values[field.key] ?? ""}
                    onChange={(e) => { setValues((prev) => ({ ...prev, [field.key]: e.target.value })); setSuccessMsg(null); }}
                    className={`w-24 bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm text-right focus:outline-none transition ${String(values[field.key] ?? "") !== String(original[field.key] ?? "") ? "border-yellow-400" : "border-gray-700 focus:border-yellow-400"}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4 text-sm text-gray-300 leading-7">
            <p className="text-yellow-400 font-medium mb-1">Current pricing summary</p>
            Under 0.7km — Day: ₵{values["flat_rate_short"] || "—"} / Night: ₵{values["flat_rate_short_night"] || "—"}<br />
            0.7km–4km — ₵{values["base_fare"] || "—"} base + ₵{values["per_km_rate"] || "—"}/km<br />
            Over 4km — Day: ₵{values["flat_rate_long_day"] || "—"} / Night: ₵{values["flat_rate_long_night"] || "—"}<br />
            Commission: {values["commission_rate"] || "—"}% · Lockout at: ₵{values["lockout_threshold"] || "—"} outstanding
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setValues(original); setSuccessMsg(null); }}
              disabled={!hasChanges() || saving}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg disabled:opacity-40 transition"
            >
              Discard changes
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges() || saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 disabled:opacity-40 transition"
            >
              <Save size={14} /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}