import { useState, useEffect } from 'react';
import { Star, Flag } from 'lucide-react';
import api from '../api';

const STATUS_STYLES = {
  completed: 'bg-green-500/10 text-green-400',
  cancelled: 'bg-red-500/10 text-red-400',
  in_progress: 'bg-blue-500/10 text-blue-400',
  arrived: 'bg-purple-500/10 text-purple-400',
  offered: 'bg-yellow-500/10 text-yellow-400',
  accepted: 'bg-yellow-500/10 text-yellow-400',
  requested: 'bg-gray-500/10 text-gray-300',
  no_driver_found: 'bg-orange-500/10 text-orange-400',
};

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Shared ride-history + ratings + complaints view, used from both the
// Drivers and Users admin detail panels. userId is a users.id — the
// backend figures out whether to join through drivers or passenger_id
// based on that user's role.
export default function RideHistoryPanel({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    fetchHistory();
  }, [userId]);

  async function fetchHistory() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/admin/users/${userId}/rides`);
      setData(res.data);
    } catch (err) {
      setError('Failed to load ride history.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-center text-gray-500 text-sm py-6">Loading ride history…</div>;
  if (error) return <div className="text-center text-red-400 text-sm py-6">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Total rides" value={data.total_trips} />
        <MiniStat label="Completed" value={data.completed_trips} />
        <MiniStat label="Avg rating" value={data.average_rating ? `${data.average_rating} ★` : '—'} />
      </div>

      {/* Ride history */}
      <div>
        <p className="text-gray-500 text-xs font-medium mb-2">Ride history ({data.trips.length})</p>
        {data.trips.length === 0 ? (
          <p className="text-gray-600 text-sm">No rides yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {data.trips.map((t) => (
              <div key={t.id} className="bg-gray-800/40 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-start mb-1 gap-2">
                  <p className="text-white font-medium truncate">
                    {t.other_party_first_name || 'Unknown'} {t.other_party_last_name || ''}
                  </p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[t.status] || 'bg-gray-500/10 text-gray-400'}`}>
                    {t.status}
                  </span>
                </div>
                {(t.pickup_address || t.dropoff_address) && (
                  <p className="text-gray-500 text-xs mb-1 truncate">
                    {t.pickup_address} → {t.dropoff_address}
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">{formatDate(t.created_at)}</span>
                  <div className="flex items-center gap-2">
                    {t.fare != null && (
                      <span className="text-white text-xs font-medium">₵{parseFloat(t.fare).toFixed(2)}</span>
                    )}
                    {t.rating_received != null && (
                      <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
                        <Star size={11} fill="currentColor" /> {t.rating_received}
                      </span>
                    )}
                  </div>
                </div>
                {t.feedback_received && (
                  <p className="text-gray-400 text-xs italic mt-1.5">“{t.feedback_received}”</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complaints */}
      {data.reports.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs font-medium mb-2 flex items-center gap-1.5">
            <Flag size={12} className="text-red-400" /> Complaints ({data.reports.length})
          </p>
          <div className="space-y-2">
            {data.reports.map((r) => (
              <div key={r.id} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-red-400 text-xs font-medium uppercase">{r.type}</span>
                  <span className="text-gray-500 text-xs">{formatDate(r.created_at)}</span>
                </div>
                <p className="text-gray-300 text-xs mb-1.5">{r.description}</p>
                <p className="text-gray-500 text-xs">
                  Reported by {r.reporter_first_name} {r.reporter_last_name}
                  {r.pickup_address && ` · ${r.pickup_address} → ${r.dropoff_address}`}
                </p>
                <span
                  className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full ${
                    r.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-gray-500/10 text-gray-400'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-gray-800/40 rounded-lg p-3 text-center">
      <p className="text-white text-lg font-bold">{value ?? '—'}</p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}
