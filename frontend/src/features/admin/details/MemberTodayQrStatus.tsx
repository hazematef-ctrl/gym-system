import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  QrCode,
} from "lucide-react";
import type { MemberDetails } from "../../../services/api";
import { formatMemberDate, formatMemberDateTime } from "./formatMemberDate";

type MemberTodayQrStatusProps = {
  todayQrAttendance: MemberDetails["todayQrAttendance"];
};

const statusPresentation = {
  attended: {
    label: "Successfully attended",
    icon: CheckCircle2,
    className: "text-lime",
    description: "A matching QR scan and persisted attendance record exist.",
  },
  generated_not_scanned: {
    label: "QR generated but not scanned",
    icon: Clock3,
    className: "text-amber-300",
    description: "Today's QR exists, but no scan or attendance was recorded.",
  },
  no_qr: {
    label: "No QR generated today",
    icon: QrCode,
    className: "text-muted",
    description: "There is no QR record for today's Cairo business date.",
  },
  inconsistent: {
    label: "Inconsistent QR/attendance state",
    icon: AlertCircle,
    className: "text-red-300",
    description:
      "The scan and attendance records do not confirm a successful check-in.",
  },
} as const;

function MemberTodayQrStatus({
  todayQrAttendance,
}: MemberTodayQrStatusProps) {
  const presentation = statusPresentation[todayQrAttendance.status];
  const StatusIcon = presentation.icon;

  return (
    <section className="rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
          Check-in
        </p>
        <h2 className="mt-2 text-xl font-semibold">Today’s QR attendance</h2>
        <p className="mt-1 text-sm text-muted">
          Cairo business date · {formatMemberDate(todayQrAttendance.businessDate)}
        </p>
      </div>

      <div
        role={todayQrAttendance.status === "inconsistent" ? "alert" : "status"}
        className={`mt-5 rounded-xl border border-white/10 bg-ink/50 p-4 ${presentation.className}`}
      >
        <div className="flex items-start gap-3">
          <StatusIcon size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{presentation.label}</p>
            <p className="mt-1 text-sm text-muted">
              {presentation.description}
            </p>
          </div>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">QR generated</dt>
          <dd className="mt-1 font-medium">
            {todayQrAttendance.qrGenerated ? "Yes" : "No"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Attendance registered</dt>
          <dd className="mt-1 font-medium">
            {todayQrAttendance.attendanceRegistered ? "Yes" : "No"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Scanned at</dt>
          <dd className="mt-1 font-medium">
            {todayQrAttendance.scannedAt
              ? formatMemberDateTime(todayQrAttendance.scannedAt)
              : "Not scanned"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Scanned by</dt>
          <dd className="mt-1 font-medium">
            {todayQrAttendance.scannedByName ?? "Not available"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export default MemberTodayQrStatus;
