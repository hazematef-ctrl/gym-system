import type { MemberDetails } from "../../../services/api";
import { formatMemberDate, formatMemberDateTime } from "./formatMemberDate";

type MemberAttendanceHistoryProps = {
  attendanceHistory: MemberDetails["attendanceHistory"];
  limit: number;
};

function MemberAttendanceHistory({
  attendanceHistory,
  limit,
}: MemberAttendanceHistoryProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
          Check-ins
        </p>
        <h2 className="mt-2 text-xl font-semibold">Attendance history</h2>
        <p className="mt-1 text-sm text-muted">Latest {limit} records</p>
      </div>

      {attendanceHistory.length === 0 ? (
        <p className="mt-5 rounded-xl border border-white/10 bg-ink/50 p-4 text-sm text-muted">
          No attendance has been recorded for this member.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="pb-3 pr-4 font-medium">
                  Attendance date
                </th>
                <th scope="col" className="pb-3 pr-4 font-medium">
                  Scanned at
                </th>
                <th scope="col" className="pb-3 font-medium">
                  Registered by
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {attendanceHistory.map((attendance, index) => (
                <tr
                  key={`${attendance.attendanceDate}-${attendance.scanTimestamp ?? index}`}
                >
                  <td className="py-3 pr-4">
                    {formatMemberDate(attendance.attendanceDate)}
                  </td>
                  <td className="py-3 pr-4">
                    {formatMemberDateTime(attendance.scanTimestamp)}
                  </td>
                  <td className="py-3">
                    {attendance.scannedByName ?? "Not available"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default MemberAttendanceHistory;
