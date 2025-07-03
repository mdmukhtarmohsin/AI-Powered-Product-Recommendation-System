import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "ai-recommendation-system-super-secret-key-2024";

// Middleware to verify JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: "Access token required",
        message: "Please provide a valid authorization token",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from database to ensure they still exist
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        error: "Invalid token",
        message: "User associated with this token no longer exists",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({
        error: "Invalid token",
        message: "The provided token is malformed or invalid",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(403).json({
        error: "Token expired",
        message: "The provided token has expired. Please log in again",
      });
    }

    console.error("Authentication error:", error);
    return res.status(500).json({
      error: "Authentication failed",
      message: "An error occurred during authentication",
    });
  }
};

// Optional authentication middleware (doesn't require token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't return errors, just continue without user
    next();
  }
};

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: "7d" } // Token expires in 7 days
  );
};

// Middleware to check if user is admin (for future use)
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource",
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({
      error: "Insufficient permissions",
      message: "Admin access required for this operation",
    });
  }

  next();
};
