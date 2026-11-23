import { useState } from "react";
import {
  removeMemberProfilePhoto,
  uploadMemberProfilePhoto,
} from "../../../../services/api";

type MemberPhotoTarget = {
  id: string | number;
  name: string;
};

export type MemberPhotoFeedback = {
  memberId: string;
  message: string;
  isError: boolean;
};

export function useMemberPhotoManager(
  onPhotoUpdated: (memberId: string, profilePhotoUrl: string | null) => void,
) {
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<MemberPhotoFeedback | null>(null);

  async function upload(member: MemberPhotoTarget, photo: File) {
    const memberId = String(member.id);
    if (busyMemberId !== null) {
      return;
    }

    if (photo.size > 5 * 1024 * 1024) {
      setFeedback({
        memberId,
        message: "Choose an image no larger than 5 MB.",
        isError: true,
      });
      return;
    }

    setBusyMemberId(memberId);
    setFeedback(null);
    try {
      const result = await uploadMemberProfilePhoto(member.id, photo);
      onPhotoUpdated(memberId, result.profilePhotoUrl);
      setFeedback({
        memberId,
        message: result.cleanupPending
          ? "Photo updated; old-image cleanup is queued."
          : "Photo updated.",
        isError: false,
      });
    } catch (error) {
      setFeedback({
        memberId,
        message:
          error instanceof Error ? error.message : "Could not upload photo.",
        isError: true,
      });
    } finally {
      setBusyMemberId(null);
    }
  }

  async function remove(member: MemberPhotoTarget) {
    const memberId = String(member.id);
    if (
      busyMemberId !== null ||
      !window.confirm(`Remove ${member.name}'s profile photo?`)
    ) {
      return;
    }

    setBusyMemberId(memberId);
    setFeedback(null);
    try {
      const result = await removeMemberProfilePhoto(member.id);
      onPhotoUpdated(memberId, null);
      setFeedback({
        memberId,
        message: result.cleanupPending
          ? "Photo removed; storage cleanup is queued."
          : "Photo removed.",
        isError: false,
      });
    } catch (error) {
      setFeedback({
        memberId,
        message:
          error instanceof Error ? error.message : "Could not remove photo.",
        isError: true,
      });
    } finally {
      setBusyMemberId(null);
    }
  }

  return { busyMemberId, feedback, upload, remove };
}
