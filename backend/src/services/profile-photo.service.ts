import pool from "../config/db.js";
import { profilePhotoRepository } from "../repositories/profile-photo.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import { processProfilePhotoCleanupQueue } from "./profile-photo-cleanup.service.js";
import { normalizeProfilePhoto } from "./profile-photo-image.service.js";
import {
  deleteProfilePhoto,
  getSignedProfilePhotoUrls,
  uploadProfilePhoto,
} from "./profile-photo-storage.service.js";

async function updateMemberPhotoKey(memberId: string, storageKey: string | null) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const member = await userRepository.findMemberForPhotoUpdate(
      client,
      memberId,
    );
    if (!member) {
      throw new AppError("Member not found", 404, undefined, "MEMBER_NOT_FOUND");
    }

    await userRepository.setProfilePhotoStorageKey(
      client,
      memberId,
      storageKey,
    );
    if (
      member.profilePhotoStorageKey &&
      member.profilePhotoStorageKey !== storageKey
    ) {
      await profilePhotoRepository.enqueueCleanup(
        client,
        member.profilePhotoStorageKey,
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;
    return member.profilePhotoStorageKey;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "Profile photo update failed and the transaction could not be rolled back",
        );
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

async function queueFailedUploadCleanup(storageKey: string, cause: unknown) {
  try {
    await profilePhotoRepository.enqueueCleanupStandalone(storageKey);
    await processProfilePhotoCleanupQueue();
  } catch (cleanupError) {
    try {
      if (!(await profilePhotoRepository.isReferenced(storageKey))) {
        await deleteProfilePhoto(storageKey);
      }
    } catch (directCleanupError) {
      throw new AggregateError(
        [cause, cleanupError, directCleanupError],
        "Profile photo update failed and the uploaded object could not be safely cleaned up",
      );
    }

    throw new AggregateError(
      [cause, cleanupError],
      "Profile photo update failed and cleanup could not be confirmed",
    );
  }
}

export async function updateMemberProfilePhoto(
  memberId: string,
  fileBuffer: Buffer,
) {
  const normalizedImage = await normalizeProfilePhoto(fileBuffer);
  const storageKey = await uploadProfilePhoto(memberId, normalizedImage);

  try {
    await updateMemberPhotoKey(memberId, storageKey);
  } catch (error) {
    await queueFailedUploadCleanup(storageKey, error);
    throw error;
  }

  const cleanup = await processProfilePhotoCleanupQueue();
  const [profilePhotoUrl] = await getSignedProfilePhotoUrls([storageKey]);
  if (!profilePhotoUrl) {
    throw new AppError(
      "The profile photo was saved but could not be displayed.",
      503,
      undefined,
      "PHOTO_STORAGE_UNAVAILABLE",
    );
  }

  return {
    memberId,
    profilePhotoUrl,
    cleanupPending: cleanup.failed > 0,
  };
}

export async function removeMemberProfilePhoto(memberId: string) {
  const previousStorageKey = await updateMemberPhotoKey(memberId, null);
  const cleanup = await processProfilePhotoCleanupQueue();

  return {
    memberId,
    removed: previousStorageKey !== null,
    cleanupPending: cleanup.failed > 0,
  };
}

export async function getProfilePhotoUrls(
  storageKeys: Array<string | null>,
) {
  return getSignedProfilePhotoUrls(storageKeys);
}
