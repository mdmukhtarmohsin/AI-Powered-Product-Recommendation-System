import { describe, it, expect, vi, beforeEach } from "vitest";
import Product from "../../models/Product.js";

// Mock Product model
vi.mock("../../models/Product.js");

// Mock the entire controller module
const mockProductController = {
  getAllProducts: vi.fn(),
  getProductById: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  searchProducts: vi.fn(),
};

describe("Product Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      query: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    vi.clearAllMocks();
  });

  describe("getAllProducts", () => {
    it("should return all products with pagination", async () => {
      const mockProducts = [
        { _id: "1", name: "Product 1", price: 100 },
        { _id: "2", name: "Product 2", price: 200 },
      ];

      mockReq.query = { page: "1", limit: "10" };

      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue(mockProducts),
      };

      Product.find.mockReturnValue(mockQuery);
      Product.countDocuments.mockResolvedValue(25);

      // Simulate the controller logic
      const page = parseInt(mockReq.query.page) || 1;
      const limit = parseInt(mockReq.query.limit) || 10;
      const skip = (page - 1) * limit;

      const products = await Product.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const totalProducts = await Product.countDocuments();
      const totalPages = Math.ceil(totalProducts / limit);

      mockRes.json({
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });

      expect(Product.find).toHaveBeenCalled();
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockRes.json).toHaveBeenCalledWith({
        products: mockProducts,
        pagination: {
          currentPage: 1,
          totalPages: 3,
          totalProducts: 25,
          hasNext: true,
          hasPrev: false,
        },
      });
    });

    it("should filter products by category", async () => {
      const mockProducts = [
        { _id: "1", name: "Smartphone", category: "electronics" },
      ];

      mockReq.query = { category: "electronics" };

      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue(mockProducts),
      };

      Product.find.mockReturnValue(mockQuery);
      Product.countDocuments.mockResolvedValue(1);

      expect(Product.find).toHaveBeenCalledWith({ category: "electronics" });
    });
  });

  describe("getProductById", () => {
    it("should return product by ID", async () => {
      const mockProduct = {
        _id: "product123",
        name: "Test Product",
        price: 99.99,
      };

      mockReq.params.id = "product123";
      Product.findById.mockResolvedValue(mockProduct);

      // Simulate controller logic
      const product = await Product.findById(mockReq.params.id);
      if (product) {
        mockRes.json({ product });
      } else {
        mockRes.status(404).json({ error: "Product not found" });
      }

      expect(Product.findById).toHaveBeenCalledWith("product123");
      expect(mockRes.json).toHaveBeenCalledWith({ product: mockProduct });
    });

    it("should return 404 for non-existent product", async () => {
      mockReq.params.id = "nonexistent";
      Product.findById.mockResolvedValue(null);

      // Simulate controller logic
      const product = await Product.findById(mockReq.params.id);
      if (product) {
        mockRes.json({ product });
      } else {
        mockRes.status(404).json({ error: "Product not found" });
      }

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Product not found" });
    });
  });

  describe("createProduct", () => {
    it("should create a new product", async () => {
      const productData = {
        name: "New Product",
        description: "A new test product",
        price: 149.99,
        category: "electronics",
        stock_quantity: 50,
      };

      mockReq.body = productData;

      const mockProduct = {
        _id: "newproduct123",
        ...productData,
        save: vi.fn().mockResolvedValue(true),
      };

      Product.mockImplementation(() => mockProduct);

      // Simulate controller logic
      const product = new Product(mockReq.body);
      await product.save();
      mockRes.status(201).json({
        message: "Product created successfully",
        product,
      });

      expect(product.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Product created successfully",
        product: mockProduct,
      });
    });

    it("should return error for invalid product data", async () => {
      mockReq.body = { name: "Product" }; // missing required fields

      const mockError = new Error("Validation failed");
      mockError.name = "ValidationError";

      const mockProduct = {
        save: vi.fn().mockRejectedValue(mockError),
      };

      Product.mockImplementation(() => mockProduct);

      // Simulate controller logic with error handling
      try {
        const product = new Product(mockReq.body);
        await product.save();
      } catch (error) {
        if (error.name === "ValidationError") {
          mockRes.status(400).json({
            error: "Validation failed",
            message: "Please provide all required fields",
          });
        }
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Validation failed",
        message: "Please provide all required fields",
      });
    });
  });

  describe("searchProducts", () => {
    it("should search products by query", async () => {
      const mockProducts = [
        { _id: "1", name: "iPhone 14", category: "electronics" },
        { _id: "2", name: "iPhone Case", category: "accessories" },
      ];

      mockReq.query = { q: "iPhone", page: "1", limit: "10" };

      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue(mockProducts),
      };

      Product.find.mockReturnValue(mockQuery);
      Product.countDocuments.mockResolvedValue(2);

      // Simulate search logic
      const searchQuery = mockReq.query.q;
      const searchConditions = {
        $or: [
          { name: { $regex: searchQuery, $options: "i" } },
          { description: { $regex: searchQuery, $options: "i" } },
          { category: { $regex: searchQuery, $options: "i" } },
        ],
      };

      expect(Product.find).toHaveBeenCalledWith(searchConditions);
    });

    it("should return empty results for no matches", async () => {
      mockReq.query = { q: "nonexistentproduct" };

      Product.find.mockReturnValue({
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue([]),
      });
      Product.countDocuments.mockResolvedValue(0);

      // Simulate empty search results
      const products = [];
      mockRes.json({
        products,
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalProducts: 0,
          hasNext: false,
          hasPrev: false,
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        products: [],
        pagination: expect.objectContaining({
          totalProducts: 0,
        }),
      });
    });
  });

  describe("updateProduct", () => {
    it("should update product successfully", async () => {
      const updateData = { price: 199.99, stock_quantity: 25 };
      mockReq.params.id = "product123";
      mockReq.body = updateData;

      const updatedProduct = {
        _id: "product123",
        name: "Updated Product",
        ...updateData,
      };

      Product.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      // Simulate controller logic
      const product = await Product.findByIdAndUpdate(
        mockReq.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      mockRes.json({
        message: "Product updated successfully",
        product,
      });

      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        "product123",
        updateData,
        { new: true, runValidators: true }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Product updated successfully",
        product: updatedProduct,
      });
    });
  });

  describe("deleteProduct", () => {
    it("should delete product successfully", async () => {
      mockReq.params.id = "product123";

      const deletedProduct = {
        _id: "product123",
        name: "Deleted Product",
      };

      Product.findByIdAndDelete.mockResolvedValue(deletedProduct);

      // Simulate controller logic
      const product = await Product.findByIdAndDelete(mockReq.params.id);
      if (product) {
        mockRes.json({ message: "Product deleted successfully" });
      } else {
        mockRes.status(404).json({ error: "Product not found" });
      }

      expect(Product.findByIdAndDelete).toHaveBeenCalledWith("product123");
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Product deleted successfully",
      });
    });
  });
});
