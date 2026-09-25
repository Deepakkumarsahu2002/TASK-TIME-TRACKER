import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { registerSchema } from "../validators/register.validator.js";
import { loginSchema } from "../validators/login.validator.js";
import { generateToken } from "../utils/jwt.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate request body
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, email, password } = result.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    const token = generateToken(user._id.toString());

    res.cookie("token", token, authCookieOptions);

    // Send safe response
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while creating the account",
    });
  }
};

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validate request body
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = result.data;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Compare password with stored hash
    const isPasswordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Login successful
    const token = generateToken(user._id.toString());

    res.cookie("token", token, authCookieOptions);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong while logging in",
    });
  }
};

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie("token", authCookieOptions);

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const getCurrentUser = (req: Request, res: Response): void => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  res.status(200).json({
    success: true,
    user,
  });
};