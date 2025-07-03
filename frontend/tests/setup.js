import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock API base URL
global.mockApiUrl = "http://localhost:5000/api";

// Mock axios
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Global test data
global.mockUser = {
  id: "507f1f77bcf86cd799439011",
  username: "testuser",
  email: "test@example.com",
  preferences: {
    categories: ["electronics"],
    priceRange: { min: 0, max: 1000 },
  },
};

global.mockProduct = {
  _id: "507f1f77bcf86cd799439012",
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
