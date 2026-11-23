import type { MemberSubscriptionDetails } from "../../../services/api";
import MemberStatusBadge from "./MemberStatusBadge";
import {
  formatMemberDate,
  formatMemberDateTime,
  formatSubscriptionPrice,
} from "./formatMemberDate";

type MemberSubscriptionHistoryProps = {
  subscriptions: MemberSubscriptionDetails[];
};

function MemberSubscriptionHistory({
  subscriptions,
}: MemberSubscriptionHistoryProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
          Membership
        </p>
        <h2 className="mt-2 text-xl font-semibold">Subscription history</h2>
      </div>

      {subscriptions.length === 0 ? (
        <p className="mt-5 rounded-xl border border-white/10 bg-ink/50 p-4 text-sm text-muted">
          No subscriptions have been recorded.
        </p>
      ) : (
        <ol className="mt-5 divide-y divide-white/10">
          {subscriptions.map((subscription) => (
            <li
              key={subscription.id}
              className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-medium">
                    {formatMemberDate(subscription.startDate)} –{" "}
                    {formatMemberDate(subscription.endDate)}
                  </p>
                  <MemberStatusBadge status={subscription.status} />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {subscription.durationDays} days ·{" "}
                  {formatSubscriptionPrice(subscription.price)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Created {formatMemberDateTime(subscription.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default MemberSubscriptionHistory;
