import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  JwtConfigurationError,
  verifyAccessToken,
} from "../config/jwt.js";

function unauthorized(res: Response, message: string) {
  return res.status(401).json({
    success: false,
    error: { code: "UNAUTHORIZED", message },
  });
}

export function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.get("authorization");
  let token: string | undefined;

  if (authorization) {
    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
    if (!match) {
      return unauthorized(res, "Use a valid Bearer token.");
    }
    token = match[1];
  } else {
    token = req.cookies?.access_token;
  }

  if (!token) {
    return unauthorized(res, "Authentication required.");
  }

  let decoded: ReturnType<typeof verifyAccessToken>;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    if (error instanceof JwtConfigurationError) {
      return next(error);
    }

    return unauthorized(
      res,
      error instanceof jwt.TokenExpiredError
        ? "Access token has expired."
        : "Access token is invalid.",
    );
  }

  if (
    typeof decoded === "string" ||
    typeof decoded.id !== "string" ||
    typeof decoded.role !== "string"
  ) {
    return unauthorized(res, "Access token is invalid.");
  }

  req.user = {
    id: decoded.id,
    role: decoded.role,
    ...(typeof decoded.phone === "string" ? { phone: decoded.phone } : {}),
  };
  next();
}
