import { vi } from "vitest";

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.MONGODB_URI = "mongodb://localhost:27017/test-db";

// Mock MongoDB connection
vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  return {
    ...actual,
    connect: vi.fn().mockResolvedValue({}),
    connection: {
      close: vi.fn().mockResolvedValue({}),
    },
  };
});

// Global test helpers
global.testUser = {
  username: "testuser",
  email: "test@example.com",
  password: "password123",
  preferences: {
    categories: ["electronics", "clothing"],
    priceRange: { min: 0, max: 1000 },
  },
};

global.testProduct = {
  name: "Test Product",
  description: "A test product",
  price: 99.99,
  category: "electronics",
  subcategory: "smartphones",
  manufacturer: "TestCorp",
  image_url: "https://example.com/image.jpg",
  rating: 4.5,
  stock_quantity: 100,
};
