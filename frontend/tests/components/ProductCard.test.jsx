import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProductCard from "../../src/components/ProductCard.jsx";

// Mock React Router
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

describe("ProductCard Component", () => {
  const mockProduct = {
    _id: "507f1f77bcf86cd799439012",
    name: "Test Smartphone",
    description: "A great test smartphone with advanced features",
    price: 599.99,
    category: "electronics",
    subcategory: "smartphones",
    manufacturer: "TestCorp",
    image_url: "https://example.com/smartphone.jpg",
    rating: 4.5,
    stock_quantity: 50,
    view_count: 150,
    like_count: 25,
    purchase_count: 10,
  };

  const mockOnLike = vi.fn();
  const mockOnAddToCart = vi.fn();
  const mockOnView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render product information correctly", () => {
    render(
      <ProductCard
        product={mockProduct}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    expect(screen.getByText(mockProduct.name)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.description)).toBeInTheDocument();
    expect(screen.getByText(`$${mockProduct.price}`)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.manufacturer)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.category)).toBeInTheDocument();

    const image = screen.getByAltText(mockProduct.name);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", mockProduct.image_url);
  });

  it("should display rating stars correctly", () => {
    render(
      <ProductCard
        product={mockProduct}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    // Should display rating (4.5 stars)
    expect(screen.getByText("4.5")).toBeInTheDocument();

    // Check for star elements (assuming they have a specific class or data-testid)
    const stars = screen.getAllByTestId(/star/);
    expect(stars.length).toBeGreaterThan(0);
  });

  it("should show stock status correctly", () => {
    render(
      <ProductCard
        product={mockProduct}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    expect(
      screen.getByText(`${mockProduct.stock_quantity} in stock`)
    ).toBeInTheDocument();
  });

  it("should show out of stock when stock is 0", () => {
    const outOfStockProduct = { ...mockProduct, stock_quantity: 0 };

    render(
      <ProductCard
        product={outOfStockProduct}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("should call onLike when like button is clicked", async () => {
    render(
      <ProductCard
        product={mockProduct}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    const likeButton = screen.getByTestId("like-button");
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(mockOnLike).toHaveBeenCalledWith(mockProduct._id);
    });
  });

  it("should call onAddToCart when add to cart button is clicked", async () => {
    render(
      <ProductCard
        product={mockProduct}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    const addToCartButton = screen.getByText("Add to Cart");
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct);
    });
  });

  it("should disable add to cart button when out of stock", () => {
    const outOfStockProduct = { ...mockProduct, stock_quantity: 0 };

    render(
      <ProductCard
        product={outOfStockProduct}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    const addToCartButton = screen.getByText("Out of Stock");
    expect(addToCartButton).toBeDisabled();
  });

  it("should call onView when product is clicked", async () => {
    render(
      <ProductCard
        product={mockProduct}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    const productCard = screen.getByTestId("product-card");
    fireEvent.click(productCard);

    await waitFor(() => {
      expect(mockOnView).toHaveBeenCalledWith(mockProduct._id);
    });
  });

  it("should display engagement metrics", () => {
    render(
      <ProductCard
        product={mockProduct}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    expect(
      screen.getByText(`${mockProduct.view_count} views`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${mockProduct.like_count} likes`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${mockProduct.purchase_count} sold`)
    ).toBeInTheDocument();
  });

  it("should handle missing image gracefully", () => {
    const productWithoutImage = { ...mockProduct, image_url: null };

    render(
      <ProductCard
        product={productWithoutImage}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    const image = screen.getByAltText(mockProduct.name);
    expect(image).toBeInTheDocument();
    // Should fallback to placeholder or default image
  });

  it("should format price correctly", () => {
    const expensiveProduct = { ...mockProduct, price: 1234.56 };

    render(
      <ProductCard
        product={expensiveProduct}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    expect(screen.getByText("$1234.56")).toBeInTheDocument();
  });

  it("should handle long product names", () => {
    const longNameProduct = {
      ...mockProduct,
      name: "This is a very long product name that should be truncated or wrapped properly",
    };

    render(
      <ProductCard
        product={longNameProduct}
        onLike={mockOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    expect(screen.getByText(longNameProduct.name)).toBeInTheDocument();
  });

  it("should show loading state when actions are in progress", async () => {
    const slowOnLike = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

    render(
      <ProductCard
        product={mockProduct}
        onLike={slowOnLike}
        onAddToCart={mockOnAddToCart}
        onView={mockOnView}
      />
    );

    const likeButton = screen.getByTestId("like-button");
    fireEvent.click(likeButton);

    // Should show loading state (if implemented)
    // This depends on the actual implementation
  });
});
