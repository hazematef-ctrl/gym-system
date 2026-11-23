import type { Request, Response, NextFunction } from "express";
import { userRepository } from "../repositories/user.repository.js";
import {
  addUser,
  getMemberDetails,
  listUsers,
  renewMemberSubscription,
} from "../services/admin.service.js";
import { AppError } from "../utils/app-error.js";
import {
  removeMemberProfilePhoto,
  updateMemberProfilePhoto,
} from "../services/profile-photo.service.js";

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

export const getMemberDetailsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const memberId = req.params.id;
    if (typeof memberId !== "string") {
      return next(new AppError("Invalid member ID", 400));
    }

    const memberDetails = await getMemberDetails(memberId);
    if (!memberDetails) {
      return res.status(404).json({
        success: false,
        code: "MEMBER_NOT_FOUND",
        message: "Member not found.",
      });
    }

    res.status(200).json({ success: true, data: memberDetails });
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

export const uploadMemberProfilePhotoController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const memberId = req.params.id;
  if (typeof memberId !== "string" || !req.file) {
    return next(new AppError("A member photo file is required.", 400));
  }

  try {
    const result = await updateMemberProfilePhoto(memberId, req.file.buffer);
    res.status(200).json({
      success: true,
      message: result.cleanupPending
        ? "Profile photo updated; old photo cleanup is queued."
        : "Profile photo updated.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const removeMemberProfilePhotoController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const memberId = req.params.id;
  if (typeof memberId !== "string") {
    return next(new AppError("Invalid user ID", 400));
  }

  try {
    const result = await removeMemberProfilePhoto(memberId);
    res.status(200).json({
      success: true,
      message: result.cleanupPending
        ? "Profile photo removed; storage cleanup is queued."
        : "Profile photo removed.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
