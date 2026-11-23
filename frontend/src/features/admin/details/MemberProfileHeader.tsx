import type { MemberDetails } from "../../../services/api";
import MemberInformation from "./MemberInformation";
import MemberStatusBadge from "./MemberStatusBadge";

type MemberProfileHeaderProps = {
  member: MemberDetails["member"];
  subscriptionStatus: "active" | "upcoming" | "expired" | "cancelled" | "missing";
};

function MemberProfileHeader({
  member,
  subscriptionStatus,
}: MemberProfileHeaderProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-lime/10 text-3xl font-semibold text-lime">
          {member.profilePhotoUrl ? (
            <img
              src={member.profilePhotoUrl}
              alt={`${member.name}'s profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            member.name.trim().charAt(0).toUpperCase() || "?"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">
            Member profile
          </p>
          <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">
            {member.name}
          </h1>
          <div className="mt-3">
            {subscriptionStatus === "missing" ? (
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-muted">
                No subscription
              </span>
            ) : (
              <MemberStatusBadge status={subscriptionStatus} />
            )}
          </div>
        </div>
      </div>
      <MemberInformation member={member} />
    </section>
  );
}

export default MemberProfileHeader;
