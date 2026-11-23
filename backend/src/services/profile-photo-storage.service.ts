import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../utils/app-error.js";

const SIGNED_URL_TTL_SECONDS = 900;
const STORAGE_KEY_PATTERN =
  /^member-profiles\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i;

let storageClient: SupabaseClient | undefined;
let privateBucketCheck: Promise<void> | undefined;

function getStorageConfiguration() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET;

  if (!url || !serviceRoleKey || !bucketName) {
    throw new AppError(
      "Profile photo storage is not configured.",
      503,
      undefined,
      "PHOTO_STORAGE_UNAVAILABLE",
    );
  }

  return { url, serviceRoleKey, bucketName };
}

function getStorageClient() {
  if (!storageClient) {
    const { url, serviceRoleKey } = getStorageConfiguration();
    storageClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }

  return storageClient;
}

async function assertPrivateBucket() {
  const { bucketName } = getStorageConfiguration();
  const client = getStorageClient();

  if (!privateBucketCheck) {
    privateBucketCheck = client.storage
      .getBucket(bucketName)
      .then(({ data, error }) => {
        if (error || !data) {
          throw error ?? new Error("Storage bucket was not found");
        }
        if (data.public) {
          throw new Error("Profile photo bucket must be private");
        }
      })
      .catch((error: unknown) => {
        privateBucketCheck = undefined;
        console.error("Could not verify the private profile photo bucket", error);
        throw new AppError(
          "Profile photo storage is unavailable or is not private.",
          503,
          undefined,
          "PHOTO_STORAGE_UNAVAILABLE",
        );
      });
  }

  await privateBucketCheck;
  return { bucketName, client };
}

function isValidStorageKey(storageKey: string) {
  return STORAGE_KEY_PATTERN.test(storageKey);
}

export async function uploadProfilePhoto(
  memberId: string,
  image: Buffer,
) {
  const { bucketName, client } = await assertPrivateBucket();
  const storageKey = `member-profiles/${memberId}/${randomUUID()}.webp`;
  const { error } = await client.storage
    .from(bucketName)
    .upload(storageKey, image, {
      cacheControl: "3600",
      contentType: "image/webp",
      upsert: false,
    });

  if (error) {
    console.error("Supabase profile photo upload failed", error);
    throw new AppError(
      "The profile photo could not be uploaded.",
      502,
      undefined,
      "PHOTO_STORAGE_UNAVAILABLE",
    );
  }

  return storageKey;
}

export async function deleteProfilePhoto(storageKey: string) {
  if (!isValidStorageKey(storageKey)) {
    throw new Error("Stored profile photo key has an invalid format");
  }

  const { bucketName, client } = await assertPrivateBucket();
  const { error } = await client.storage.from(bucketName).remove([storageKey]);

  if (error) {
    console.error("Supabase profile photo cleanup failed", error);
    throw new Error("Profile photo object could not be deleted");
  }
}

export async function getSignedProfilePhotoUrls(
  storageKeys: Array<string | null>,
) {
  const uniqueKeys = [
    ...new Set(storageKeys.filter((key): key is string => key !== null)),
  ];
  if (uniqueKeys.length === 0) {
    return storageKeys.map(() => null);
  }

  for (const key of uniqueKeys) {
    if (!isValidStorageKey(key)) {
      throw new Error("Stored profile photo key has an invalid format");
    }
  }

  const { bucketName, client } = await assertPrivateBucket();
  const { data, error } = await client.storage
    .from(bucketName)
    .createSignedUrls(uniqueKeys, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("Supabase profile photo URL signing failed", error);
    throw new AppError(
      "Profile photos are temporarily unavailable.",
      503,
      undefined,
      "PHOTO_STORAGE_UNAVAILABLE",
    );
  }

  const urlByKey = new Map(
    data.map((item) => [item.path, item.signedUrl]),
  );
  return storageKeys.map((key) => {
    if (key === null) {
      return null;
    }

    const url = urlByKey.get(key);
    if (!url) {
      throw new AppError(
        "Profile photos are temporarily unavailable.",
        503,
        undefined,
        "PHOTO_STORAGE_UNAVAILABLE",
      );
    }

    return url;
  });
}
