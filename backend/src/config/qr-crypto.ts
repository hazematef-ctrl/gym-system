import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export type EncryptedQrToken = {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: number;
};

export class QrEncryptionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrEncryptionConfigurationError";
  }
}

function getEncryptionKey(version: number) {
  if (!Number.isInteger(version) || version < 1 || version > 32_767) {
    throw new QrEncryptionConfigurationError(
      "QR token encryption key version is invalid",
    );
  }

  const encodedKey = process.env[`QR_TOKEN_ENCRYPTION_KEY_${version}`];
  if (!encodedKey) {
    throw new QrEncryptionConfigurationError(
      `QR token encryption key version ${version} is not configured`,
    );
  }

  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== encodedKey) {
    throw new QrEncryptionConfigurationError(
      `QR_TOKEN_ENCRYPTION_KEY_${version} must be a base64-encoded 32-byte key`,
    );
  }

  return key;
}

function getActiveKeyVersion() {
  const version = Number(process.env.QR_TOKEN_ACTIVE_KEY_VERSION ?? "1");
  if (!Number.isInteger(version) || version < 1 || version > 32_767) {
    throw new QrEncryptionConfigurationError(
      "QR_TOKEN_ACTIVE_KEY_VERSION must be a positive small integer",
    );
  }

  return version;
}

export function createQrToken() {
  return randomBytes(32).toString("base64url");
}

export function hashQrToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest();
}

export function encryptQrToken(
  token: string,
  associatedData: string,
): EncryptedQrToken {
  const keyVersion = getActiveKeyVersion();
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(keyVersion),
    iv,
  );
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext,
    iv,
    authTag: cipher.getAuthTag(),
    keyVersion,
  };
}

export function decryptQrToken(
  encrypted: EncryptedQrToken,
  associatedData: string,
) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(encrypted.keyVersion),
    encrypted.iv,
  );
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  decipher.setAuthTag(encrypted.authTag);

  return Buffer.concat([
    decipher.update(encrypted.ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export function qrTokenMatchesHash(token: string, hash: Buffer) {
  const calculatedHash = hashQrToken(token);
  return (
    hash.length === calculatedHash.length &&
    timingSafeEqual(calculatedHash, hash)
  );
}
