import { CalendarDays, CheckCircle2, Zap } from "lucide-react";
import { motion } from "motion/react";

type SubscriptionStatus = "active" | "expired" | "cancelled" | "missing";

type MembershipCardProps = {
  status: SubscriptionStatus;
  remainingDays: number;
  startDate: string | null;
  endDate: string | null;
  durationDays: number;
};

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  const [year, month, day] = date.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthName = monthNames[Number(month) - 1];

  return year && day && monthName ? `${day} ${monthName} ${year}` : date;
}

function getStatusLabel(status: SubscriptionStatus) {
  switch (status) {
    case "active":
      return "Active";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    case "missing":
      return "No subscription";
  }
}

function getProgress(
  status: SubscriptionStatus,
  remainingDays: number,
  durationDays: number,
) {
  if (status === "expired") {
    return 100;
  }
  if (status !== "active" || durationDays <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(((durationDays - remainingDays) / durationDays) * 100),
    ),
  );
}

function MembershipCard({
  status,
  remainingDays,
  startDate,
  endDate,
  durationDays,
}: MembershipCardProps) {
  const progress = getProgress(status, remainingDays, durationDays);
  const statusStyles =
    status === "active"
      ? "border-lime/20 bg-lime/10 text-lime"
      : status === "expired"
        ? "border-orange/20 bg-orange/10 text-orange"
        : "border-white/10 bg-white/5 text-muted";

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl border border-white/6 bg-[#1C1D24] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-8"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted">
          YOUR MEMBERSHIP
        </p>

        <span
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusStyles}`}
        >
          {status === "active" && <CheckCircle2 size={13} />}
          {getStatusLabel(status)}
        </span>
      </div>

      <div className="mt-8">
        <p className="text-sm text-muted">
          {status === "active"
            ? "متبقي في اشتراكك"
            : status === "missing"
              ? "لا يوجد اشتراك حالي"
              : status === "cancelled"
                ? "تم إلغاء الاشتراك"
                : "انتهى اشتراكك"}
        </p>

        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-6xl font-bold tracking-tighter text-lime">
            {remainingDays}
          </span>
          <span className="text-lg font-medium text-paper">يوم</span>
        </div>

        <p className="mt-3 flex items-center gap-2 text-sm text-paper">
          <Zap size={16} className="text-lime" />
          كل يوم بتتمرن فيه هو خطوة أقرب لهدفك.
        </p>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex justify-between text-xs">
          <span className="text-muted">مدة الاشتراك المستهلكة</span>
          <span className="font-medium text-paper">{progress}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-[#34353B]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.9, delay: 0.35, ease: "easeOut" }}
            className="h-full rounded-full bg-lime"
          />
        </div>
      </div>

      <div className="mt-7 flex flex-wrap justify-between gap-4 border-t border-white/6 pt-5">
        <div>
          <p className="mb-1 text-xs text-muted">تاريخ البداية</p>
          <p className="flex items-center gap-2 text-sm text-paper">
            <CalendarDays size={15} className="text-muted" />
            {formatDate(startDate)}
          </p>
        </div>

        <div>
          <p className="mb-1 text-xs text-muted">تاريخ الانتهاء</p>
          <p className="flex items-center gap-2 text-sm text-paper">
            <CalendarDays size={15} className="text-lime" />
            {formatDate(endDate)}
          </p>
        </div>
      </div>
    </motion.section>
  );
}

export default MembershipCard;
