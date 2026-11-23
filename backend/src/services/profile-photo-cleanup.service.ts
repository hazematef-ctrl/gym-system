import { profilePhotoRepository } from "../repositories/profile-photo.repository.js";
import {
  deleteProfilePhoto,
} from "./profile-photo-storage.service.js";

const CLEANUP_BATCH_SIZE = 30;

export async function processProfilePhotoCleanupQueue() {
  const storageKeys =
    await profilePhotoRepository.listDueCleanupKeys(CLEANUP_BATCH_SIZE);
  let processed = 0;
  let failed = 0;

  for (const storageKey of storageKeys) {
    try {
      if (!(await profilePhotoRepository.isReferenced(storageKey))) {
        await deleteProfilePhoto(storageKey);
      }

      await profilePhotoRepository.finishCleanup(storageKey);
      processed += 1;
    } catch (error) {
      try {
        await profilePhotoRepository.retryCleanup(storageKey);
      } catch (retryError) {
        throw new AggregateError(
          [error, retryError],
          "Profile photo cleanup failed and could not be rescheduled",
        );
      }

      console.error("Profile photo cleanup was deferred", error);
      failed += 1;
    }
  }

  return { processed, failed };
}
