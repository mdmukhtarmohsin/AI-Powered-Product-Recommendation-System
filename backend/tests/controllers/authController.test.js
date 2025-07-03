import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  register,
  login,
  getProfile,
  updatePreferences,
} from "../../controllers/authController.js";
import User from "../../models/User.js";
import { generateToken } from "../../middleware/auth.js";

// Mock dependencies
vi.mock("../../models/User.js");
vi.mock("../../middleware/auth.js");

describe("Auth Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      user: null,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        preferences: { categories: ["electronics"] },
      };

      mockReq.body = userData;

      const mockUser = {
        _id: "user123",
        ...userData,
        save: vi.fn().mockResolvedValue(true),
        createdAt: new Date(),
      };

      User.findOne.mockResolvedValue(null);
      User.mockImplementation(() => mockUser);
      generateToken.mockReturnValue("mock-jwt-token");

      await register(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({
        $or: [{ email: userData.email }, { username: userData.username }],
      });
      expect(mockUser.save).toHaveBeenCalled();
      expect(generateToken).toHaveBeenCalledWith("user123");
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "User registered successfully",
        user: expect.objectContaining({
          id: "user123",
          username: userData.username,
          email: userData.email,
        }),
        token: "mock-jwt-token",
      });
    });

    it("should return error for missing required fields", async () => {
      mockReq.body = { email: "test@example.com" }; // missing username and password

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Missing required fields",
        message: "Username, email, and password are required",
      });
    });

    it("should return error for invalid email format", async () => {
      mockReq.body = {
        username: "testuser",
        email: "invalid-email",
        password: "password123",
      };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid email format",
        message: "Please provide a valid email address",
      });
    });

    it("should return error for weak password", async () => {
      mockReq.body = {
        username: "testuser",
        email: "test@example.com",
        password: "123", // too short
      };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Weak password",
        message: "Password must be at least 6 characters long",
      });
    });

    it("should return error for existing user", async () => {
      mockReq.body = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue({ email: "test@example.com" });

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "User already exists",
        message: "A user with this email already exists",
      });
    });
  });

  describe("login", () => {
    it("should login user successfully", async () => {
      mockReq.body = {
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

      User.findOne.mockResolvedValue(mockUser);
      generateToken.mockReturnValue("mock-jwt-token");

      await login(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(mockUser.comparePassword).toHaveBeenCalledWith("password123");
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Login successful",
        user: expect.objectContaining({
          id: "user123",
          username: "testuser",
          email: "test@example.com",
        }),
        token: "mock-jwt-token",
      });
    });

    it("should return error for missing credentials", async () => {
      mockReq.body = { email: "test@example.com" }; // missing password

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Missing credentials",
        message: "Email and password are required",
      });
    });

    it("should return error for non-existent user", async () => {
      mockReq.body = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(null);

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
        message: "Invalid email or password",
      });
    });

    it("should return error for invalid password", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const mockUser = {
        comparePassword: vi.fn().mockResolvedValue(false),
      };

      User.findOne.mockResolvedValue(mockUser);

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
        message: "Invalid email or password",
      });
    });
  });

  describe("getProfile", () => {
    it("should return user profile successfully", async () => {
      mockReq.user = {
        _id: "user123",
        username: "testuser",
        email: "test@example.com",
        preferences: {},
        interactions: [],
        createdAt: new Date(),
      };

      await getProfile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: "user123",
          username: "testuser",
          email: "test@example.com",
          totalInteractions: 0,
        }),
      });
    });
  });

  describe("updatePreferences", () => {
    it("should update user preferences successfully", async () => {
      const newPreferences = {
        categories: ["electronics", "clothing"],
        priceRange: { min: 0, max: 1000 },
      };

      mockReq.user = { _id: "user123" };
      mockReq.body = { preferences: newPreferences };

      const updatedUser = {
        _id: "user123",
        username: "testuser",
        email: "test@example.com",
        preferences: newPreferences,
        createdAt: new Date(),
      };

      User.findByIdAndUpdate.mockResolvedValue(updatedUser);

      await updatePreferences(mockReq, mockRes);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        { preferences: newPreferences },
        { new: true, runValidators: true }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Preferences updated successfully",
        user: expect.objectContaining({
          id: "user123",
          preferences: newPreferences,
        }),
      });
    });

    it("should return error for invalid preferences", async () => {
      mockReq.user = { _id: "user123" };
      mockReq.body = { preferences: "invalid" }; // should be object

      await updatePreferences(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid preferences",
        message: "Preferences must be a valid object",
      });
    });
  });
});
