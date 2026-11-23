import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  UserPlus,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import logoImage from "../../../assets/images/backgroundwithout.png";
import { createUser } from "../../../services/api";
import LogoutButton from "../../auth/components/LogoutButton";
import subscriptionDurations from "../members/subscriptionDurations";
import MembersPage from "./MembersPage";

type NewUserForm = {
  name: string;
  phone: string;
  password: string;
  subscriptionDays: string;
  price: string;
};

const emptyForm: NewUserForm = {
  name: "",
  phone: "",
  password: "",
  subscriptionDays: "",
  price: "",
};

function AdminPage() {
  const [form, setForm] = useState<NewUserForm>(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [isDefaultPasswordVisible, setIsDefaultPasswordVisible] =
    useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [membersRefreshVersion, setMembersRefreshVersion] = useState(0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const normalizedForm = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      password: form.password,
    };

    if (!normalizedForm.name) {
      setFormError("Enter the user's name.");
      return;
    }

    if (!/^01[0125]\d{8}$/.test(normalizedForm.phone)) {
      setFormError("Enter a valid Egyptian mobile number.");
      return;
    }

    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(normalizedForm.password)) {
      setFormError(
        "Password must be at least 8 characters and include an uppercase letter and a number.",
      );
      return;
    }

    const subscriptionDays = Number(form.subscriptionDays);
    if (
      !subscriptionDurations.some(
        (duration) => duration.days === subscriptionDays,
      )
    ) {
      setFormError("Select a subscription duration.");
      return;
    }

    const price = Number(form.price);
    if (
      form.price.trim() === "" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(price * 100)
    ) {
      setFormError("Enter a valid subscription price in EGP.");
      return;
    }

    setIsCreating(true);
    createUser({ ...normalizedForm, subscriptionDays, price })
      .then((createdUser) => {
        setForm(emptyForm);
        setSuccessMessage(
          `${createdUser.name} was added with a ${subscriptionDays / 30}-month (${subscriptionDays}-day) subscription.`,
        );
        setMembersRefreshVersion((version) => version + 1);
      })
      .catch((error: unknown) => {
        setFormError(
          error instanceof Error ? error.message : "Could not add user.",
        );
      })
      .finally(() => setIsCreating(false));
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-8 text-paper sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-9 flex flex-col justify-between gap-4 border-b border-white/10 pb-7 sm:mb-12 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <img
              src={logoImage}
              alt="i GYM logo"
              className="h-20 w-20 shrink-0 object-contain sm:h-28 sm:w-28"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime">
                i GYM · Management
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:mt-3 sm:text-4xl">
                Admin dashboard
              </h1>
              <p className="mt-2 hidden text-sm text-muted sm:block">
                Manage member accounts and add new users.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Link
              to="/admin/scan"
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium hover:border-lime hover:text-lime"
            >
              <Camera size={17} />
              Scan member QR
            </Link>
            <LogoutButton />
          </div>
        </header>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <MembersPage key={membersRefreshVersion} />

          <section className="h-fit min-w-0 rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-7">
            <div className="flex items-center gap-2 text-lime">
              <UserPlus size={19} />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                New Member
              </p>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Add a Member</h2>
            <p className="mt-2 text-sm text-muted">
              Create a member account with a temporary password.
            </p>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="user-name" className="mb-2 block text-sm">
                  User name
                </label>
                <input
                  id="user-name"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Enter full name"
                  className="w-full rounded-lg border border-line bg-ink px-4 py-3 outline-none transition-colors focus:border-lime"
                />
              </div>

              <div>
                <label htmlFor="user-phone" className="mb-2 block text-sm">
                  Phone number
                </label>
                <input
                  id="user-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-lg border border-line bg-ink px-4 py-3 outline-none transition-colors focus:border-lime"
                />
              </div>

              <div>
                <label
                  htmlFor="subscription-days"
                  className="mb-2 block text-sm"
                >
                  Subscription duration
                </label>
                <select
                  id="subscription-days"
                  required
                  value={form.subscriptionDays}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      subscriptionDays: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-line bg-ink px-4 py-3 outline-none transition-colors focus:border-lime"
                >
                  <option value="">Select a duration</option>
                  {subscriptionDurations.map((duration) => (
                    <option key={duration.days} value={duration.days}>
                      {duration.months}{" "}
                      {duration.months === 1 ? "month" : "months"} (
                      {duration.days} days)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="subscription-price"
                  className="mb-2 block text-sm"
                >
                  Subscription price (EGP)
                </label>
                <input
                  id="subscription-price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  placeholder="Enter price"
                  className="w-full rounded-lg border border-line bg-ink px-4 py-3 outline-none transition-colors focus:border-lime"
                />
              </div>

              <div>
                <label
                  htmlFor="user-password"
                  className="mb-2 flex items-center gap-2 text-sm"
                >
                  <KeyRound size={15} />
                  Default password
                </label>
                <div className="relative">
                  <input
                    id="user-password"
                    type={isDefaultPasswordVisible ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="At least 8 characters"
                    className="w-full rounded-lg border border-line bg-ink px-4 py-3 pr-12 outline-none transition-colors focus:border-lime"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setIsDefaultPasswordVisible((visible) => !visible)
                    }
                    aria-label={
                      isDefaultPasswordVisible
                        ? "Hide default password"
                        : "Show default password"
                    }
                    aria-pressed={isDefaultPasswordVisible}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-muted transition-colors hover:text-lime"
                  >
                    {isDefaultPasswordVisible ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Include at least one uppercase letter and one number.
                </p>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="flex items-center gap-2 text-sm text-red-300"
                >
                  <AlertCircle size={17} className="shrink-0" />
                  {formError}
                </p>
              )}
              {successMessage && (
                <p
                  role="status"
                  className="flex items-center gap-2 text-sm text-lime"
                >
                  <CheckCircle2 size={17} className="shrink-0" />
                  {successMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isCreating}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-lime px-4 py-3 font-semibold text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    Adding user...
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Add user
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

export default AdminPage;
