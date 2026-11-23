import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Navigate } from "react-router-dom";
import MemberNavbar from "../components/MemberNavbar";
import MembershipCard from "../components/MembershipCard";
import { useAuth } from "../../auth/context/AuthContext";
import {
  changePassword,
  getCurrentSubscription,
  type CurrentSubscription,
} from "../../../services/api";

type PasswordFields = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type PasswordFieldName = keyof PasswordFields;
type PasswordErrors = Partial<Record<PasswordFieldName, string>>;

const emptyPasswordFields: PasswordFields = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function ProfilePage() {
  const { user, isAuthenticated, isLoading, authError } = useAuth();
  const [subscription, setSubscription] =
    useState<CurrentSubscription | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [passwordFields, setPasswordFields] =
    useState<PasswordFields>(emptyPasswordFields);
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    let isCurrentRequest = true;
    getCurrentSubscription()
      .then((currentSubscription) => {
        if (isCurrentRequest) {
          setSubscription(currentSubscription);
          setSubscriptionError("");
        }
      })
      .catch((error: unknown) => {
        if (isCurrentRequest) {
          setSubscriptionError(
            error instanceof Error
              ? error.message
              : "Could not load your subscription.",
          );
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsSubscriptionLoading(false);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [isLoading, user]);

  function handlePasswordChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const { name, value } = event.target;
    if (
      name !== "currentPassword" &&
      name !== "newPassword" &&
      name !== "confirmPassword"
    ) {
      return;
    }

    setPasswordFields((current) => ({ ...current, [name]: value }));
    setPasswordErrors((current) => ({ ...current, [name]: "" }));
    setPasswordError("");
    setPasswordMessage("");
  }

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const nextErrors: PasswordErrors = {};

    if (!passwordFields.currentPassword) {
      nextErrors.currentPassword = "Enter your current password.";
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(passwordFields.newPassword)) {
      nextErrors.newPassword =
        "Use at least 8 characters, including an uppercase letter and a number.";
    }
    if (!passwordFields.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your new password.";
    } else if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      nextErrors.confirmPassword = "The passwords do not match.";
    }

    setPasswordErrors(nextErrors);
    setPasswordError("");
    setPasswordMessage("");
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await changePassword(passwordFields);
      setPasswordFields(emptyPasswordFields);
      setPasswordErrors({});
      setPasswordMessage(result.message);
    } catch (error: unknown) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Could not change your password.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading || (isAuthenticated && user && isSubscriptionLoading)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-paper">
        <p role="status" className="text-muted">
          Loading your profile...
        </p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-paper">
        <p role="alert" className="text-red-300">
          Unable to load your account: {authError}
        </p>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: "/profile" } }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-6 text-paper sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <MemberNavbar />

        <header className="mb-8 mt-10 sm:mt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">
            Account
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            My profile
          </h1>
          <p className="mt-2 text-sm text-muted">
            View your account and membership details.
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-panel/70 p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Personal information</h2>
            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Full name
                </dt>
                <dd className="mt-1 text-paper">{user.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Phone number
                </dt>
                <dd className="mt-1 text-paper">{user.phone}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">
                  Account role
                </dt>
                <dd className="mt-1 capitalize text-paper">{user.role}</dd>
              </div>
            </dl>
          </section>

          {subscriptionError ? (
            <section
              role="alert"
              className="rounded-2xl border border-red-400/20 bg-panel p-6 text-red-300 sm:p-8"
            >
              Unable to load your membership: {subscriptionError}
            </section>
          ) : subscription ? (
            <MembershipCard
              status={subscription.status}
              remainingDays={subscription.remainingDays}
              startDate={subscription.startDate}
              endDate={subscription.endDate}
              durationDays={subscription.durationDays}
            />
          ) : (
            <section
              role="alert"
              className="rounded-2xl border border-white/10 bg-panel p-6 text-muted sm:p-8"
            >
              Subscription data was not returned by the server.
            </section>
          )}
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-panel/70 p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Change password</h2>
          <p className="mt-2 text-sm text-muted">
            Choose a password with at least 8 characters, an uppercase letter,
            and a number.
          </p>

          <form
            className="mt-6 grid gap-5 sm:grid-cols-2"
            onSubmit={handlePasswordSubmit}
            noValidate
          >
            {(
              [
                ["currentPassword", "Current password", "current-password"],
                ["newPassword", "New password", "new-password"],
                ["confirmPassword", "Confirm new password", "new-password"],
              ] as const
            ).map(([name, label, autoComplete]) => (
              <div key={name}>
                <label
                  htmlFor={name}
                  className="mb-2 block text-sm text-paper"
                >
                  {label}
                </label>
                <input
                  id={name}
                  type="password"
                  name={name}
                  autoComplete={autoComplete}
                  required
                  value={passwordFields[name]}
                  onChange={handlePasswordChange}
                  aria-invalid={Boolean(passwordErrors[name])}
                  aria-describedby={
                    passwordErrors[name] ? `${name}-error` : undefined
                  }
                  className="w-full rounded-lg border border-line bg-ink px-4 py-3 text-paper outline-none transition-colors focus:border-lime"
                />
                {passwordErrors[name] && (
                  <p
                    id={`${name}-error`}
                    className="mt-2 text-sm text-red-300"
                  >
                    {passwordErrors[name]}
                  </p>
                )}
              </div>
            ))}

            {passwordError && (
              <p
                role="alert"
                className="text-sm text-red-300 sm:col-span-2"
              >
                {passwordError}
              </p>
            )}
            {passwordMessage && (
              <p
                role="status"
                className="text-sm text-lime sm:col-span-2"
              >
                {passwordMessage}
              </p>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="rounded-lg bg-lime px-5 py-3 font-semibold text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChangingPassword ? "Updating password..." : "Update password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;
