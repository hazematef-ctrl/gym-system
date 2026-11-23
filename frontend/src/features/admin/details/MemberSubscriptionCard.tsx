import type { MemberSubscriptionDetails } from "../../../services/api";
import MemberStatusBadge from "./MemberStatusBadge";
import {
  formatMemberDate,
  formatSubscriptionPrice,
} from "./formatMemberDate";

type MemberSubscriptionCardProps = {
  subscription: MemberSubscriptionDetails | null;
};

function MemberSubscriptionCard({ subscription }: MemberSubscriptionCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
          Membership
        </p>
        <h2 className="mt-2 text-xl font-semibold">Current subscription</h2>
      </div>

      {!subscription ? (
        <p className="mt-5 rounded-xl border border-white/10 bg-ink/50 p-4 text-sm text-muted">
          No subscription history is available for this member.
        </p>
      ) : (
        <>
          <div className="mt-4">
            <MemberStatusBadge status={subscription.status} />
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Start date</dt>
              <dd className="mt-1 font-medium">
                {formatMemberDate(subscription.startDate)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">End date (exclusive)</dt>
              <dd className="mt-1 font-medium">
                {formatMemberDate(subscription.endDate)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Remaining days</dt>
              <dd className="mt-1 font-medium">
                {subscription.status === "active"
                  ? subscription.remainingDays
                  : 0}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Duration</dt>
              <dd className="mt-1 font-medium">
                {subscription.durationDays} days
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Price</dt>
              <dd className="mt-1 font-medium">
                {formatSubscriptionPrice(subscription.price)}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}

export default MemberSubscriptionCard;
