import Product from "../models/Product.js";
import recommendationEngine from "../utils/recommender.js";

// Get all products with pagination and filtering
export const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      subcategory,
      minPrice,
      maxPrice,
      search,
      sortBy = "product_name",
      sortOrder = "asc",
      featured,
      onSale,
    } = req.query;

    // Build filter object
    const filter = {};

    if (category) {
      filter.category = new RegExp(category, "i");
    }

    if (subcategory) {
      filter.subcategory = new RegExp(subcategory, "i");
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$or = [
        { product_name: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { manufacturer: new RegExp(search, "i") },
      ];
    }

    if (featured === "true") {
      filter.is_featured = true;
    }

    if (onSale === "true") {
      filter.is_on_sale = true;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: skip + products.length < totalCount,
        hasPrev: page > 1,
      },
      filters: {
        category,
        subcategory,
        minPrice,
        maxPrice,
        search,
        featured,
        onSale,
      },
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      error: "Failed to fetch products",
      message: "An error occurred while fetching products",
    });
  }
};

// Get single product by ID
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ product_id: parseInt(id) });

    if (!product) {
      return res.status(404).json({
        error: "Product not found",
        message: "Product with the specified ID was not found",
      });
    }

    // Track product view if user is authenticated
    if (req.user) {
      await recommendationEngine.updateUserInteraction(
        req.user._id.toString(),
        product.product_id,
        "view"
      );
    }

    res.json({ product });
  } catch (error) {
    console.error("Get product by ID error:", error);
    res.status(500).json({
      error: "Failed to fetch product",
      message: "An error occurred while fetching the product",
    });
  }
};

// Get featured products
export const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const products = await Product.find({ is_featured: true })
      .sort({ rating: -1, view_count: -1 })
      .limit(parseInt(limit));

    res.json({
      products,
      count: products.length,
    });
  } catch (error) {
    console.error("Get featured products error:", error);
    res.status(500).json({
      error: "Failed to fetch featured products",
      message: "An error occurred while fetching featured products",
    });
  }
};

// Get products on sale
export const getSaleProducts = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;

    const skip = (page - 1) * limit;
    const products = await Product.find({ is_on_sale: true })
      .sort({ sale_price: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Product.countDocuments({ is_on_sale: true });

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: skip + products.length < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get sale products error:", error);
    res.status(500).json({
      error: "Failed to fetch sale products",
      message: "An error occurred while fetching sale products",
    });
  }
};

// Get product categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    const categoriesWithSubcategories = await Promise.all(
      categories.map(async (category) => {
        const subcategories = await Product.distinct("subcategory", {
          category,
        });
        return {
          category,
          subcategories,
        };
      })
    );

    res.json({
      categories: categoriesWithSubcategories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      error: "Failed to fetch categories",
      message: "An error occurred while fetching categories",
    });
  }
};

// Track user interaction with product
export const trackInteraction = async (req, res) => {
  try {
    const { productId } = req.params;
    const { type, rating } = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to track interactions",
      });
    }

    const validTypes = ["view", "like", "cart_add", "purchase"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: "Invalid interaction type",
        message: `Interaction type must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Verify product exists
    const product = await Product.findOne({ product_id: parseInt(productId) });
    if (!product) {
      return res.status(404).json({
        error: "Product not found",
        message: "Product with the specified ID was not found",
      });
    }

    // Update user interaction and recommendation engine
    await recommendationEngine.updateUserInteraction(
      req.user._id.toString(),
      parseInt(productId),
      type,
      rating
    );

    res.json({
      message: "Interaction tracked successfully",
      interaction: {
        productId: parseInt(productId),
        type,
        rating,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("Track interaction error:", error);
    res.status(500).json({
      error: "Failed to track interaction",
      message: "An error occurred while tracking the interaction",
    });
  }
};

// Get product recommendations
export const getProductRecommendations = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 10 } = req.query;

    // Verify product exists
    const product = await Product.findOne({ product_id: parseInt(productId) });
    if (!product) {
      return res.status(404).json({
        error: "Product not found",
        message: "Product with the specified ID was not found",
      });
    }

    // Get content-based recommendations for this specific product
    const recommendations =
      await recommendationEngine.getContentBasedRecommendations(
        req.user ? req.user._id.toString() : null,
        parseInt(productId),
        parseInt(limit)
      );

    res.json({
      recommendations,
      count: recommendations.length,
      basedOn: {
        productId: parseInt(productId),
        productName: product.product_name,
      },
    });
  } catch (error) {
    console.error("Get product recommendations error:", error);
    res.status(500).json({
      error: "Failed to get recommendations",
      message: "An error occurred while fetching recommendations",
    });
  }
};

// Search products with advanced features
export const searchProducts = async (req, res) => {
  try {
    const {
      q,
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      minRating,
      sortBy = "relevance",
    } = req.query;

    if (!q) {
      return res.status(400).json({
        error: "Search query required",
        message: "Please provide a search query",
      });
    }

    // Build search filter
    const filter = {
      $or: [
        { product_name: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { manufacturer: new RegExp(q, "i") },
        { category: new RegExp(q, "i") },
        { subcategory: new RegExp(q, "i") },
      ],
    };

    // Add additional filters
    if (category) {
      filter.category = new RegExp(category, "i");
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case "price_low":
        sort.price = 1;
        break;
      case "price_high":
        sort.price = -1;
        break;
      case "rating":
        sort.rating = -1;
        break;
      case "newest":
        sort.release_date = -1;
        break;
      case "popular":
        sort.view_count = -1;
        break;
      default:
        sort.product_name = 1;
    }

    const skip = (page - 1) * limit;
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Product.countDocuments(filter);

    res.json({
      products,
      query: q,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: skip + products.length < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({
      error: "Search failed",
      message: "An error occurred while searching products",
    });
  }
};
