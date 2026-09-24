import { NextFunction, Request, Response } from "express";
import User from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  try {
    const decoded = verifyToken(token);

    if (!decoded || typeof decoded === "string" || !decoded.userId) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
      return;
    }

    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
