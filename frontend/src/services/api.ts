export type AdminUser = {
  id: string | number;
  name: string;
  phone: string;
  role: UserRole;
};

export type UserRole = "admin" | "member";

export type AuthUser = {
  id: string | number;
  name: string;
  phone: string;
  role: UserRole;
};

export type CurrentSubscription = {
  status: "active" | "expired" | "cancelled" | "missing";
  startDate: string | null;
  endDate: string | null;
  remainingDays: number;
  durationDays: number;
  price: string | null;
};

export type AdminSubscription = {
  id: string;
  status: "active";
  startDate: string;
  endDate: string;
  price: string;
};

export type DailyQr = {
  token: string;
  qrDate: string;
  reused: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

const defaultApiBaseUrl = import.meta.env.DEV
  ? `${window.location.protocol}//${window.location.hostname}:3000/api/users`
  : "http://localhost:3000/api/users";
const API_BASE_URL = import.meta.env.VITE_API_URL ?? defaultApiBaseUrl;
const SUBSCRIPTIONS_API_URL = API_BASE_URL.replace(/\/users\/?$/, "/subscriptions");
const QR_API_URL = API_BASE_URL.replace(/\/users\/?$/, "/qr");

export class ApiError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  baseUrl = API_BASE_URL,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = (await response.json()) as ApiResponse<T>;
  if (!response.ok) {
    throw new ApiError(
      result.message ?? "The request could not be completed.",
      response.status,
    );
  }

  return result.data;
}

export function getUsers(
  phone?: string,
  signal?: AbortSignal,
): Promise<AdminUser[]> {
  const normalizedPhone = phone?.trim();
  const query = normalizedPhone
    ? `?${new URLSearchParams({ phone: normalizedPhone }).toString()}`
    : "";
  return request<AdminUser[]>(`/${query}`, { signal });
}

export function loginUser(input: {
  phone: string;
  password: string;
}): Promise<AuthUser> {
  return request<AuthUser>("/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>("/profile");
}

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  return request<{ message: string }>("/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logoutUser(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });
  const result = (await response.json()) as { message?: string };

  if (!response.ok) {
    throw new ApiError(result.message ?? "Could not log out.", response.status);
  }
}

export function createUser(input: {
  name: string;
  phone: string;
  password: string;
  subscriptionDays: number;
  price: number;
}): Promise<AdminUser> {
  return request<AdminUser>("/", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function renewSubscription(
  userId: string | number,
  input: { subscriptionDays: number; price: number },
): Promise<AdminSubscription> {
  return request<AdminSubscription>(
    `/users/${encodeURIComponent(String(userId))}/renew`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    SUBSCRIPTIONS_API_URL,
  );
}

export function getCurrentSubscription(): Promise<CurrentSubscription> {
  return request<CurrentSubscription>("/current", {}, SUBSCRIPTIONS_API_URL);
}

export function generateDailyQr(): Promise<DailyQr> {
  return request<DailyQr>(
    "/generate",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    QR_API_URL,
  );
}