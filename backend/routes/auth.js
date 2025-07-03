import express from "express";
import {
  register,
  login,
  getProfile,
  updatePreferences,
  getInteractionHistory,
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.put("/preferences", authenticateToken, updatePreferences);
router.get("/interactions", authenticateToken, getInteractionHistory);

export default router;
