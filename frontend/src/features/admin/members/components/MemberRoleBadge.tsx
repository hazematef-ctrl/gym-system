import type { UserRole } from "../../../../services/api";

type MemberRoleBadgeProps = {
  role: UserRole;
};

function MemberRoleBadge({ role }: MemberRoleBadgeProps) {
  const isAdmin = role === "admin";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        isAdmin ? "bg-blue/15 text-blue" : "bg-lime/10 text-lime"
      }`}
    >
      {isAdmin ? "Admin" : "Member"}
    </span>
  );
}

export default MemberRoleBadge;
