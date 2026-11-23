import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Phone,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import logoImage from "../../../assets/images/backgroundwithout.png";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  createUser,
  getUsers,
  renewSubscription,
  type AdminUser,
} from "../../../services/api";
import LogoutButton from "../../auth/components/LogoutButton";

type NewUserForm = {
  name: string;
  phone: string;
  password: string;
  subscriptionDays: string;
  price: string;
};

const subscriptionDurations = [
  { months: 1, days: 30 },
  { months: 2, days: 60 },
  { months: 3, days: 90 },
  { months: 4, days: 120 },
  { months: 5, days: 150 },
  { months: 6, days: 180 },
  { months: 12, days: 360 },
];

const emptyForm: NewUserForm = {
  name: "",
  phone: "",
  password: "",
  subscriptionDays: "",
  price: "",
};

function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const searchValueRef = useRef("");
  const allUsersRef = useRef<AdminUser[]>([]);
  const inFlightSearchRef = useRef("");
  const completedSearchRef = useRef("");
  const handledSearchSubmitRef = useRef(0);
  const [searchSubmitVersion, setSearchSubmitVersion] = useState(0);
  const [form, setForm] = useState<NewUserForm>(emptyForm);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDefaultPasswordVisible, setIsDefaultPasswordVisible] =
    useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [renewingUserId, setRenewingUserId] = useState<string | number | null>(
    null,
  );
  const [renewalDays, setRenewalDays] = useState("");
  const [renewalPrice, setRenewalPrice] = useState("");
  const [renewalError, setRenewalError] = useState("");
  const [renewalMessage, setRenewalMessage] = useState("");
  const [isRenewing, setIsRenewing] = useState(false);
  const normalizedSearch = search.trim();
  const isLoading = normalizedSearch
    ? isSearchLoading
    : isDirectoryLoading;
  const loadError = normalizedSearch ? searchError : directoryError;

  useEffect(() => {
    let isCurrentRequest = true;
    const controller = new AbortController();

    getUsers(undefined, controller.signal)
      .then((nextUsers) => {
        if (isCurrentRequest) {
          allUsersRef.current = nextUsers;
          if (!searchValueRef.current.trim()) {
            setUsers(nextUsers);
          }
          setDirectoryError("");
        }
      })
      .catch((error: unknown) => {
        if (isCurrentRequest && !controller.signal.aborted) {
          setDirectoryError(
            error instanceof Error ? error.message : "Could not load users.",
          );
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsDirectoryLoading(false);
        }
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const phone = normalizedSearch;
    if (!phone) {
      completedSearchRef.current = "";
      return;
    }

    if (!/^\d{1,11}$/.test(phone)) {
      completedSearchRef.current = "";
      return;
    }

    if (completedSearchRef.current !== phone) {
      completedSearchRef.current = "";
    }
    if (
      inFlightSearchRef.current === phone ||
      completedSearchRef.current === phone
    ) {
      return;
    }

    const submitImmediately =
      searchSubmitVersion !== handledSearchSubmitRef.current;
    handledSearchSubmitRef.current = searchSubmitVersion;
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      if (
        controller.signal.aborted ||
        inFlightSearchRef.current === phone ||
        completedSearchRef.current === phone
      ) {
        return;
      }

      setIsSearchLoading(true);
      setSearchError("");
      inFlightSearchRef.current = phone;
      getUsers(phone, controller.signal)
        .then((nextUsers) => {
          if (!controller.signal.aborted) {
            setUsers(nextUsers);
            completedSearchRef.current = phone;
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setSearchError(
              error instanceof Error ? error.message : "Could not load users.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            if (inFlightSearchRef.current === phone) {
              inFlightSearchRef.current = "";
            }
            setIsSearchLoading(false);
          }
        });
    }, submitImmediately ? 0 : 450);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
      if (inFlightSearchRef.current === phone) {
        inFlightSearchRef.current = "";
      }
    };
  }, [normalizedSearch, searchSubmitVersion]);

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const phone = search.trim();
    if (
      /^\d{1,11}$/.test(phone) &&
      inFlightSearchRef.current !== phone &&
      completedSearchRef.current !== phone
    ) {
      setSearchError("");
      setIsSearchLoading(true);
      setSearchSubmitVersion((version) => version + 1);
    }
  }

  function handleSearchChange(value: string) {
    searchValueRef.current = value;
    setSearch(value);

    const phone = value.trim();
    if (!phone) {
      setSearchError("");
      setIsSearchLoading(false);
      setUsers(allUsersRef.current);
      return;
    }

    if (!/^\d{1,11}$/.test(phone)) {
      setSearchError("Search with 1 to 11 digits only.");
      setIsSearchLoading(false);
      setUsers([]);
      return;
    }

    setSearchError("");
    if (completedSearchRef.current === phone) {
      setIsSearchLoading(false);
      return;
    }
    setIsSearchLoading(true);
  }

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
    if (!subscriptionDurations.some((duration) => duration.days === subscriptionDays)) {
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
        handleSearchChange("");
        setIsDirectoryLoading(true);
        return getUsers();
      })
      .then((nextUsers) => {
        allUsersRef.current = nextUsers;
        setUsers(nextUsers);
        setDirectoryError("");
      })
      .catch((error: unknown) => {
        setDirectoryError(
          error instanceof Error ? error.message : "Could not load users.",
        );
        setFormError(
          error instanceof Error ? error.message : "Could not add user.",
        );
      })
      .finally(() => {
        setIsCreating(false);
        setIsDirectoryLoading(false);
      });
  }

  function handleRenewSubmit(
    event: FormEvent<HTMLFormElement>,
    user: AdminUser,
  ) {
    event.preventDefault();
    setRenewalError("");
    setRenewalMessage("");

    const subscriptionDays = Number(renewalDays);
    if (!subscriptionDurations.some((duration) => duration.days === subscriptionDays)) {
      setRenewalError("Select a subscription duration.");
      return;
    }

    const price = Number(renewalPrice);
    if (
      renewalPrice.trim() === "" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(price * 100)
    ) {
      setRenewalError("Enter a valid subscription price in EGP.");
      return;
    }

    setIsRenewing(true);
    renewSubscription(user.id, { subscriptionDays, price })
      .then(() => {
        setRenewalMessage(
          `${user.name} renewed for ${subscriptionDays / 30} month(s) (${subscriptionDays} days).`,
        );
        setRenewingUserId(null);
        setRenewalDays("");
        setRenewalPrice("");
      })
      .catch((error: unknown) => {
        setRenewalError(
          error instanceof Error ? error.message : "Could not renew subscription.",
        );
      })
      .finally(() => setIsRenewing(false));
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
          <div className="self-end sm:self-auto">
            <LogoutButton />
          </div>
        </header>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="min-w-0 rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-lime">
                  <Users size={19} />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                    Directory
                  </p>
                </div>
                <h2 className="mt-3 text-2xl font-semibold">All users</h2>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-muted">
                {users.length}
              </span>
            </div>

            <label className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-ink px-4 py-3 focus-within:border-lime">
              <Search size={18} className="shrink-0 text-muted" />
              <input
                type="tel"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by phone number"
                aria-label="Search users by phone number"
                aria-invalid={Boolean(searchError)}
                aria-describedby={loadError ? "user-search-error" : undefined}
                inputMode="numeric"
                maxLength={11}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
              />
            </label>

            {renewalMessage && (
              <p role="status" className="mt-4 text-sm text-lime">
                {renewalMessage}
              </p>
            )}

            <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted">
                  <LoaderCircle size={18} className="animate-spin" />
                  Loading users...
                </div>
              ) : loadError ? (
                <div id="user-search-error" role="alert" className="flex items-center gap-2 px-4 py-6 text-sm text-red-300">
                  <AlertCircle size={18} className="shrink-0" />
                  {loadError}
                </div>
              ) : users.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-muted">
                  No users found{search.trim() ? " for this phone number." : "."}
                </p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {users.map((user) => (
                    <li
                      key={user.id}
                      className="px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                            <Phone size={14} />
                            {user.phone}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              user.role === "admin"
                                ? "bg-blue/15 text-blue"
                                : "bg-lime/10 text-lime"
                            }`}
                          >
                            {user.role === "admin" ? "Admin" : "Member"}
                          </span>
                          {user.role === "member" && (
                            <button
                              type="button"
                              onClick={() => {
                                setRenewalMessage("");
                                setRenewalError("");
                                setRenewalDays("");
                                setRenewalPrice("");
                                setRenewingUserId((current) =>
                                  current === user.id ? null : user.id,
                                );
                              }}
                              className="text-sm font-medium text-lime hover:text-paper"
                            >
                              Renew
                            </button>
                          )}
                        </div>
                      </div>
                      {renewingUserId === user.id && (
                        <form
                          className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-ink/60 p-4 sm:grid-cols-[1fr_1fr_auto]"
                          onSubmit={(event) => handleRenewSubmit(event, user)}
                        >
                          <label className="text-xs text-muted">
                            Duration
                            <select
                              required
                              value={renewalDays}
                              onChange={(event) =>
                                setRenewalDays(event.target.value)
                              }
                              className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-lime"
                            >
                              <option value="">Select duration</option>
                              {subscriptionDurations.map((duration) => (
                                <option
                                  key={duration.days}
                                  value={duration.days}
                                >
                                  {duration.months}{" "}
                                  {duration.months === 1 ? "month" : "months"} (
                                  {duration.days} days)
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs text-muted">
                            Price (EGP)
                            <input
                              required
                              type="number"
                              min="0"
                              step="0.01"
                              value={renewalPrice}
                              onChange={(event) =>
                                setRenewalPrice(event.target.value)
                              }
                              className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-lime"
                            />
                          </label>
                          <div className="flex items-end">
                            <button
                              type="submit"
                              disabled={isRenewing}
                              className="w-full rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                            >
                              {isRenewing ? "Renewing..." : "Confirm"}
                            </button>
                          </div>
                          {renewalError && (
                            <p
                              role="alert"
                              className="text-sm text-red-300 sm:col-span-3"
                            >
                              {renewalError}
                            </p>
                          )}
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="h-fit min-w-0 rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-7">
            <div className="flex items-center gap-2 text-lime">
              <UserPlus size={19} />
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                New account
              </p>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Add a user</h2>
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
                    setForm((current) => ({ ...current, name: event.target.value }))
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
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-lg border border-line bg-ink px-4 py-3 outline-none transition-colors focus:border-lime"
                />
              </div>

              <div>
                <label htmlFor="subscription-days" className="mb-2 block text-sm">
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
                <label htmlFor="subscription-price" className="mb-2 block text-sm">
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
                <label htmlFor="user-password" className="mb-2 flex items-center gap-2 text-sm">
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
                      setForm((current) => ({ ...current, password: event.target.value }))
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
                <p role="alert" className="flex items-center gap-2 text-sm text-red-300">
                  <AlertCircle size={17} className="shrink-0" />
                  {formError}
                </p>
              )}
              {successMessage && (
                <p role="status" className="flex items-center gap-2 text-sm text-lime">
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
