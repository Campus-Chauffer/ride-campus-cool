import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Drivers from "./pages/drivers/Drivers";
import Users from "./pages/users/Users";
import Trips from "./pages/trips/Trips";
import Wallet from "./pages/wallet/Wallet";
import Reports from "./pages/reports/Reports";
import Config from "./pages/config/Config";
import Analytics from "./pages/analytics/Analytics";
import Announcements from "./pages/announcements/Announcements";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("adminToken");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="drivers" element={<Drivers />} />
                  <Route path="users" element={<Users />} />
                  <Route path="trips" element={<Trips />} />
                  <Route path="wallet" element={<Wallet />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="config" element={<Config />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="announcements" element={<Announcements />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}