import { Info } from "lucide-react";
import type { MemberDetails } from "../../../services/api";

type MemberPaymentInformationProps = {
  paymentInformation: MemberDetails["paymentInformation"];
};

function MemberPaymentInformation({
  paymentInformation,
}: MemberPaymentInformationProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
          Billing
        </p>
        <h2 className="mt-2 text-xl font-semibold">Payment history</h2>
      </div>

      {!paymentInformation.trackingAvailable &&
        paymentInformation.history === null && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-ink/50 p-4">
            <Info size={19} className="mt-0.5 shrink-0 text-muted" />
            <div className="text-sm">
              <p className="font-medium">Payment tracking is not available</p>
              <p className="mt-2 text-muted">
                The system stores subscription prices, but does not record
                payments, payment dates, or which subscription a payment
                belongs to. No amount paid or total paid can be verified.
              </p>
            </div>
          </div>
        )}
    </section>
  );
}

export default MemberPaymentInformation;
