import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart,
  Pie, Cell, Legend
} from 'recharts';
import api from '../api';
import { Car, Users, MapPin, Wallet, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

const COLORS = ['#FBBF24', '#34D399', '#F87171', '#60A5FA'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadData(false);
  const interval = setInterval(() => loadData(true), 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setRefreshing(true);
    try {
      const [revenueRes, driversRes, usersRes, tripsRes] = await Promise.all([
        api.get('/admin/revenue'),
        api.get('/admin/drivers'),
        api.get('/admin/users'),
        api.get('/admin/trips'),
      ]);
      setRevenue(revenueRes.data);
      setDrivers(Array.isArray(driversRes.data) ? driversRes.data : []);

      const trips = Array.isArray(tripsRes.data) ? tripsRes.data : tripsRes.data?.trips || [];
      const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.users || [];
      const completed = trips.filter(t => t.status === 'completed');
      const cancelled = trips.filter(t => t.status === 'cancelled');
      const noDriver = trips.filter(t => t.status === 'no_driver_found');
      const onlineDrivers = driversRes.data.filter(d => d.is_online);
      const approvedDrivers = driversRes.data.filter(d => d.approval_status === 'approved');
      const pendingDrivers = driversRes.data.filter(d => d.approval_status === 'pending');

      setStats({
        totalUsers: users.length,
        totalDrivers: driversRes.data.length,
        approvedDrivers: approvedDrivers.length,
        pendingDrivers: pendingDrivers.length,
        onlineDrivers: onlineDrivers.length,
        totalTrips: trips.length,
        completedTrips: completed.length,
        cancelledTrips: cancelled.length,
        noDriverTrips: noDriver.length,
        totalRevenue: parseFloat(revenueRes.data.summary?.total_revenue) || 0,
        totalCommission: parseFloat(revenueRes.data.summary?.total_commission) || 0,
        outstandingCommission: parseFloat(revenueRes.data.wallet_summary?.total_outstanding) || 0,
        completionRate: trips.length > 0
          ? ((completed.length / trips.length) * 100).toFixed(1)
          : 0,
      });
    } catch (err) {
      console.log('Dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
      </div>
    );
  }

  const tripStatusData = [
    { name: 'Completed', value: stats?.completedTrips || 0 },
    { name: 'Cancelled', value: stats?.cancelledTrips || 0 },
    { name: 'No Driver', value: stats?.noDriverTrips || 0 },
  ];

  const driverStatusData = [
    { name: 'Online', value: stats?.onlineDrivers || 0 },
    { name: 'Approved', value: (stats?.approvedDrivers || 0) - (stats?.onlineDrivers || 0) },
    { name: 'Pending', value: stats?.pendingDrivers || 0 },
  ];

  return (
    <div className="space-y-6">
    <div className="flex justify-between items-center">
  <div>
    <h1 className="text-white text-xl font-semibold">Dashboard</h1>
    <p className="text-gray-400 text-sm mt-1">
      Live data · refreshes every 5 seconds {refreshing && <span className="text-yellow-400">· updating...</span>}
    </p>
  </div>
  <button
    onClick={() => loadData(false)}
    className="flex items-center gap-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm transition"
  >
    <RefreshCw size={14} /> Refresh now
  </button>
</div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users size={20} />}
          label="Total Users"
          value={stats?.totalUsers}
          color="blue"
        />
        <StatCard
          icon={<Car size={20} />}
          label="Online Drivers"
          value={`${stats?.onlineDrivers} / ${stats?.approvedDrivers}`}
          sub="online / approved"
          color="green"
          pulse
        />
        <StatCard
          icon={<MapPin size={20} />}
          label="Total Trips"
          value={stats?.totalTrips}
          sub={`${stats?.completionRate}% completion`}
          color="yellow"
        />
        <StatCard
          icon={<Wallet size={20} />}
          label="Total Revenue"
          value={`GH₵${parseFloat(stats?.totalRevenue || 0).toFixed(2)}`}
          sub={`GH₵${parseFloat(stats?.totalCommission || 0).toFixed(2)} commission`}
          color="purple"
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle size={20} />}
          label="Completed"
          value={stats?.completedTrips}
          color="green"
        />
        <StatCard
          icon={<XCircle size={20} />}
          label="Cancelled"
          value={stats?.cancelledTrips}
          color="red"
        />
        <StatCard
          icon={<AlertCircle size={20} />}
          label="No Driver Found"
          value={stats?.noDriverTrips}
          color="orange"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Outstanding"
          value={`GH₵${parseFloat(stats?.outstandingCommission || 0).toFixed(2)}`}
          sub="commission owed"
          color="red"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-white font-semibold mb-4">Daily Revenue</h3>
          {revenue?.daily?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue.daily}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#FBBF24' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FBBF24"
                  fill="url(#revenueGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-500">
              No revenue data yet
            </div>
          )}
        </div>

        {/* Trip status pie */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-white font-semibold mb-4">Trip Status Breakdown</h3>
          {stats?.totalTrips > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={tripStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {tripStatusData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend
                  formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-500">
              No trip data yet
            </div>
          )}
        </div>
      </div>

      {/* Driver status + daily trips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily trips bar chart */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-white font-semibold mb-4">Daily Trips</h3>
          {revenue?.daily?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  itemStyle={{ color: '#60A5FA' }}
                />
                <Bar dataKey="trips" fill="#60A5FA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-500">
              No trip data yet
            </div>
          )}
        </div>

        {/* Driver status */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-white font-semibold mb-4">Driver Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={driverStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {driverStatusData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend
                formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Online drivers list */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-white font-semibold mb-4">
          Currently Online Drivers
          <span className="ml-2 bg-green-400/10 text-green-400 text-xs px-2 py-0.5 rounded-full">
            {drivers.filter(d => d.is_online).length} online
          </span>
        </h3>
        {drivers.filter(d => d.is_online).length === 0 ? (
          <p className="text-gray-500 text-sm">No drivers currently online</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {drivers.filter(d => d.is_online).map(driver => (
              <div key={driver.id} className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-sm">
                    {driver.first_name?.[0]}{driver.last_name?.[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {driver.first_name} {driver.last_name}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {driver.vehicle_make} {driver.vehicle_model} · {driver.plate_number}
                  </p>
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, pulse }) {
  const colors = {
    blue: 'bg-blue-400/10 text-blue-400',
    green: 'bg-green-400/10 text-green-400',
    yellow: 'bg-yellow-400/10 text-yellow-400',
    purple: 'bg-purple-400/10 text-purple-400',
    red: 'bg-red-400/10 text-red-400',
    orange: 'bg-orange-400/10 text-orange-400',
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]} mb-3`}>
        {icon}
      </div>
      <div className="flex items-center gap-2">
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        {pulse && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
      </div>
      <p className="text-gray-400 text-sm mt-0.5">{label}</p>
      {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}