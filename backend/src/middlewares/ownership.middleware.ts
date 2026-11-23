import type { NextFunction, Request, Response } from "express";

export type OwnerResolver = (req: Request) => Promise<string | null>;

export function verifyOwnership(resolveOwnerId?: OwnerResolver) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required." },
      });
    }

    if (user.role === "admin") {
      return next();
    }

    try {
      const ownerId = resolveOwnerId
        ? await resolveOwnerId(req)
        : req.params.id;

      if (ownerId === null) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Resource not found." },
        });
      }

      if (ownerId !== user.id) {
        return res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Access to this resource is denied." },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
