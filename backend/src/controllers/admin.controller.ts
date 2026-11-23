import type { Request, Response, NextFunction } from "express";
import { userRepository } from "../repositories/user.repository.js";
import {
  addUser,
  listUsers,
  renewMemberSubscription,
} from "../services/admin.service.js";
import { AppError } from "../utils/app-error.js";

export const getUserByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.params.id;
    if (typeof userId !== "string") {
      return next(new AppError("Invalid user ID", 400));
    }

    const user = await userRepository.findPublicById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const listUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : "";
    const users = await listUsers(phone);

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const createUserController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await addUser(req.body);

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const renewSubscriptionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.params.userId;
    if (typeof userId !== "string") {
      return next(new AppError("Invalid user ID", 400));
    }

    const subscription = await renewMemberSubscription(userId, req.body);
    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};
