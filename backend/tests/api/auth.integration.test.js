import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import authRoutes from "../../routes/auth.js";

// Mock dependencies
vi.mock("../../models/User.js");
vi.mock("../../middleware/auth.js");

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);

  // Error handler
  app.use((error, req, res, next) => {
    res.status(error.status || 500).json({
      error: error.message || "Internal server error",
    });
  });

  return app;
};

describe("Auth API Integration Tests", () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        preferences: {
          categories: ["electronics"],
          priceRange: { min: 0, max: 1000 },
        },
      };

      // Mock successful registration
      const User = await import("../../models/User.js");
      User.default.findOne.mockResolvedValue(null);
      User.default.mockImplementation(() => ({
        _id: "user123",
        ...userData,
        save: vi.fn().mockResolvedValue(true),
        createdAt: new Date(),
      }));

      const { generateToken } = await import("../../middleware/auth.js");
      generateToken.mockReturnValue("mock-jwt-token");

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        message: "User registered successfully",
        user: {
          username: userData.username,
          email: userData.email,
        },
        token: "mock-jwt-token",
      });
      expect(response.body.user.password).toBeUndefined();
    });

    it("should return validation error for missing fields", async () => {
      const invalidData = {
        email: "test@example.com",
        // missing username and password
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: "Missing required fields",
        message: "Username, email, and password are required",
      });
    });

    it("should return error for invalid email format", async () => {
      const invalidData = {
        username: "testuser",
        email: "invalid-email",
        password: "password123",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: "Invalid email format",
        message: "Please provide a valid email address",
      });
    });

    it("should return error for existing user", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      // Mock existing user
      const User = await import("../../models/User.js");
      User.default.findOne.mockResolvedValue({ email: userData.email });

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        error: "User already exists",
        message: "A user with this email already exists",
      });
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login user successfully", async () => {
      const loginData = {
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = {
        _id: "user123",
        username: "testuser",
        email: "test@example.com",
        preferences: {},
        createdAt: new Date(),
        comparePassword: vi.fn().mockResolvedValue(true),
      };

      // Mock successful login
      const User = await import("../../models/User.js");
      User.default.findOne.mockResolvedValue(mockUser);

      const { generateToken } = await import("../../middleware/auth.js");
      generateToken.mockReturnValue("mock-jwt-token");

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: "Login successful",
        user: {
          id: "user123",
          username: "testuser",
          email: "test@example.com",
        },
        token: "mock-jwt-token",
      });
      expect(mockUser.comparePassword).toHaveBeenCalledWith("password123");
    });

    it("should return error for missing credentials", async () => {
      const invalidData = {
        email: "test@example.com",
        // missing password
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: "Missing credentials",
        message: "Email and password are required",
      });
    });

    it("should return error for invalid credentials", async () => {
      const loginData = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      // Mock user not found
      const User = await import("../../models/User.js");
      User.default.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: "Invalid credentials",
        message: "Invalid email or password",
      });
    });

    it("should return error for wrong password", async () => {
      const loginData = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const mockUser = {
        comparePassword: vi.fn().mockResolvedValue(false),
      };

      // Mock wrong password
      const User = await import("../../models/User.js");
      User.default.findOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: "Invalid credentials",
        message: "Invalid email or password",
      });
    });
  });

  describe("GET /api/auth/profile", () => {
    it("should return user profile when authenticated", async () => {
      const mockUser = {
        _id: "user123",
        username: "testuser",
        email: "test@example.com",
        preferences: { categories: ["electronics"] },
        interactions: [],
        createdAt: new Date(),
      };

      // Mock authentication middleware
      const { authenticateToken } = await import("../../middleware/auth.js");
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = mockUser;
        next();
      });

      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer mock-jwt-token");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        user: {
          id: "user123",
          username: "testuser",
          email: "test@example.com",
          totalInteractions: 0,
        },
      });
    });

    it("should return error when not authenticated", async () => {
      // Mock authentication failure
      const { authenticateToken } = await import("../../middleware/auth.js");
      authenticateToken.mockImplementation((req, res, next) => {
        res.status(401).json({
          error: "Access denied",
          message: "No token provided",
        });
      });

      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: "Access denied",
        message: "No token provided",
      });
    });
  });

  describe("PUT /api/auth/preferences", () => {
    it("should update user preferences successfully", async () => {
      const newPreferences = {
        categories: ["electronics", "clothing"],
        priceRange: { min: 100, max: 500 },
      };

      const mockUser = {
        _id: "user123",
        username: "testuser",
        email: "test@example.com",
        preferences: newPreferences,
        createdAt: new Date(),
      };

      // Mock authentication
      const { authenticateToken } = await import("../../middleware/auth.js");
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { _id: "user123" };
        next();
      });

      // Mock user update
      const User = await import("../../models/User.js");
      User.default.findByIdAndUpdate.mockResolvedValue(mockUser);

      const response = await request(app)
        .put("/api/auth/preferences")
        .set("Authorization", "Bearer mock-jwt-token")
        .send({ preferences: newPreferences });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: "Preferences updated successfully",
        user: {
          id: "user123",
          preferences: newPreferences,
        },
      });
    });
  });
});
