import User from "../models/User.js";
import { generateToken } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

// Register a new user
export const register = async (req, res) => {
  try {
    const { username, email, password, preferences } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Username, email, and password are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
        message: "Please provide a valid email address",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        error: "Weak password",
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      return res.status(409).json({
        error: "User already exists",
        message: `A user with this ${field} already exists`,
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      preferences: preferences || {},
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return user data without password
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      preferences: user.preferences,
      createdAt: user.createdAt,
    };

    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Registration failed",
      message: "An error occurred during registration",
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: "Missing credentials",
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Invalid email or password",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Return user data without password
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      preferences: user.preferences,
      createdAt: user.createdAt,
    };

    res.json({
      message: "Login successful",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed",
      message: "An error occurred during login",
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const user = req.user;

    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      preferences: user.preferences,
      totalInteractions: user.interactions.length,
      createdAt: user.createdAt,
    };

    res.json({
      user: userResponse,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      error: "Failed to fetch profile",
      message: "An error occurred while fetching user profile",
    });
  }
};

// Update user preferences
export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({
        error: "Invalid preferences",
        message: "Preferences must be a valid object",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { preferences },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "User not found",
      });
    }

    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      preferences: user.preferences,
      createdAt: user.createdAt,
    };

    res.json({
      message: "Preferences updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({
      error: "Failed to update preferences",
      message: "An error occurred while updating preferences",
    });
  }
};

// Get user interaction history
export const getInteractionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, type } = req.query;

    const user = await User.findById(userId).select("interactions");

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "User not found",
      });
    }

    let interactions = user.interactions;

    // Filter by interaction type if specified
    if (type) {
      interactions = interactions.filter(
        (interaction) => interaction.type === type
      );
    }

    // Sort by timestamp (most recent first)
    interactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedInteractions = interactions.slice(startIndex, endIndex);

    res.json({
      interactions: paginatedInteractions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(interactions.length / limit),
        totalCount: interactions.length,
        hasNext: endIndex < interactions.length,
        hasPrev: startIndex > 0,
      },
    });
  } catch (error) {
    console.error("Get interaction history error:", error);
    res.status(500).json({
      error: "Failed to fetch interaction history",
      message: "An error occurred while fetching interaction history",
    });
  }
};
