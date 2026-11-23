import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

const issuer = "gym-system-api";
const audience = "gym-system-client";

export class JwtConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JwtConfigurationError";
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new JwtConfigurationError(
      "JWT_SECRET must be configured with at least 32 bytes",
    );
  }

  return secret;
}

export type AccessTokenClaims = {
  id: string;
  role: string;
  phone?: string;
};

export function createAccessToken(claims: AccessTokenClaims): string {
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: "15m",
    issuer,
    audience,
  };

  return jwt.sign(claims, getJwtSecret(), options);
}

export function verifyAccessToken(token: string): string | JwtPayload {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
    issuer,
    audience,
  });
}
