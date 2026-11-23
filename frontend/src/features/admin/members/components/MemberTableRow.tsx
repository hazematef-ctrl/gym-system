import {
  Eye,
  ImagePlus,
  Phone,
  Trash2,
} from "lucide-react";
import {
  Link,
} from "react-router-dom";
import type {
  ChangeEvent,
  FormEvent,
} from "react";
import type { AdminUser } from "../../../../services/api";
import type { MemberPhotoFeedback } from "../hooks/useMemberPhotoManager";
import subscriptionDurations from "../subscriptionDurations";
import MemberRoleBadge from "./MemberRoleBadge";

type MemberTableRowProps = {
  user: AdminUser;
  isRenewing: boolean;
  renewalDays: string;
  renewalPrice: string;
  renewalError: string;
  isSubmittingRenewal: boolean;
  photoBusy: boolean;
  photoOperationInProgress: boolean;
  photoFeedback: MemberPhotoFeedback | null;
  onRenewToggle: (user: AdminUser) => void;
  onRenewDaysChange: (value: string) => void;
  onRenewPriceChange: (value: string) => void;
  onRenewSubmit: (
    event: FormEvent<HTMLFormElement>,
    user: AdminUser,
  ) => void;
  onPhotoUpload: (
    event: ChangeEvent<HTMLInputElement>,
    user: AdminUser,
  ) => void;
  onPhotoRemove: (user: AdminUser) => void;
};

function MemberTableRow({
  user,
  isRenewing,
  renewalDays,
  renewalPrice,
  renewalError,
  isSubmittingRenewal,
  photoBusy,
  photoOperationInProgress,
  photoFeedback,
  onRenewToggle,
  onRenewDaysChange,
  onRenewPriceChange,
  onRenewSubmit,
  onPhotoUpload,
  onPhotoRemove,
}: MemberTableRowProps) {
  const memberDetailsPath = `/admin/members/${encodeURIComponent(String(user.id))}`;

  return (
    <li className="px-4 py-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-lime/10 text-lg font-semibold text-lime">
            {user.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt={`${user.name}'s profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              user.name.trim().charAt(0).toUpperCase() || "?"
            )}
          </div>
          <div className="min-w-0">
            {user.role === "member" ? (
              <Link
                to={memberDetailsPath}
                className="block truncate font-medium hover:text-lime focus-visible:text-lime focus-visible:outline-none"
              >
                {user.name}
              </Link>
            ) : (
              <p className="truncate font-medium">{user.name}</p>
            )}
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              <Phone size={14} />
              {user.phone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:justify-end">
          <MemberRoleBadge role={user.role} />
          {user.role === "member" && (
            <>
              <Link
                to={memberDetailsPath}
                className="inline-flex items-center gap-1 text-sm font-medium text-paper hover:text-lime"
              >
                <Eye size={16} />
                View Details
              </Link>
              <button
                type="button"
                onClick={() => onRenewToggle(user)}
                className="text-sm font-medium text-lime hover:text-paper"
              >
                Renew
              </button>
              <label
                htmlFor={`member-photo-${user.id}`}
                className={`flex cursor-pointer items-center gap-1 text-sm font-medium ${
                  photoOperationInProgress
                    ? "pointer-events-none opacity-60"
                    : "text-paper hover:text-lime"
                }`}
              >
                <ImagePlus size={16} />
                {photoBusy
                  ? "Uploading..."
                  : user.profilePhotoUrl
                    ? "Replace photo"
                    : "Add photo"}
              </label>
              <input
                id={`member-photo-${user.id}`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={photoOperationInProgress}
                onChange={(event) => onPhotoUpload(event, user)}
              />
              {user.profilePhotoUrl && (
                <button
                  type="button"
                  onClick={() => onPhotoRemove(user)}
                  disabled={photoOperationInProgress}
                  aria-label={`Remove ${user.name}'s profile photo`}
                  className="text-muted hover:text-red-300 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {photoFeedback?.memberId === String(user.id) && (
        <p
          role={photoFeedback.isError ? "alert" : "status"}
          className={`mt-3 text-sm ${
            photoFeedback.isError ? "text-red-300" : "text-lime"
          }`}
        >
          {photoFeedback.message}
        </p>
      )}

      {isRenewing && (
        <form
          className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-ink/60 p-4 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => onRenewSubmit(event, user)}
        >
          <label className="text-xs text-muted">
            Duration
            <select
              required
              value={renewalDays}
              onChange={(event) => onRenewDaysChange(event.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-lime"
            >
              <option value="">Select duration</option>
              {subscriptionDurations.map((duration) => (
                <option key={duration.days} value={duration.days}>
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
              onChange={(event) => onRenewPriceChange(event.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-lime"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmittingRenewal}
              className="w-full rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {isSubmittingRenewal ? "Renewing..." : "Confirm"}
            </button>
          </div>
          {renewalError && (
            <p role="alert" className="text-sm text-red-300 sm:col-span-3">
              {renewalError}
            </p>
          )}
        </form>
      )}
    </li>
  );
}

export default MemberTableRow;
