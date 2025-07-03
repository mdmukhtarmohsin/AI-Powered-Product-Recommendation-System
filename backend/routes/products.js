import express from "express";
import {
  getProducts,
  getProductById,
  getFeaturedProducts,
  getSaleProducts,
  getCategories,
  trackInteraction,
  getProductRecommendations,
  searchProducts,
} from "../controllers/productController.js";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// Public routes with optional authentication
router.get("/", optionalAuth, getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/sale", getSaleProducts);
router.get("/categories", getCategories);
router.get("/search", searchProducts);
router.get("/:id", optionalAuth, getProductById);
router.get(
  "/:productId/recommendations",
  optionalAuth,
  getProductRecommendations
);

// Protected routes
router.post("/:productId/interact", authenticateToken, trackInteraction);

export default router;
