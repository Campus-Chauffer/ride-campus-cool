import { useState, useEffect } from "react";
import { RefreshCw, Clock, MapPin, TrendingUp, AlertCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import api from "../../api";

const COLORS = ["#FBBF24", "#34D399", "#F87171", "#60A5FA", "#A78BFA"];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  const ampm = i < 12 ? "AM" : "PM";
  return `${h}${ampm}`;
});

function StatCard({ icon, label, value, sub, color }) {
  const colors = {
    yellow: "bg-yellow-400/10 text-yellow-400",
    green: "bg-green-400/10 text-green-400",
    blue: "bg-blue-400/10 text-blue-400",
    purple: "bg-purple-400/10 text-purple-400",
    red: "bg-red-400/10 text-red-400",
  };
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]} mb-3`}>
        {icon}
      </div>
      <p className="text-white text-2xl font-bold">{value ?? "—"}</p>
      <p className="text-gray-400 text-sm mt-0.5">{label}</p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchAnalytics(); }, []);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/admin/analytics");
      setData(res.data);
    } catch (err) {
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  }

  function round(val, decimals = 1) {
    if (!val) return "—";
    return parseFloat(val).toFixed(decimals);
  }

  // Fill in missing hours with 0
  function fillHours(rows) {
    const map = {};
    rows.forEach((r) => { map[parseInt(r.hour)] = r; });
    return Array.from({ length: 24 }, (_, i) => ({
      hour: HOURS[i],
      trip_count: parseInt(map[i]?.trip_count || 0),
      count: parseInt(map[i]?.count || 0),
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
        {error}
      </div>
    );
  }

  const peakHoursFilled = fillHours(data?.peak_hours || []);
  const noDriverFilled = fillHours(data?.no_driver_by_hour || []);

  const distanceBuckets = (data?.distance_buckets || []).map((b) => ({
    name: b.bucket,
    count: parseInt(b.count),
    avg_fare: parseFloat(b.avg_fare || 0).toFixed(2),
  }));

  const peakDays = (data?.peak_days || []).map((d) => ({
    name: d.day_name.trim(),
    trips: parseInt(d.trip_count),
  }));

  const cancellationData = (data?.cancellations || []).map((c) => ({
    name: c.cancelled_by || "Unknown",
    value: parseInt(c.count),
  }));

  // Top 10 pickup hotspots
  const topPickups = (data?.pickup_heatmap || []).slice(0, 10).map((p, i) => ({
    name: `Spot ${i + 1}`,
    count: parseInt(p.count),
    lat: parseFloat(p.lat).toFixed(3),
    lng: parseFloat(p.lng).toFixed(3),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-xl font-semibold">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">
            Ride patterns, timing, and location data for planning
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm transition"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Timing averages */}
      <div>
        <h2 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
          <Clock size={15} className="text-yellow-400" /> Average Timings
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Clock size={18} />}
            label="Matching time"
            value={`${round(data?.timings?.avg_matching_minutes)}m`}
            sub="Request → driver found"
            color="yellow"
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Wait time"
            value={`${round(data?.timings?.avg_wait_minutes)}m`}
            sub="Accepted → driver arrived"
            color="green"
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Transit time"
            value={`${round(data?.timings?.avg_transit_minutes)}m`}
            sub="Started → completed"
            color="blue"
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Total trip time"
            value={`${round(data?.timings?.avg_total_minutes)}m`}
            sub="Request → completed"
            color="purple"
          />
        </div>
      </div>

      {/* Distance & fare averages */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<MapPin size={18} />}
          label="Avg distance"
          value={`${round(data?.timings?.avg_distance_km)}km`}
          color="green"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Avg fare"
          value={`₵${round(data?.timings?.avg_fare)}`}
          color="yellow"
        />
        <StatCard
          icon={<AlertCircle size={18} />}
          label="No driver found"
          value={data?.no_driver_by_hour?.reduce((s, r) => s + parseInt(r.count), 0) || 0}
          sub="Total unmatched trips"
          color="red"
        />
        <StatCard
          icon={<AlertCircle size={18} />}
          label="Cancellations"
          value={data?.cancellations?.reduce((s, r) => s + parseInt(r.count), 0) || 0}
          sub="Total cancelled trips"
          color="red"
        />
      </div>

      {/* Peak hours chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-medium text-sm mb-4">
          Trip Volume by Hour of Day
        </h2>
        {peakHoursFilled.some((h) => h.trip_count > 0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={peakHoursFilled}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="hour" stroke="#6b7280" tick={{ fontSize: 10 }} interval={1} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#FBBF24" }}
              />
              <Bar dataKey="trip_count" fill="#FBBF24" radius={[4, 4, 0, 0]} name="Trips" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
            No data yet — peaks will appear as trips are completed
          </div>
        )}
      </div>

      {/* Peak days + No driver by hour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-medium text-sm mb-4">Trips by Day of Week</h2>
          {peakDays.some((d) => d.trips > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peakDays}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#60A5FA" }}
                />
                <Bar dataKey="trips" fill="#60A5FA" radius={[4, 4, 0, 0]} name="Trips" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-500 text-sm">No data yet</div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-medium text-sm mb-4">
            No Driver Found — by Hour
          </h2>
          {noDriverFilled.some((h) => h.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={noDriverFilled}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="hour" stroke="#6b7280" tick={{ fontSize: 10 }} interval={1} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#F87171" }}
                />
                <Bar dataKey="count" fill="#F87171" radius={[4, 4, 0, 0]} name="Unmatched" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-500 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Distance buckets + Cancellations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-medium text-sm mb-4">Trip Distance Distribution</h2>
          {distanceBuckets.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={distanceBuckets}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {distanceBuckets.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(val, name, props) => [`${val} trips (avg ₵${props.payload.avg_fare})`, props.payload.name]}
                />
                <Legend formatter={(v) => <span style={{ color: "#9ca3af" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-500 text-sm">No data yet</div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-medium text-sm mb-4">Cancellation Breakdown</h2>
          {cancellationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={cancellationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {cancellationData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend formatter={(v) => <span style={{ color: "#9ca3af" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-500 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Top pickup hotspots table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-medium text-sm flex items-center gap-2">
            <MapPin size={14} className="text-yellow-400" />
            Top Pickup Hotspots
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Most requested pickup locations — use these for heatmap and driver positioning
          </p>
        </div>
        {topPickups.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-12">No location data yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs">
                <th className="text-left px-5 py-3 font-medium">Rank</th>
                <th className="text-left px-5 py-3 font-medium">Coordinates</th>
                <th className="text-left px-5 py-3 font-medium">Trip requests</th>
              </tr>
            </thead>
            <tbody>
              {topPickups.map((spot, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition ${i === topPickups.length - 1 ? "border-none" : ""}`}
                >
                  <td className="px-5 py-3">
                    <span className="text-yellow-400 font-semibold">#{i + 1}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">
                    {spot.lat}, {spot.lng}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 bg-yellow-400 rounded-full"
                        style={{ width: `${Math.min((spot.count / topPickups[0].count) * 100, 100)}%`, minWidth: 4, maxWidth: 120 }}
                      />
                      <span className="text-white font-medium">{spot.count}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}