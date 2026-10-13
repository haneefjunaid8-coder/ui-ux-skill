import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useRootX, currentUser } from './engine/store';
import Login from './pages/auth/Login';
import GuestTrack from './pages/guest/GuestTrack';
import Shell from './pages/shell/Shell';
import AdminShell from './pages/admin/AdminShell';

import CustomerHome from './pages/customer/Home';
import CreateDelivery from './pages/customer/Create';
import Deliveries from './pages/customer/Deliveries';
import DeliveryDetail from './pages/customer/DeliveryDetail';
import Wallet from './pages/customer/Wallet';
import Profile from './pages/customer/Profile';
import Support from './pages/customer/Support';
import Notifications from './pages/customer/Notifications';
import RiderDashboard from './pages/rider/Dashboard';
import RiderApply from './pages/rider/Apply';
import RiderActive from './pages/rider/ActiveDelivery';
import RiderEarnings from './pages/rider/Earnings';
import RiderPerformance from './pages/rider/Performance';
import AdminOverview from './pages/admin/Overview';
import AdminApplications from './pages/admin/Applications';
import AdminDeliveries from './pages/admin/Deliveries';
import AdminZones from './pages/admin/Zones';
import AdminPricing from './pages/admin/Pricing';
import AdminFinance from './pages/admin/Finance';
import AdminCases from './pages/admin/Cases';
import AdminAudit from './pages/admin/Audit';

function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const state = useRootX();
  const loc = useLocation();
  const user = currentUser(state);
  if (state.session.mfaFor) return <Navigate to="/login" replace />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoleRedirect() {
  const state = useRootX();
  const user = currentUser(state);
  if (state.session.mfaFor) return <Navigate to="/login" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin' || user.role === 'finance') return <Navigate to="/admin" replace />;
  if (user.role === 'rider') return <Navigate to="/rider" replace />;
  return <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/track/:token" element={<GuestTrack />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* customer + rider mobile-first shell */}
      <Route
        path="/"
        element={
          <RequireRole roles={['customer', 'rider']}>
            <Shell />
          </RequireRole>
        }
      >
        <Route path="home" element={<CustomerHome />} />
        <Route path="new" element={<CreateDelivery />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="deliveries/:id" element={<DeliveryDetail />} />
        <Route path="wallet" element={<Wallet />} />
        <Route path="profile" element={<Profile />} />
        <Route path="support" element={<Support />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="rider" element={<RiderDashboard />} />
        <Route path="rider/apply" element={<RiderApply />} />
        <Route path="rider/delivery/:id" element={<RiderActive />} />
        <Route path="rider/earnings" element={<RiderEarnings />} />
        <Route path="rider/performance" element={<RiderPerformance />} />
      </Route>

      {/* admin desktop shell */}
      <Route
        path="/admin"
        element={
          <RequireRole roles={['admin', 'finance']}>
            <AdminShell />
          </RequireRole>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="applications" element={<AdminApplications />} />
        <Route path="deliveries" element={<AdminDeliveries />} />
        <Route path="zones" element={<AdminZones />} />
        <Route path="pricing" element={<AdminPricing />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="cases" element={<AdminCases />} />
        <Route path="audit" element={<AdminAudit />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
