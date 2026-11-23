import type { NextFunction, Request, Response } from "express";
import { generateDailyQr, scanQr } from "../services/qr.service.js";

export async function generateDailyQrController(
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
    const qr = await generateDailyQr(userId);
    res.status(qr.reused ? 200 : 201).json({ success: true, data: qr });
  } catch (error) {
    next(error);
  }
}

export async function scanQrController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const adminId = req.session.userId;
  if (!adminId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login first.",
    });
  }

  try {
    const result = await scanQr(req.body.token, adminId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
