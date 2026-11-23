
import type{ Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isOperationalError = err instanceof AppError;

  const statusCode = isOperationalError
    ? err.statusCode
    : 500;

  if (!isOperationalError) {
    console.error(err);
  }

  return res.status(statusCode).json({
    success: false,
    message: isOperationalError
      ? err.message
      : "Internal Server Error",
    ...(isOperationalError && err.details
      ? { details: err.details }
      : {}),
  });
};
