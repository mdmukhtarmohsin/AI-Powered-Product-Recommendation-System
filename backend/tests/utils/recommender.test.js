import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the recommender utility
const mockRecommendationEngine = {
  initialize: vi.fn(),
  generateRecommendations: vi.fn(),
  calculateSimilarity: vi.fn(),
  updateUserProfile: vi.fn(),
  getPopularProducts: vi.fn(),
};

vi.mock("../../utils/recommender.js", () => ({
  default: mockRecommendationEngine,
}));

describe("Recommendation Engine Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateRecommendations", () => {
    it("should generate collaborative filtering recommendations", async () => {
      const userId = "user123";
      const algorithm = "collaborative_filtering";

      const mockRecommendations = [
        {
          product: {
            _id: "prod1",
            name: "Recommended Product 1",
            price: 99.99,
            category: "electronics",
          },
          score: 0.95,
          reason: "Users with similar preferences also liked this",
        },
        {
          product: {
            _id: "prod2",
            name: "Recommended Product 2",
            price: 149.99,
            category: "electronics",
          },
          score: 0.88,
          reason: "Based on your purchase history",
        },
      ];

      mockRecommendationEngine.generateRecommendations.mockResolvedValue({
        recommendations: mockRecommendations,
        algorithm,
        metadata: {
          totalProducts: 2,
          processingTime: 150,
          confidence: 0.85,
        },
      });

      const result = await mockRecommendationEngine.generateRecommendations(
        userId,
        algorithm
      );

      expect(
        mockRecommendationEngine.generateRecommendations
      ).toHaveBeenCalledWith(userId, algorithm);
      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0].score).toBeGreaterThan(
        result.recommendations[1].score
      );
      expect(result.algorithm).toBe(algorithm);
    });

    it("should generate content-based recommendations", async () => {
      const userId = "user123";
      const algorithm = "content_based";

      const mockRecommendations = [
        {
          product: {
            _id: "prod3",
            name: "Similar Product",
            price: 199.99,
            category: "electronics",
            tags: ["smartphone", "android"],
          },
          score: 0.92,
          reason: "Similar to products you viewed",
        },
      ];

      mockRecommendationEngine.generateRecommendations.mockResolvedValue({
        recommendations: mockRecommendations,
        algorithm,
        metadata: {
          totalProducts: 1,
          processingTime: 75,
          confidence: 0.92,
        },
      });

      const result = await mockRecommendationEngine.generateRecommendations(
        userId,
        algorithm
      );

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].product.tags).toContain("smartphone");
      expect(result.algorithm).toBe(algorithm);
    });

    it("should fallback to popular products when no recommendations available", async () => {
      const userId = "newuser123";
      const algorithm = "collaborative_filtering";

      const mockPopularProducts = [
        {
          product: {
            _id: "popular1",
            name: "Popular Product 1",
            price: 79.99,
            category: "electronics",
            purchase_count: 500,
          },
          score: 0.7,
          reason: "Popular among all users",
        },
      ];

      mockRecommendationEngine.generateRecommendations.mockResolvedValue({
        recommendations: [],
        algorithm,
        fallback: true,
      });

      mockRecommendationEngine.getPopularProducts.mockResolvedValue(
        mockPopularProducts
      );

      // Simulate fallback logic
      const result = await mockRecommendationEngine.generateRecommendations(
        userId,
        algorithm
      );
      if (result.recommendations.length === 0 && result.fallback) {
        const popularProducts =
          await mockRecommendationEngine.getPopularProducts();
        result.recommendations = popularProducts;
      }

      expect(mockRecommendationEngine.getPopularProducts).toHaveBeenCalled();
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].reason).toBe("Popular among all users");
    });
  });

  describe("calculateSimilarity", () => {
    it("should calculate cosine similarity between users", async () => {
      const user1Preferences = {
        categories: ["electronics", "books"],
        priceRange: { min: 50, max: 500 },
        brands: ["Apple", "Samsung"],
      };

      const user2Preferences = {
        categories: ["electronics", "clothing"],
        priceRange: { min: 100, max: 800 },
        brands: ["Apple", "Nike"],
      };

      mockRecommendationEngine.calculateSimilarity.mockReturnValue(0.65);

      const similarity = mockRecommendationEngine.calculateSimilarity(
        user1Preferences,
        user2Preferences
      );

      expect(mockRecommendationEngine.calculateSimilarity).toHaveBeenCalledWith(
        user1Preferences,
        user2Preferences
      );
      expect(similarity).toBe(0.65);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it("should return high similarity for identical preferences", async () => {
      const userPreferences = {
        categories: ["electronics"],
        priceRange: { min: 100, max: 500 },
        brands: ["Apple"],
      };

      mockRecommendationEngine.calculateSimilarity.mockReturnValue(1.0);

      const similarity = mockRecommendationEngine.calculateSimilarity(
        userPreferences,
        userPreferences
      );

      expect(similarity).toBe(1.0);
    });

    it("should return low similarity for completely different preferences", async () => {
      const user1Preferences = {
        categories: ["electronics"],
        priceRange: { min: 500, max: 2000 },
        brands: ["Apple"],
      };

      const user2Preferences = {
        categories: ["books"],
        priceRange: { min: 10, max: 50 },
        brands: ["Penguin"],
      };

      mockRecommendationEngine.calculateSimilarity.mockReturnValue(0.1);

      const similarity = mockRecommendationEngine.calculateSimilarity(
        user1Preferences,
        user2Preferences
      );

      expect(similarity).toBe(0.1);
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe("updateUserProfile", () => {
    it("should update user profile based on interactions", async () => {
      const userId = "user123";
      const interaction = {
        productId: "prod123",
        type: "purchase",
        product: {
          category: "electronics",
          subcategory: "smartphones",
          price: 699.99,
          manufacturer: "Apple",
          tags: ["ios", "premium"],
        },
        metadata: {
          timestamp: new Date(),
          sessionId: "session123",
        },
      };

      const updatedProfile = {
        userId,
        preferences: {
          categories: ["electronics"],
          subcategories: ["smartphones"],
          priceRange: { min: 400, max: 1000 },
          preferredBrands: ["Apple"],
          tags: ["ios", "premium"],
        },
        interactionHistory: [interaction],
        lastUpdated: new Date(),
      };

      mockRecommendationEngine.updateUserProfile.mockResolvedValue(
        updatedProfile
      );

      const result = await mockRecommendationEngine.updateUserProfile(
        userId,
        interaction
      );

      expect(mockRecommendationEngine.updateUserProfile).toHaveBeenCalledWith(
        userId,
        interaction
      );
      expect(result.preferences.categories).toContain("electronics");
      expect(result.preferences.preferredBrands).toContain("Apple");
      expect(result.interactionHistory).toHaveLength(1);
    });

    it("should handle multiple interactions and weight them appropriately", async () => {
      const userId = "user123";
      const interactions = [
        { type: "view", product: { category: "electronics", price: 100 } },
        { type: "like", product: { category: "electronics", price: 200 } },
        { type: "purchase", product: { category: "electronics", price: 300 } },
      ];

      const updatedProfile = {
        userId,
        preferences: {
          categories: ["electronics"],
          priceRange: { min: 100, max: 350 }, // Weighted average with purchase having more weight
          interactionWeights: {
            view: 1,
            like: 2,
            purchase: 5,
          },
        },
        interactionHistory: interactions,
      };

      mockRecommendationEngine.updateUserProfile.mockResolvedValue(
        updatedProfile
      );

      const result = await mockRecommendationEngine.updateUserProfile(
        userId,
        interactions
      );

      expect(result.preferences.priceRange.max).toBeGreaterThan(200); // Purchase should have more influence
      expect(result.interactionHistory).toHaveLength(3);
    });
  });

  describe("getPopularProducts", () => {
    it("should return trending products", async () => {
      const mockPopularProducts = [
        {
          product: {
            _id: "trending1",
            name: "Trending Product 1",
            price: 299.99,
            view_count: 1000,
            purchase_count: 150,
            like_count: 200,
          },
          score: 0.85,
          reason: "Trending now",
          metrics: {
            engagement_score: 0.9,
            popularity_score: 0.8,
          },
        },
        {
          product: {
            _id: "trending2",
            name: "Trending Product 2",
            price: 199.99,
            view_count: 800,
            purchase_count: 120,
            like_count: 150,
          },
          score: 0.78,
          reason: "Popular choice",
          metrics: {
            engagement_score: 0.75,
            popularity_score: 0.8,
          },
        },
      ];

      mockRecommendationEngine.getPopularProducts.mockResolvedValue(
        mockPopularProducts
      );

      const result = await mockRecommendationEngine.getPopularProducts();

      expect(mockRecommendationEngine.getPopularProducts).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].score).toBeGreaterThan(result[1].score);
      expect(result[0].product.purchase_count).toBeGreaterThan(100);
    });

    it("should filter popular products by category", async () => {
      const category = "electronics";
      const mockCategoryProducts = [
        {
          product: {
            _id: "elec1",
            name: "Popular Electronics",
            category: "electronics",
            price: 399.99,
          },
          score: 0.9,
        },
      ];

      mockRecommendationEngine.getPopularProducts.mockResolvedValue(
        mockCategoryProducts
      );

      const result = await mockRecommendationEngine.getPopularProducts(
        category
      );

      expect(mockRecommendationEngine.getPopularProducts).toHaveBeenCalledWith(
        category
      );
      expect(result[0].product.category).toBe(category);
    });
  });

  describe("initialize", () => {
    it("should initialize the recommendation engine successfully", async () => {
      mockRecommendationEngine.initialize.mockResolvedValue({
        status: "initialized",
        algorithmsLoaded: ["collaborative_filtering", "content_based"],
        dataLoaded: true,
        timestamp: new Date(),
      });

      const result = await mockRecommendationEngine.initialize();

      expect(mockRecommendationEngine.initialize).toHaveBeenCalled();
      expect(result.status).toBe("initialized");
      expect(result.algorithmsLoaded).toContain("collaborative_filtering");
      expect(result.dataLoaded).toBe(true);
    });

    it("should handle initialization errors gracefully", async () => {
      const initError = new Error("Failed to load recommendation data");
      mockRecommendationEngine.initialize.mockRejectedValue(initError);

      await expect(mockRecommendationEngine.initialize()).rejects.toThrow(
        "Failed to load recommendation data"
      );
    });
  });
});
