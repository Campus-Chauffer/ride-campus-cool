import { useState, useEffect } from 'react';
import { Sun, CheckCircle, XCircle, AlertCircle, Wallet, RefreshCw } from 'lucide-react';
import api from '../api';

// Always shows the current calendar day's numbers, independent of whatever
// historical period filter the rest of the dashboard has selected — this is
// deliberately a fixed "right now, today" marker for a quick daily check-in.
export default function TodayStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchToday();
    const interval = setInterval(fetchToday, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchToday() {
    try {
      const res = await api.get('/admin/stats/today');
      setData(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load today’s stats.');
    } finally {
      setLoading(false);
    }
  }

  const todayLabel = new Date().toLocaleDateString('en-GH', {
    weekday: 'long', day: '2-digit', month: 'short',
  });

  return (
    <div className="bg-gray-900 rounded-2xl border border-yellow-400/20 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-yellow-400/5">
        <div className="flex items-center gap-2">
          <Sun size={16} className="text-yellow-400" />
          <h3 className="text-white font-semibold">Today</h3>
          <span className="text-gray-500 text-xs">{todayLabel}</span>
        </div>
        <button onClick={fetchToday} className="text-gray-500 hover:text-white transition">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-6">Loading today’s stats…</div>
        ) : error ? (
          <div className="text-center text-red-400 text-sm py-6">{error}</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <TodayCard
                icon={<CheckCircle size={16} />}
                label="Completed"
                value={data?.rides?.completed ?? 0}
                color="green"
              />
              <TodayCard
                icon={<XCircle size={16} />}
                label="Cancelled"
                value={data?.rides?.cancelled ?? 0}
                color="red"
              />
              <TodayCard
                icon={<AlertCircle size={16} />}
                label="No Driver Found"
                value={data?.rides?.no_driver_found ?? 0}
                color="orange"
              />
              <TodayCard
                icon={<Wallet size={16} />}
                label="Revenue"
                value={`₵${parseFloat(data?.revenue || 0).toFixed(2)}`}
                sub={`₵${parseFloat(data?.commission || 0).toFixed(2)} commission`}
                color="yellow"
              />
              <TodayCard
                icon={<Sun size={16} />}
                label="Drivers Online"
                value={data?.drivers_online_today ?? 0}
                sub="went online today"
                color="blue"
              />
            </div>

            <div>
              <p className="text-gray-500 text-xs font-medium mb-2">
                Driver activity today ({data?.driver_activity?.length || 0})
              </p>
              {!data?.driver_activity?.length ? (
                <p className="text-gray-600 text-sm">No drivers have gone online yet today.</p>
              ) : (
                <div className="bg-gray-800/40 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  {data.driver_activity.map((d, i) => (
                    <div
                      key={d.driver_id}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                        i < data.driver_activity.length - 1 ? 'border-b border-gray-800' : ''
                      }`}
                    >
                      <div>
                        <p className="text-white font-medium">{d.first_name} {d.last_name}</p>
                        <p className="text-gray-500 text-xs">{d.phone_number}</p>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">
                        {d.rides_completed_today} ride{d.rides_completed_today === 1 ? '' : 's'} completed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TodayCard({ icon, label, value, sub, color }) {
  const colors = {
    yellow: 'bg-yellow-400/10 text-yellow-400',
    green: 'bg-green-400/10 text-green-400',
    red: 'bg-red-400/10 text-red-400',
    orange: 'bg-orange-400/10 text-orange-400',
    blue: 'bg-blue-400/10 text-blue-400',
  };
  return (
    <div className="bg-gray-800/40 rounded-xl p-4">
      <div className={`inline-flex p-1.5 rounded-lg ${colors[color]} mb-2`}>
        {icon}
      </div>
      <p className="text-white text-xl font-bold tracking-tight">{value}</p>
      <p className="text-gray-400 text-xs mt-0.5">{label}</p>
      {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}
