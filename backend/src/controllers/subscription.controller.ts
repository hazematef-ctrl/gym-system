import type { NextFunction, Request, Response } from "express";
import { getCurrentSubscription } from "../services/subscription.service.js";

export async function currentSubscriptionController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login first.",
    });
  }

  try {
    const subscription = await getCurrentSubscription(userId);
    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
}
