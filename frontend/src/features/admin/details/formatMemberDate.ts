const CAIRO_TIME_ZONE = "Africa/Cairo";

export function formatMemberDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: CAIRO_TIME_ZONE,
  }).format(date);
}

export function formatMemberDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CAIRO_TIME_ZONE,
  }).format(date);
}

export function formatSubscriptionPrice(value: string) {
  const price = Number(value);
  if (!Number.isFinite(price)) {
    return `${value} EGP`;
  }

  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(price);
}
