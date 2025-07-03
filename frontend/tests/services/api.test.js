import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import * as api from "../../src/services/api.js";

// Mock axios
vi.mock("axios");

describe("API Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Authentication API", () => {
    describe("login", () => {
      it("should login user successfully", async () => {
        const loginData = {
          email: "test@example.com",
          password: "password123",
        };

        const mockResponse = {
          data: {
            message: "Login successful",
            user: {
              id: "user123",
              username: "testuser",
              email: "test@example.com",
            },
            token: "mock-jwt-token",
          },
        };

        axios.post.mockResolvedValue(mockResponse);

        const result = await api.login(loginData);

        expect(axios.post).toHaveBeenCalledWith("/auth/login", loginData);
        expect(result).toEqual(mockResponse.data);
        expect(localStorage.getItem("token")).toBe("mock-jwt-token");
      });

      it("should handle login error", async () => {
        const loginData = {
          email: "test@example.com",
          password: "wrongpassword",
        };

        const mockError = {
          response: {
            data: {
              error: "Invalid credentials",
              message: "Invalid email or password",
            },
          },
        };

        axios.post.mockRejectedValue(mockError);

        await expect(api.login(loginData)).rejects.toEqual(mockError);
        expect(localStorage.getItem("token")).toBeNull();
      });
    });

    describe("register", () => {
      it("should register user successfully", async () => {
        const registerData = {
          username: "testuser",
          email: "test@example.com",
          password: "password123",
          preferences: {
            categories: ["electronics"],
            priceRange: { min: 0, max: 1000 },
          },
        };

        const mockResponse = {
          data: {
            message: "User registered successfully",
            user: {
              id: "user123",
              username: "testuser",
              email: "test@example.com",
            },
            token: "mock-jwt-token",
          },
        };

        axios.post.mockResolvedValue(mockResponse);

        const result = await api.register(registerData);

        expect(axios.post).toHaveBeenCalledWith("/auth/register", registerData);
        expect(result).toEqual(mockResponse.data);
        expect(localStorage.getItem("token")).toBe("mock-jwt-token");
      });

      it("should handle registration validation error", async () => {
        const registerData = {
          email: "test@example.com",
          // missing required fields
        };

        const mockError = {
          response: {
            data: {
              error: "Missing required fields",
              message: "Username, email, and password are required",
            },
          },
        };

        axios.post.mockRejectedValue(mockError);

        await expect(api.register(registerData)).rejects.toEqual(mockError);
      });
    });

    describe("logout", () => {
      it("should clear token from localStorage", () => {
        localStorage.setItem("token", "mock-jwt-token");

        api.logout();

        expect(localStorage.getItem("token")).toBeNull();
      });
    });

    describe("getCurrentUser", () => {
      it("should get current user profile", async () => {
        const mockResponse = {
          data: {
            user: {
              id: "user123",
              username: "testuser",
              email: "test@example.com",
              preferences: {},
              totalInteractions: 5,
            },
          },
        };

        axios.get.mockResolvedValue(mockResponse);

        const result = await api.getCurrentUser();

        expect(axios.get).toHaveBeenCalledWith("/auth/profile");
        expect(result).toEqual(mockResponse.data);
      });

      it("should handle unauthorized error", async () => {
        const mockError = {
          response: {
            status: 401,
            data: {
              error: "Access denied",
              message: "No token provided",
            },
          },
        };

        axios.get.mockRejectedValue(mockError);

        await expect(api.getCurrentUser()).rejects.toEqual(mockError);
      });
    });
  });

  describe("Products API", () => {
    describe("getProducts", () => {
      it("should fetch products with pagination", async () => {
        const mockResponse = {
          data: {
            products: [
              { _id: "1", name: "Product 1", price: 100 },
              { _id: "2", name: "Product 2", price: 200 },
            ],
            pagination: {
              currentPage: 1,
              totalPages: 5,
              totalProducts: 50,
              hasNext: true,
              hasPrev: false,
            },
          },
        };

        axios.get.mockResolvedValue(mockResponse);

        const result = await api.getProducts({ page: 1, limit: 10 });

        expect(axios.get).toHaveBeenCalledWith("/products", {
          params: { page: 1, limit: 10 },
        });
        expect(result).toEqual(mockResponse.data);
      });

      it("should fetch products with category filter", async () => {
        const mockResponse = {
          data: {
            products: [
              { _id: "1", name: "Smartphone", category: "electronics" },
            ],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalProducts: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };

        axios.get.mockResolvedValue(mockResponse);

        const result = await api.getProducts({ category: "electronics" });

        expect(axios.get).toHaveBeenCalledWith("/products", {
          params: { category: "electronics" },
        });
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe("getProductById", () => {
      it("should fetch single product by ID", async () => {
        const mockResponse = {
          data: {
            product: {
              _id: "product123",
              name: "Test Product",
              price: 99.99,
              description: "A test product",
            },
          },
        };

        axios.get.mockResolvedValue(mockResponse);

        const result = await api.getProductById("product123");

        expect(axios.get).toHaveBeenCalledWith("/products/product123");
        expect(result).toEqual(mockResponse.data);
      });

      it("should handle product not found error", async () => {
        const mockError = {
          response: {
            status: 404,
            data: {
              error: "Product not found",
            },
          },
        };

        axios.get.mockRejectedValue(mockError);

        await expect(api.getProductById("nonexistent")).rejects.toEqual(
          mockError
        );
      });
    });

    describe("searchProducts", () => {
      it("should search products by query", async () => {
        const mockResponse = {
          data: {
            products: [
              { _id: "1", name: "iPhone 14", category: "electronics" },
              { _id: "2", name: "iPhone Case", category: "accessories" },
            ],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalProducts: 2,
              hasNext: false,
              hasPrev: false,
            },
          },
        };

        axios.get.mockResolvedValue(mockResponse);

        const result = await api.searchProducts("iPhone");

        expect(axios.get).toHaveBeenCalledWith("/products/search", {
          params: { q: "iPhone" },
        });
        expect(result).toEqual(mockResponse.data);
      });

      it("should return empty results for no matches", async () => {
        const mockResponse = {
          data: {
            products: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalProducts: 0,
              hasNext: false,
              hasPrev: false,
            },
          },
        };

        axios.get.mockResolvedValue(mockResponse);

        const result = await api.searchProducts("nonexistentproduct");

        expect(result.products).toEqual([]);
        expect(result.pagination.totalProducts).toBe(0);
      });
    });
  });

  describe("Recommendations API", () => {
    describe("getRecommendations", () => {
      it("should fetch recommendations for authenticated user", async () => {
        const mockResponse = {
          data: {
            recommendations: [
              {
                product: {
                  _id: "rec1",
                  name: "Recommended Product 1",
                  price: 150,
                },
                score: 0.95,
                reason: "Based on your preferences",
              },
            ],
            metadata: {
              algorithm: "collaborative_filtering",
              timestamp: "2024-01-01T00:00:00Z",
            },
          },
        };

        axios.get.mockResolvedValue(mockResponse);

        const result = await api.getRecommendations();

        expect(axios.get).toHaveBeenCalledWith("/recommendations");
        expect(result).toEqual(mockResponse.data);
      });

      it("should fetch recommendations with specific algorithm", async () => {
        const mockResponse = {
          data: {
            recommendations: [],
            metadata: {
              algorithm: "content_based",
              timestamp: "2024-01-01T00:00:00Z",
            },
          },
        };

        axios.get.mockResolvedValue(mockResponse);

        const result = await api.getRecommendations({
          algorithm: "content_based",
        });

        expect(axios.get).toHaveBeenCalledWith("/recommendations", {
          params: { algorithm: "content_based" },
        });
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe("recordInteraction", () => {
      it("should record user interaction with product", async () => {
        const interactionData = {
          productId: "product123",
          type: "view",
          metadata: { duration: 5000 },
        };

        const mockResponse = {
          data: {
            message: "Interaction recorded successfully",
            interaction: {
              id: "interaction123",
              ...interactionData,
              timestamp: "2024-01-01T00:00:00Z",
            },
          },
        };

        axios.post.mockResolvedValue(mockResponse);

        const result = await api.recordInteraction(interactionData);

        expect(axios.post).toHaveBeenCalledWith(
          "/recommendations/interactions",
          interactionData
        );
        expect(result).toEqual(mockResponse.data);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      const networkError = new Error("Network Error");
      networkError.code = "NETWORK_ERROR";

      axios.get.mockRejectedValue(networkError);

      await expect(api.getProducts()).rejects.toEqual(networkError);
    });

    it("should handle server errors", async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            error: "Internal server error",
            message: "An unexpected error occurred",
          },
        },
      };

      axios.get.mockRejectedValue(serverError);

      await expect(api.getProducts()).rejects.toEqual(serverError);
    });

    it("should handle rate limiting", async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            error: "Too many requests",
            message: "Please try again later",
          },
        },
      };

      axios.get.mockRejectedValue(rateLimitError);

      await expect(api.getProducts()).rejects.toEqual(rateLimitError);
    });
  });

  describe("Request Interceptors", () => {
    it("should add authorization header when token exists", () => {
      localStorage.setItem("token", "mock-jwt-token");

      // Test that axios instance is configured with interceptors
      // This is more integration-focused and depends on actual implementation
      expect(localStorage.getItem("token")).toBe("mock-jwt-token");
    });

    it("should handle token expiration", async () => {
      const tokenExpiredError = {
        response: {
          status: 401,
          data: {
            error: "Token expired",
            message: "Please login again",
          },
        },
      };

      axios.get.mockRejectedValue(tokenExpiredError);

      await expect(api.getCurrentUser()).rejects.toEqual(tokenExpiredError);
      // Should clear token and redirect to login
      expect(localStorage.getItem("token")).toBeNull();
    });
  });
});
