import { Users } from "lucide-react";

type MembersHeaderProps = {
  count: number;
};

function MembersHeader({ count }: MembersHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-lime">
          <Users size={19} />
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">
            Directory
          </p>
        </div>
        <h2 className="mt-3 text-2xl font-semibold">All Members</h2>
      </div>
      <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-muted">
        {count}
      </span>
    </div>
  );
}

export default MembersHeader;
