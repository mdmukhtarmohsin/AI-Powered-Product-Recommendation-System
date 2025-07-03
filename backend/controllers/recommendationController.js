import recommendationEngine from "../utils/recommender.js";
import Product from "../models/Product.js";

// Get personalized recommendations for authenticated user
export const getUserRecommendations = async (req, res) => {
  try {
    const { type = "hybrid", limit = 10 } = req.query;

    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to get personalized recommendations",
      });
    }

    let recommendations = [];

    switch (type) {
      case "content":
        recommendations =
          await recommendationEngine.getContentBasedRecommendations(
            req.user._id.toString(),
            null,
            parseInt(limit)
          );
        break;
      case "collaborative":
        recommendations =
          await recommendationEngine.getCollaborativeRecommendations(
            req.user._id.toString(),
            parseInt(limit)
          );
        break;
      case "hybrid":
      default:
        recommendations = await recommendationEngine.getHybridRecommendations(
          req.user._id.toString(),
          parseInt(limit)
        );
        break;
    }

    res.json({
      recommendations,
      count: recommendations.length,
      type,
      userId: req.user._id,
    });
  } catch (error) {
    console.error("Get user recommendations error:", error);
    res.status(500).json({
      error: "Failed to get recommendations",
      message: "An error occurred while fetching personalized recommendations",
    });
  }
};

// Get trending products (fallback for non-authenticated users)
export const getTrendingProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recommendations =
      await recommendationEngine.getFallbackRecommendations(parseInt(limit));

    res.json({
      recommendations,
      count: recommendations.length,
      type: "trending",
    });
  } catch (error) {
    console.error("Get trending products error:", error);
    res.status(500).json({
      error: "Failed to get trending products",
      message: "An error occurred while fetching trending products",
    });
  }
};

// Get recommendations based on user's favorite categories
export const getCategoryBasedRecommendations = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    if (
      !req.user ||
      !req.user.preferences.favoriteCategories ||
      req.user.preferences.favoriteCategories.length === 0
    ) {
      return res.status(400).json({
        error: "No favorite categories",
        message: "Please set your favorite categories in preferences first",
      });
    }

    const favoriteCategories = req.user.preferences.favoriteCategories;
    const priceRange = req.user.preferences.priceRange;

    // Build filter for user's preferences
    const filter = {
      category: { $in: favoriteCategories },
    };

    if (
      priceRange &&
      priceRange.min !== undefined &&
      priceRange.max !== undefined
    ) {
      filter.price = {
        $gte: priceRange.min,
        $lte: priceRange.max,
      };
    }

    // Get products from favorite categories within price range
    const products = await Product.find(filter)
      .sort({ rating: -1, view_count: -1, is_featured: -1 })
      .limit(parseInt(limit));

    const recommendations = products.map((product) => ({
      ...product.toObject(),
      similarity_score: product.rating / 5,
      recommendation_type: "category_based",
    }));

    res.json({
      recommendations,
      count: recommendations.length,
      type: "category_based",
      basedOn: {
        favoriteCategories,
        priceRange,
      },
    });
  } catch (error) {
    console.error("Get category-based recommendations error:", error);
    res.status(500).json({
      error: "Failed to get category-based recommendations",
      message:
        "An error occurred while fetching category-based recommendations",
    });
  }
};

// Get similar users' liked products
export const getSimilarUsersRecommendations = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to get similar users recommendations",
      });
    }

    const recommendations =
      await recommendationEngine.getCollaborativeRecommendations(
        req.user._id.toString(),
        parseInt(limit)
      );

    res.json({
      recommendations,
      count: recommendations.length,
      type: "similar_users",
      userId: req.user._id,
    });
  } catch (error) {
    console.error("Get similar users recommendations error:", error);
    res.status(500).json({
      error: "Failed to get similar users recommendations",
      message: "An error occurred while fetching similar users recommendations",
    });
  }
};

// Initialize or retrain recommendation engine
export const initializeRecommendationEngine = async (req, res) => {
  try {
    await recommendationEngine.initialize();

    res.json({
      message: "Recommendation engine initialized successfully",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Initialize recommendation engine error:", error);
    res.status(500).json({
      error: "Failed to initialize recommendation engine",
      message: "An error occurred while initializing the recommendation engine",
    });
  }
};

// Get recommendation statistics
export const getRecommendationStats = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to view recommendation statistics",
      });
    }

    const user = req.user;
    const totalInteractions = user.interactions.length;

    // Count interactions by type
    const interactionStats = user.interactions.reduce((stats, interaction) => {
      stats[interaction.type] = (stats[interaction.type] || 0) + 1;
      return stats;
    }, {});

    // Get unique products interacted with
    const uniqueProducts = new Set(user.interactions.map((i) => i.productId))
      .size;

    // Get favorite categories from interactions
    const categoryInteractions = {};
    for (const interaction of user.interactions) {
      const product = await Product.findOne({
        product_id: interaction.productId,
      });
      if (product) {
        categoryInteractions[product.category] =
          (categoryInteractions[product.category] || 0) + 1;
      }
    }

    const topCategories = Object.entries(categoryInteractions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    res.json({
      userId: user._id,
      totalInteractions,
      uniqueProductsInteracted: uniqueProducts,
      interactionsByType: interactionStats,
      topCategories,
      preferences: user.preferences,
      memberSince: user.createdAt,
    });
  } catch (error) {
    console.error("Get recommendation stats error:", error);
    res.status(500).json({
      error: "Failed to get recommendation statistics",
      message: "An error occurred while fetching recommendation statistics",
    });
  }
};
