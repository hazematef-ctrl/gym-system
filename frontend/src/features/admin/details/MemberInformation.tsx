import type { MemberDetails } from "../../../services/api";
import { formatMemberDate } from "./formatMemberDate";

type MemberInformationProps = {
  member: MemberDetails["member"];
};

function MemberInformation({ member }: MemberInformationProps) {
  return (
    <dl className="mt-5 grid gap-4 border-t border-white/10 pt-5 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-muted">Phone number</dt>
        <dd className="mt-1 break-all font-medium">{member.phone}</dd>
      </div>
      <div>
        <dt className="text-muted">Member ID</dt>
        <dd className="mt-1 break-all font-medium">{member.id}</dd>
      </div>
      <div>
        <dt className="text-muted">Account created</dt>
        <dd className="mt-1 font-medium">
          {formatMemberDate(member.createdAt)}
        </dd>
      </div>
    </dl>
  );
}

export default MemberInformation;
