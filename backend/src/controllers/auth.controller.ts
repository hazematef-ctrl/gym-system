
import type{ Request, Response, NextFunction } from "express";
import { createAccessToken } from "../config/jwt.js";
import {
  changeOwnPassword,
  getCurrentUser,
  loginUser,
} from "../services/auth.service.js";

export const profileController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }

    const user = await getCurrentUser(userId);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please login first.",
    });
  }

  try {
    await changeOwnPassword(userId, req.sessionID, req.body);
    res.status(200).json({
      success: true,
      data: { message: "Password changed successfully." },
    });
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Verify user credentials
    const user = await loginUser(req.body);

    // 2. Create a fresh session
    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      // 3. Store user ID in the session
      req.session.userId = user.id;

      // 4. Save session before sending response
      req.session.save((err) => {
        if (err) {
          return next(err);
        }

        return res.status(200).json({
          success: true,
          message: "Login successful",
          data: user,
        });
      });
    });
  } catch (error) {
    next(error);
  }
};

export const jwtLoginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await loginUser(req.body);
    const accessToken = createAccessToken({
      id: String(user.id),
      role: user.role,
      phone: user.phone,
    });

    res.status(200).json({
      success: true,
      data: { user, accessToken },
    });
  } catch (error) {
    next(error);
  }
};

export const jwtCookieLoginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await loginUser(req.body);
    const accessToken = createAccessToken({
      id: String(user.id),
      role: user.role,
      phone: user.phone,
    });

    // Cookie authentication is currently used only by GET routes; protect future writes against CSRF.
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

export const jwtCookieLogoutController = (
  req: Request,
  res: Response,
) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.status(200).json({ success: true, message: "JWT cookie cleared." });
};



export const logoutController = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    res.clearCookie("connect.sid");

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  });
};
