import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../utils/app-error.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 0,
    parts: 1,
  },
});

const parsePhoto = upload.single("photo");

export function receiveProfilePhoto(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  parsePhoto(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return next(
          new AppError(
            "Profile photos must be 5 MB or smaller.",
            413,
            undefined,
            "PHOTO_TOO_LARGE",
          ),
        );
      }

      return next(
        new AppError(
          "Provide exactly one image in the photo field.",
          400,
          undefined,
          "INVALID_UPLOAD",
        ),
      );
    }

    if (error) {
      return next(error);
    }

    if (!req.file) {
      return next(
        new AppError(
          "A profile photo file is required.",
          400,
          undefined,
          "PHOTO_REQUIRED",
        ),
      );
    }

    next();
  });
}
