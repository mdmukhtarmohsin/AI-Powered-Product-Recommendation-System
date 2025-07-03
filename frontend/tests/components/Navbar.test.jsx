import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Navbar from "../../src/components/Navbar.jsx";

// Mock React Router
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/" }),
  };
});

// Mock authentication store (assuming Zustand)
const mockAuthStore = {
  user: null,
  isAuthenticated: false,
  logout: vi.fn(),
};

vi.mock("../../src/store/authStore.js", () => ({
  useAuthStore: () => mockAuthStore,
}));

const NavbarWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("Navbar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.user = null;
    mockAuthStore.isAuthenticated = false;
  });

  it("should render brand logo and navigation links", () => {
    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    expect(screen.getByText("AI Recommendations")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("should show login and register buttons when not authenticated", () => {
    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Register")).toBeInTheDocument();
  });

  it("should show user menu when authenticated", () => {
    mockAuthStore.user = {
      id: "user123",
      username: "testuser",
      email: "test@example.com",
    };
    mockAuthStore.isAuthenticated = true;

    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("should navigate to login page when login button is clicked", async () => {
    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    const loginButton = screen.getByText("Login");
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("should navigate to register page when register button is clicked", async () => {
    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    const registerButton = screen.getByText("Register");
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/register");
    });
  });

  it("should call logout when logout button is clicked", async () => {
    mockAuthStore.user = {
      id: "user123",
      username: "testuser",
      email: "test@example.com",
    };
    mockAuthStore.isAuthenticated = true;

    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    const logoutButton = screen.getByText("Logout");
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockAuthStore.logout).toHaveBeenCalled();
    });
  });

  it("should show search bar", () => {
    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    const searchInput = screen.getByPlaceholderText("Search products...");
    expect(searchInput).toBeInTheDocument();
  });

  it("should handle search input and submission", async () => {
    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    const searchInput = screen.getByPlaceholderText("Search products...");
    fireEvent.change(searchInput, { target: { value: "smartphone" } });

    expect(searchInput.value).toBe("smartphone");

    // Simulate form submission or search button click
    const searchButton = screen.getByTestId("search-button");
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/products?search=smartphone");
    });
  });

  it("should show cart icon with item count", () => {
    // Mock cart store if it exists
    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    const cartIcon = screen.getByTestId("cart-icon");
    expect(cartIcon).toBeInTheDocument();
  });

  it("should highlight active navigation link", () => {
    // Mock useLocation to return current path
    vi.doMock("react-router-dom", async () => {
      const actual = await vi.importActual("react-router-dom");
      return {
        ...actual,
        useLocation: () => ({ pathname: "/products" }),
      };
    });

    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    const productsLink = screen.getByText("Products");
    expect(productsLink).toHaveClass("active"); // Assuming active links have this class
  });

  it("should be responsive and show mobile menu toggle", () => {
    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    const mobileMenuToggle = screen.getByTestId("mobile-menu-toggle");
    expect(mobileMenuToggle).toBeInTheDocument();
  });

  it("should toggle mobile menu when menu button is clicked", async () => {
    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    const mobileMenuToggle = screen.getByTestId("mobile-menu-toggle");
    fireEvent.click(mobileMenuToggle);

    // Mobile menu should be visible
    await waitFor(() => {
      const mobileMenu = screen.getByTestId("mobile-menu");
      expect(mobileMenu).toBeVisible();
    });
  });

  it("should show notifications dropdown when user is authenticated", () => {
    mockAuthStore.user = {
      id: "user123",
      username: "testuser",
      email: "test@example.com",
    };
    mockAuthStore.isAuthenticated = true;

    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    const notificationIcon = screen.getByTestId("notification-icon");
    expect(notificationIcon).toBeInTheDocument();
  });

  it("should handle user avatar click to show dropdown", async () => {
    mockAuthStore.user = {
      id: "user123",
      username: "testuser",
      email: "test@example.com",
    };
    mockAuthStore.isAuthenticated = true;

    render(
      <NavbarWrapper>
        <Navbar />
      </NavbarWrapper>
    );

    const userAvatar = screen.getByTestId("user-avatar");
    fireEvent.click(userAvatar);

    await waitFor(() => {
      const dropdown = screen.getByTestId("user-dropdown");
      expect(dropdown).toBeVisible();
    });
  });
});
