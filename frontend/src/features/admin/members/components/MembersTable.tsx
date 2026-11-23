import { AlertCircle, LoaderCircle } from "lucide-react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";
import type { AdminUser } from "../../../../services/api";
import type { MemberPhotoFeedback } from "../hooks/useMemberPhotoManager";
import MemberTableRow from "./MemberTableRow";

type MembersTableProps = {
  users: AdminUser[];
  search: string;
  isLoading: boolean;
  error: string;
  renewalMessage: string;
  renewingUserId: string | number | null;
  renewalDays: string;
  renewalPrice: string;
  renewalError: string;
  isRenewing: boolean;
  busyMemberId: string | null;
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

function MembersTable({
  users,
  search,
  isLoading,
  error,
  renewalMessage,
  renewingUserId,
  renewalDays,
  renewalPrice,
  renewalError,
  isRenewing,
  busyMemberId,
  photoFeedback,
  onRenewToggle,
  onRenewDaysChange,
  onRenewPriceChange,
  onRenewSubmit,
  onPhotoUpload,
  onPhotoRemove,
}: MembersTableProps) {
  return (
    <>
      {renewalMessage && (
        <p role="status" className="mt-4 text-sm text-lime">
          {renewalMessage}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
        {isLoading ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted"
          >
            <LoaderCircle size={18} className="animate-spin" />
            Loading users...
          </div>
        ) : error ? (
          <div
            id="member-search-error"
            role="alert"
            className="flex items-center gap-2 px-4 py-6 text-sm text-red-300"
          >
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        ) : users.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">
            No users found{search.trim() ? " for this phone number." : "."}
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {users.map((user) => (
              <MemberTableRow
                key={user.id}
                user={user}
                isRenewing={renewingUserId === user.id}
                renewalDays={renewalDays}
                renewalPrice={renewalPrice}
                renewalError={renewalError}
                isSubmittingRenewal={isRenewing}
                photoBusy={String(user.id) === busyMemberId}
                photoOperationInProgress={busyMemberId !== null}
                photoFeedback={photoFeedback}
                onRenewToggle={onRenewToggle}
                onRenewDaysChange={onRenewDaysChange}
                onRenewPriceChange={onRenewPriceChange}
                onRenewSubmit={onRenewSubmit}
                onPhotoUpload={onPhotoUpload}
                onPhotoRemove={onPhotoRemove}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default MembersTable;
