import type { MemberSubscriptionStatus } from "../../../services/api";

type MemberStatusBadgeProps = {
  status: MemberSubscriptionStatus;
};

const statusPresentation: Record<
  MemberSubscriptionStatus,
  { label: string; className: string }
> = {
  active: { label: "Active", className: "bg-lime/10 text-lime" },
  upcoming: { label: "Upcoming", className: "bg-blue/15 text-blue" },
  expired: { label: "Expired", className: "bg-white/10 text-muted" },
  cancelled: { label: "Cancelled", className: "bg-red-400/10 text-red-300" },
};

function MemberStatusBadge({ status }: MemberStatusBadgeProps) {
  const presentation = statusPresentation[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${presentation.className}`}
    >
      {presentation.label}
    </span>
  );
}

export default MemberStatusBadge;
