import type{ Request, Response, NextFunction } from "express";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login first.",
    });
  }

  next();
};

export const requireSessionRole = (...allowedRoles: string[]) => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return next(new AppError("Unauthorized. Please login first.", 401));
    }

    const role = await userRepository.findRoleById(userId);

    if (!role || !allowedRoles.includes(role)) {
      const requiredRoles = allowedRoles
        .map((allowedRole) => `${allowedRole[0]?.toUpperCase()}${allowedRole.slice(1)}`)
        .join(" or ");
      return next(new AppError(`${requiredRoles} access required`, 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = requireSessionRole("admin");
export const requireMember = requireSessionRole("member");