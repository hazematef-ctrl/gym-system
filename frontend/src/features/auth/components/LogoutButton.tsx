import { LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setError("");
    setIsLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Could not log out. Please try again.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        aria-label="Sign out"
        className="flex items-center gap-2 rounded-full border border-white/10 bg-panel px-4 py-3 text-sm text-paper transition-colors hover:border-lime/40 hover:text-lime disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut size={18} />
        <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
      </button>
      {error && (
        <p role="alert" className="max-w-52 text-right text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

export default LogoutButton;
