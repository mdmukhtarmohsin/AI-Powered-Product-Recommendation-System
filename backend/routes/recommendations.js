import express from "express";
import {
  getUserRecommendations,
  getTrendingProducts,
  getCategoryBasedRecommendations,
  getSimilarUsersRecommendations,
  initializeRecommendationEngine,
  getRecommendationStats,
} from "../controllers/recommendationController.js";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/trending", getTrendingProducts);

// Protected routes
router.get("/personal", authenticateToken, getUserRecommendations);
router.get(
  "/category-based",
  authenticateToken,
  getCategoryBasedRecommendations
);
router.get("/similar-users", authenticateToken, getSimilarUsersRecommendations);
router.get("/stats", authenticateToken, getRecommendationStats);

// Admin routes (for future use)
router.post("/initialize", initializeRecommendationEngine);

export default router;
