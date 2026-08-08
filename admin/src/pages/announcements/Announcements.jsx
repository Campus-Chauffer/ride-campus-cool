import { useState, useEffect } from "react";
import { Megaphone, Send, RefreshCw, Users, Car, Globe } from "lucide-react";
import api from "../../api";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "Everyone", icon: Globe },
  { value: "passenger", label: "Students", icon: Users },
  { value: "driver", label: "Drivers", icon: Car },
];

const AUDIENCE_STYLES = {
  all: "bg-yellow-500/10 text-yellow-400",
  passenger: "bg-purple-500/10 text-purple-400",
  driver: "bg-blue-500/10 text-blue-400",
};

export default function Announcements() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      setLoading(true);
      const res = await api.get("/admin/announcements");
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError("Failed to load announcement history.");
    } finally {
      setLoading(false);
    }
  }

  async function sendAnnouncement(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      const res = await api.post("/admin/announcements", { title, body, audience });
      setSuccess(`Sent to ${res.data.sent} of ${res.data.recipients} recipients.`);
      setTitle("");
      setBody("");
      setAudience("all");
      setHistory((prev) => [res.data.announcement, ...prev]);
    } catch (err) {
      setError("Failed to send announcement.");
    } finally {
      setSending(false);
    }
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleString("en-GH", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-white text-xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-gray-500 text-sm mt-1">
          Send push notifications and in-app announcements to students and drivers
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {/* Compose */}
      <form
        onSubmit={sendAnnouncement}
        className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4"
      >
        <div>
          <label className="text-gray-400 text-xs font-medium mb-1.5 block">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Scheduled maintenance tonight"
            maxLength={200}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 transition"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs font-medium mb-1.5 block">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the announcement..."
            rows={3}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 transition resize-none"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs font-medium mb-1.5 block">Send to</label>
          <div className="flex gap-2 flex-wrap">
            {AUDIENCE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = audience === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAudience(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                    active
                      ? "bg-yellow-400/10 border-yellow-400/50 text-yellow-400"
                      : "bg-gray-950 border-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon size={14} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="submit"
          disabled={sending || !title.trim() || !body.trim()}
          className="flex items-center gap-2 bg-yellow-400 text-gray-900 font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={14} />
          {sending ? "Sending…" : "Send announcement"}
        </button>
      </form>

      {/* History */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-sm">History</h2>
          <button
            onClick={fetchHistory}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-xs transition"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-16">Loading…</div>
        ) : history.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-16 flex flex-col items-center gap-2">
            <Megaphone size={28} className="text-gray-700" />
            No announcements sent yet
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {history.map((a) => (
              <div key={a.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm">{a.title}</p>
                    <p className="text-gray-400 text-sm mt-0.5">{a.body}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${AUDIENCE_STYLES[a.audience]}`}
                  >
                    {a.audience === "all" ? "Everyone" : a.audience === "passenger" ? "Students" : "Drivers"}
                  </span>
                </div>
                <p className="text-gray-600 text-xs mt-2">
                  {formatDate(a.created_at)}
                  {a.first_name ? ` · by ${a.first_name} ${a.last_name || ""}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
