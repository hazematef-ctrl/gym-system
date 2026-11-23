import { AlertCircle, ArrowLeft, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ApiError,
  getMemberDetails,
  type MemberDetails,
} from "../../../services/api";
import MemberAttendanceHistory from "../details/MemberAttendanceHistory";
import MemberPaymentInformation from "../details/MemberPaymentInformation";
import MemberPhotoManager from "../details/MemberPhotoManager";
import MemberProfileHeader from "../details/MemberProfileHeader";
import MemberSubscriptionCard from "../details/MemberSubscriptionCard";
import MemberSubscriptionHistory from "../details/MemberSubscriptionHistory";
import MemberTodayQrStatus from "../details/MemberTodayQrStatus";
import { useMemberPhotoManager } from "../members/hooks/useMemberPhotoManager";

function MemberDetailsPage() {
  const { memberId } = useParams();

  if (!memberId) {
    return (
      <main className="min-h-screen bg-ink px-4 py-8 text-paper sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-panel/70 p-8 text-center">
          <h1 className="text-xl font-semibold">Member not found</h1>
          <Link
            to="/admin"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-ink"
          >
            <ArrowLeft size={16} />
            Return to All Members
          </Link>
        </div>
      </main>
    );
  }

  return <MemberDetailsContent key={memberId} memberId={memberId} />;
}

function MemberDetailsContent({ memberId }: { memberId: string }) {
  const [details, setDetails] = useState<MemberDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getMemberDetails(memberId, controller.signal)
      .then(setDetails)
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load this member's details.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [memberId]);

  const photoManager = useMemberPhotoManager((updatedMemberId, profilePhotoUrl) => {
    setDetails((current) =>
      current && current.member.id === updatedMemberId
        ? {
            ...current,
            member: { ...current.member, profilePhotoUrl },
          }
        : current,
    );
  });

  const currentMemberId = details?.member.id;
  const photoFeedback =
    photoManager.feedback?.memberId === currentMemberId
      ? photoManager.feedback
      : null;

  return (
    <main className="min-h-screen bg-ink px-4 py-8 text-paper sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">
              i GYM · Management
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Member details
            </h1>
          </div>
          <Link
            to="/admin"
            className="flex items-center gap-2 self-start rounded-lg border border-white/10 px-3 py-2 text-sm font-medium hover:border-lime hover:text-lime sm:self-auto"
          >
            <ArrowLeft size={17} />
            All Members
          </Link>
        </header>

        {isLoading ? (
          <div
            role="status"
            className="flex min-h-64 items-center justify-center gap-3 text-muted"
          >
            <LoaderCircle size={20} className="animate-spin text-lime" />
            Loading member details...
          </div>
        ) : notFound ? (
          <section
            role="alert"
            className="rounded-2xl border border-white/10 bg-panel/70 p-8 text-center"
          >
            <h2 className="text-xl font-semibold">Member not found</h2>
            <p className="mt-2 text-sm text-muted">
              This member may have been removed or the link may be incorrect.
            </p>
            <Link
              to="/admin"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-ink"
            >
              <ArrowLeft size={16} />
              Return to All Members
            </Link>
          </section>
        ) : errorMessage ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-400/20 bg-panel/70 p-6"
          >
            <div className="flex items-start gap-3 text-red-300">
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold">Could not load member details</h2>
                <p className="mt-2 text-sm text-paper">{errorMessage}</p>
              </div>
            </div>
            <Link
              to="/admin"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm hover:border-lime hover:text-lime"
            >
              <ArrowLeft size={16} />
              Return to All Members
            </Link>
          </section>
        ) : details ? (
          <div className="space-y-6">
            <MemberProfileHeader
              member={details.member}
              subscriptionStatus={
                details.currentSubscription?.status ?? "missing"
              }
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <MemberSubscriptionCard
                subscription={details.currentSubscription}
              />
              <MemberPhotoManager
                memberName={details.member.name}
                photoUrl={details.member.profilePhotoUrl}
                isBusy={
                  photoManager.busyMemberId === details.member.id
                }
                feedback={photoFeedback?.message ?? ""}
                isError={photoFeedback?.isError ?? false}
                onUpload={(photo) => {
                  void photoManager.upload(details.member, photo);
                }}
                onRemove={() => {
                  void photoManager.remove(details.member);
                }}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <MemberPaymentInformation
                paymentInformation={details.paymentInformation}
              />
              <MemberTodayQrStatus
                todayQrAttendance={details.todayQrAttendance}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <MemberSubscriptionHistory
                subscriptions={details.subscriptionHistory}
              />
              <MemberAttendanceHistory
                attendanceHistory={details.attendanceHistory}
                limit={details.attendanceHistoryLimit}
              />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default MemberDetailsPage;
