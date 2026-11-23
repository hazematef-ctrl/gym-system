import { Search } from "lucide-react";
import type { KeyboardEvent } from "react";

type MembersFiltersProps = {
  search: string;
  searchError: string;
  onSearchChange: (value: string) => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

function MembersFilters({
  search,
  searchError,
  onSearchChange,
  onSearchKeyDown,
}: MembersFiltersProps) {
  return (
    <label className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-ink px-4 py-3 focus-within:border-lime">
      <Search size={18} className="shrink-0 text-muted" />
      <input
        type="tel"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        onKeyDown={onSearchKeyDown}
        placeholder="Search by phone number"
        aria-label="Search users by phone number"
        aria-invalid={Boolean(searchError)}
        aria-describedby={searchError ? "member-search-error" : undefined}
        inputMode="numeric"
        maxLength={11}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
      />
    </label>
  );
}

export default MembersFilters;
