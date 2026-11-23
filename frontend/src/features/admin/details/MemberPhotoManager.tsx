import { ImagePlus, Trash2 } from "lucide-react";
import { useId, type ChangeEvent } from "react";

type MemberPhotoManagerProps = {
  memberName: string;
  photoUrl: string | null;
  isBusy: boolean;
  feedback: string;
  isError: boolean;
  onUpload: (photo: File) => void;
  onRemove: () => void;
};

function MemberPhotoManager({
  memberName,
  photoUrl,
  isBusy,
  feedback,
  isError,
  onUpload,
  onRemove,
}: MemberPhotoManagerProps) {
  const inputId = useId();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const photo = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (photo) {
      onUpload(photo);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lime">
          Profile
        </p>
        <h2 className="mt-2 text-xl font-semibold">Profile photo</h2>
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-lime/10 text-3xl font-semibold text-lime">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${memberName}'s profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            memberName.trim().charAt(0).toUpperCase() || "?"
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <label
            htmlFor={inputId}
            className={`flex cursor-pointer items-center gap-2 rounded-lg bg-lime px-4 py-2 text-sm font-semibold text-ink ${
              isBusy ? "pointer-events-none opacity-60" : "hover:bg-paper"
            }`}
          >
            <ImagePlus size={17} />
            {isBusy ? "Saving photo..." : photoUrl ? "Replace photo" : "Upload photo"}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={isBusy}
            onChange={handleChange}
          />
          {photoUrl && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isBusy}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-muted hover:border-red-300 hover:text-red-300 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Remove
            </button>
          )}
          <p className="w-full text-xs text-muted">
            JPEG, PNG, or WebP; maximum 5 MB.
          </p>
        </div>
      </div>

      {feedback && (
        <p
          role={isError ? "alert" : "status"}
          className={`mt-4 text-sm ${isError ? "text-red-300" : "text-lime"}`}
        >
          {feedback}
        </p>
      )}
    </section>
  );
}

export default MemberPhotoManager;
