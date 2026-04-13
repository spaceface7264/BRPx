import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.tsx";
import { useTenant } from "./context/TenantContext.tsx";
import { DashboardLayout } from "./layouts/DashboardLayout.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { Login } from "./pages/Login.tsx";
import { Onboarding } from "./pages/Onboarding.tsx";
import { Register } from "./pages/Register.tsx";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { token, isReady } = useAuth();
  if (!isReady) {
    return <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-500">Indlæser…</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function DashboardGate({ children }: { children: ReactElement }) {
  const { tenant } = useTenant();
  const { isReady, token } = useAuth();
  if (!isReady || !token) return children;
  if (!tenant) {
    return <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-500">Indlæser…</div>;
  }
  if (tenant.onboardingStep < 5) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function HomeRedirect() {
  const { token, isReady } = useAuth();
  if (!isReady) {
    return <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-500">Indlæser…</div>;
  }
  if (!token) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <DashboardGate>
              <DashboardLayout />
            </DashboardGate>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
