import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import recommendationRoutes from "./routes/recommendations.js";

// Import models and utilities
import Product from "./models/Product.js";
import recommendationEngine from "./utils/recommender.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/ai-recommendation-system";

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api/", limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "AI Recommendation System API is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/recommendations", recommendationRoutes);

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  res.status(error.status || 500).json({
    error: error.message || "Internal server error",
    message: "An unexpected error occurred",
  });
});

// Database connection and server startup
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Load products data if collection is empty
    await loadProductsData();

    // Initialize recommendation engine
    await recommendationEngine.initialize();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Load products data from JSON file
const loadProductsData = async () => {
  try {
    const productCount = await Product.countDocuments();

    if (productCount === 0) {
      console.log("📦 Loading products data...");

      const productsPath = path.join(
        __dirname,
        "..",
        "MOCK_DATA",
        "products.json"
      );

      if (fs.existsSync(productsPath)) {
        const productsData = JSON.parse(fs.readFileSync(productsPath, "utf8"));

        // Insert products with additional fields
        const productsWithDefaults = productsData.map((product) => ({
          ...product,
          view_count: Math.floor(Math.random() * 1000),
          like_count: Math.floor(Math.random() * 100),
          purchase_count: Math.floor(Math.random() * 50),
          tags: [product.category, product.subcategory, product.manufacturer],
        }));

        await Product.insertMany(productsWithDefaults);
        console.log(
          `✅ Loaded ${productsWithDefaults.length} products into database`
        );
      } else {
        console.log(
          "⚠️ Products data file not found. Please ensure MOCK_DATA/products.json exists."
        );
      }
    } else {
      console.log(`✅ Database already contains ${productCount} products`);
    }
  } catch (error) {
    console.error("❌ Error loading products data:", error);
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("\n🔄 Shutting down gracefully...");

  mongoose.connection.close(() => {
    console.log("✅ Database connection closed");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 API Documentation: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  });
};

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
