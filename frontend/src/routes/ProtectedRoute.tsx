import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/context/AuthContext";
import type { UserRole } from "../services/api";

type ProtectedRouteProps = {
  allowedRoles?: UserRole[];
};

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, authError } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-paper">
        <p role="status" className="text-muted">
          Checking your session...
        </p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-paper">
        <section
          role="alert"
          className="w-full max-w-md rounded-2xl border border-red-400/20 bg-panel p-8 text-center"
        >
          <h1 className="text-2xl font-semibold text-red-300">
            Unable to verify your session
          </h1>
          <p className="mt-3 text-muted">{authError}</p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin" : "/home"}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
