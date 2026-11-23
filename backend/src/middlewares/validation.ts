
import type{ Request, Response, NextFunction } from "express";
import type{ ZodSchema } from "zod";
import { AppError } from "../utils/app-error.js";

type RequestSource = "body" | "params" | "query";

export const validateRequest = (
  schema: ZodSchema,
  source: RequestSource = "body",
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(
        new AppError("Validation failed", 400, errors, "VALIDATION_ERROR")
      );
    }

    if (source === "body") {
      req.body = result.data;
    }

    next();
  };
};
