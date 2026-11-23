
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../features/auth/pages/LoginPage";
import MemberHomePage from "../features/members/pages/MemberHomePage";
import ProfilePage from "../features/members/pages/ProfilePage";
import AdminPage from "../features/admin/pages/AdminPage";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../features/auth/context/AuthContext";

function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === "admin" ? "/admin" : "/home"} replace />;
}

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-paper">
      <section
        role="alert"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-panel p-8 text-center"
      >
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-3 text-muted">
          The page you requested does not exist.
        </p>
        <p className="mt-2 text-sm text-muted">Error 404 · Not Found</p>
      </section>
    </main>
  );
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute allowedRoles={["member"]} />}>
          <Route path="/home" element={<MemberHomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route index element={<DashboardRedirect />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
