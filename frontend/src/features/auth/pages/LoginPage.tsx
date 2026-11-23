import logoImage from "../../../assets/images/logo.jpeg";
import backgroundImage from "../../../assets/images/background.jpeg";
import { motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type LoginFields = {
  phone: string;
  password: string;
};

type LoginErrors = Partial<Record<keyof LoginFields, string>>;

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState<LoginFields>({
    phone: "",
    password: "",
  });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    const hasFieldErrors = Object.values(errors).some(Boolean);
    if (!hasFieldErrors && !error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setErrors({});
      setError("");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [errors, error]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    if (name !== "phone" && name !== "password") {
      return;
    }

    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: "" }));
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {};
    if (!/^(?:\+20|0020|0)1[0125]\d{8}$/.test(form.phone.trim())) {
      nextErrors.phone =
        "Enter a valid Egyptian mobile number .";
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      nextErrors.password =
        "invalid password.";
    }

    setErrors(nextErrors);
    setError(
      Object.keys(nextErrors).length > 0
        ? "Please correct the highlighted fields."
        : "",
    );
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login({
        phone: form.phone.trim().replace(/^(?:\+20|0020)/, "0"),
        password: form.password,
      });

      const returnTo = (
        location.state as
          | { from?: { pathname?: string; search?: string; hash?: string } }
          | null
      )?.from;
      const isInternalPath =
        typeof returnTo?.pathname === "string" &&
        returnTo.pathname.startsWith("/") &&
        !returnTo.pathname.startsWith("//");
      const destination = isInternalPath
        ? {
            pathname: returnTo.pathname,
            search: returnTo.search ?? "",
            hash: returnTo.hash ?? "",
          }
        : user.role === "admin"
          ? "/admin"
          : "/home";

      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Could not sign in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#1C1D24] px-4 py-8 text-paper sm:px-6">
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover blur-sm sm:blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="w-full max-w-md p-8  rounded-2xl"
      >
        <div className="w-full max-w-md p-8 bg-ink rounded-2xl border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <img
            src={logoImage}
            alt="i GYM logo"
            className="mb-6 h-40 w-full object-contain"
          />

          <h1 className="text-4xl font-bold tracking-tight">
            i GYM<span className="text-lime">.</span>
          </h1>

          <p className="mt-3 text-muted">Welcome back. You are at home.</p>

          <form className="mt-10 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="block text-sm mb-2">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                placeholder="Enter your phone"
                className="w-full bg-panel border border-line rounded-lg px-4 py-3 outline-none focus:border-lime transition-colors"
              />
              {errors.phone && (
                <p id="phone-error" className="mt-2 text-sm text-red-400">
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm mb-2">Password</label>
              <div className="relative">
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  placeholder="Enter your password"
                  className="w-full bg-panel border border-line rounded-lg px-4 py-3 pr-12 outline-none focus:border-lime transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  aria-pressed={isPasswordVisible}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-muted transition-colors hover:text-lime"
                >
                  {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-2 text-sm text-red-400">
                  {errors.password}
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-lime text-ink font-semibold py-3 rounded-lg hover:bg-paper transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </motion.div>
    </main>
  );
}

export default LoginPage;
