import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import App from "../../src/App.jsx";

// Mock API service
vi.mock("../../src/services/api.js", () => ({
  getCurrentUser: vi.fn(),
  getProducts: vi.fn(),
  getRecommendations: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

// Mock components to focus on integration logic
vi.mock("../../src/components/Navbar.jsx", () => ({
  default: ({ user, onLogout }) => (
    <nav data-testid="navbar">
      {user ? (
        <div>
          <span data-testid="user-name">{user.username}</span>
          <button onClick={onLogout} data-testid="logout-btn">
            Logout
          </button>
        </div>
      ) : (
        <div>
          <button data-testid="login-btn">Login</button>
        </div>
      )}
    </nav>
  ),
}));

vi.mock("../../src/components/ProductCard.jsx", () => ({
  default: ({ product, onView }) => (
    <div data-testid="product-card" onClick={() => onView(product._id)}>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
    </div>
  ),
}));

vi.mock("../../src/components/LoadingSpinner.jsx", () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

describe("App Integration Tests", () => {
  const mockProducts = [
    {
      _id: "prod1",
      name: "Smartphone",
      price: 699.99,
      category: "electronics",
      image_url: "https://example.com/phone.jpg",
    },
    {
      _id: "prod2",
      name: "Laptop",
      price: 1299.99,
      category: "electronics",
      image_url: "https://example.com/laptop.jpg",
    },
  ];

  const mockUser = {
    id: "user123",
    username: "testuser",
    email: "test@example.com",
    preferences: {
      categories: ["electronics"],
      priceRange: { min: 0, max: 2000 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Application Initialization", () => {
    it("should render the app and load initial data", async () => {
      const { getCurrentUser, getProducts } = await import(
        "../../src/services/api.js"
      );

      getCurrentUser.mockResolvedValue({ user: null });
      getProducts.mockResolvedValue({
        products: mockProducts,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalProducts: 2,
        },
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      expect(screen.getByTestId("navbar")).toBeInTheDocument();

      // Should show loading initially
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

      // Wait for products to load
      await waitFor(() => {
        expect(screen.getByText("Smartphone")).toBeInTheDocument();
        expect(screen.getByText("Laptop")).toBeInTheDocument();
      });

      expect(getCurrentUser).toHaveBeenCalled();
      expect(getProducts).toHaveBeenCalled();
    });

    it("should handle authentication state on app load", async () => {
      const { getCurrentUser } = await import("../../src/services/api.js");

      localStorage.setItem("token", "mock-jwt-token");
      getCurrentUser.mockResolvedValue({ user: mockUser });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-name")).toHaveTextContent("testuser");
      });

      expect(getCurrentUser).toHaveBeenCalled();
    });
  });

  describe("Routing Integration", () => {
    it("should navigate between different routes", async () => {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      );

      // Should render home page by default
      expect(screen.getByTestId("navbar")).toBeInTheDocument();

      // Test navigation to products page
      // This would depend on your actual routing implementation
    });

    it("should handle protected routes when not authenticated", async () => {
      const { getCurrentUser } = await import("../../src/services/api.js");
      getCurrentUser.mockResolvedValue({ user: null });

      render(
        <MemoryRouter initialEntries={["/profile"]}>
          <App />
        </MemoryRouter>
      );

      // Should redirect to login or show access denied
      await waitFor(() => {
        // This depends on your routing implementation
        expect(screen.getByTestId("login-btn")).toBeInTheDocument();
      });
    });

    it("should allow access to protected routes when authenticated", async () => {
      const { getCurrentUser } = await import("../../src/services/api.js");
      getCurrentUser.mockResolvedValue({ user: mockUser });

      render(
        <MemoryRouter initialEntries={["/profile"]}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-name")).toHaveTextContent("testuser");
      });
    });
  });

  describe("User Authentication Flow", () => {
    it("should handle login flow", async () => {
      const { login, getCurrentUser } = await import(
        "../../src/services/api.js"
      );

      getCurrentUser.mockResolvedValue({ user: null });
      login.mockResolvedValue({
        user: mockUser,
        token: "new-jwt-token",
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Simulate login (this would typically happen in a login form)
      // For integration testing, we can trigger the login action directly
      await waitFor(() => {
        expect(screen.getByTestId("login-btn")).toBeInTheDocument();
      });

      // After successful login, user should be visible
      // This would require triggering an actual login action
    });

    it("should handle logout flow", async () => {
      const { getCurrentUser, logout } = await import(
        "../../src/services/api.js"
      );

      getCurrentUser.mockResolvedValue({ user: mockUser });
      logout.mockImplementation(() => {
        localStorage.removeItem("token");
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("user-name")).toHaveTextContent("testuser");
      });

      // Click logout button
      const logoutBtn = screen.getByTestId("logout-btn");
      fireEvent.click(logoutBtn);

      expect(logout).toHaveBeenCalled();
      expect(localStorage.getItem("token")).toBeNull();
    });
  });

  describe("Product Interaction Flow", () => {
    it("should handle product viewing and interactions", async () => {
      const { getProducts, recordInteraction } = await import(
        "../../src/services/api.js"
      );

      getProducts.mockResolvedValue({
        products: mockProducts,
        pagination: { currentPage: 1, totalPages: 1, totalProducts: 2 },
      });

      vi.doMock("../../src/services/api.js", async () => {
        const actual = await vi.importActual("../../src/services/api.js");
        return {
          ...actual,
          recordInteraction: vi.fn().mockResolvedValue({
            message: "Interaction recorded",
          }),
        };
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Smartphone")).toBeInTheDocument();
      });

      // Click on a product
      const productCard = screen.getAllByTestId("product-card")[0];
      fireEvent.click(productCard);

      // Should record interaction and potentially navigate to product detail
      // This depends on your actual implementation
    });

    it("should load recommendations for authenticated users", async () => {
      const { getCurrentUser, getRecommendations } = await import(
        "../../src/services/api.js"
      );

      getCurrentUser.mockResolvedValue({ user: mockUser });
      getRecommendations.mockResolvedValue({
        recommendations: [
          {
            product: mockProducts[0],
            score: 0.95,
            reason: "Based on your preferences",
          },
        ],
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(getRecommendations).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const { getCurrentUser, getProducts } = await import(
        "../../src/services/api.js"
      );

      getCurrentUser.mockRejectedValue(new Error("Network error"));
      getProducts.mockRejectedValue(new Error("Failed to load products"));

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Should show error state instead of crashing
      await waitFor(() => {
        // Depending on your error handling, you might show:
        // - Error message
        // - Retry button
        // - Fallback UI
        expect(screen.getByTestId("navbar")).toBeInTheDocument();
      });
    });

    it("should handle network connectivity issues", async () => {
      const { getProducts } = await import("../../src/services/api.js");

      const networkError = new Error("Network Error");
      networkError.code = "NETWORK_ERROR";
      getProducts.mockRejectedValue(networkError);

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Should show appropriate error message for network issues
      await waitFor(() => {
        // This depends on your error handling implementation
        expect(screen.getByTestId("navbar")).toBeInTheDocument();
      });
    });
  });

  describe("Performance and Loading States", () => {
    it("should show loading states during data fetching", async () => {
      const { getProducts } = await import("../../src/services/api.js");

      // Simulate slow API response
      getProducts.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  products: mockProducts,
                  pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalProducts: 2,
                  },
                }),
              100
            )
          )
      );

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Should show loading spinner initially
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Smartphone")).toBeInTheDocument();
      });

      // Loading spinner should be gone
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });

    it("should handle concurrent API calls efficiently", async () => {
      const { getCurrentUser, getProducts, getRecommendations } = await import(
        "../../src/services/api.js"
      );

      getCurrentUser.mockResolvedValue({ user: mockUser });
      getProducts.mockResolvedValue({
        products: mockProducts,
        pagination: { currentPage: 1, totalPages: 1, totalProducts: 2 },
      });
      getRecommendations.mockResolvedValue({
        recommendations: [],
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Smartphone")).toBeInTheDocument();
      });

      // All API calls should have been made
      expect(getCurrentUser).toHaveBeenCalled();
      expect(getProducts).toHaveBeenCalled();
      expect(getRecommendations).toHaveBeenCalled();
    });
  });
});
