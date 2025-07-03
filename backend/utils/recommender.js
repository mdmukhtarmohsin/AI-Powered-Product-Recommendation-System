import natural from "natural";
import Product from "../models/Product.js";
import User from "../models/User.js";

const TfIdf = natural.TfIdf;
const stemmer = natural.PorterStemmer;

class RecommendationEngine {
  constructor() {
    this.tfidf = new TfIdf();
    this.productFeatures = new Map();
    this.userItemMatrix = new Map();
  }

  // Initialize the recommendation engine with product data
  async initialize() {
    try {
      const products = await Product.find({});
      this.buildProductFeatures(products);
      await this.buildUserItemMatrix();
      console.log(
        "Recommendation engine initialized with",
        products.length,
        "products"
      );
    } catch (error) {
      console.error("Error initializing recommendation engine:", error);
    }
  }

  // Build TF-IDF features for products
  buildProductFeatures(products) {
    this.tfidf = new TfIdf();

    products.forEach((product) => {
      // Combine all text features for TF-IDF
      const textFeatures = [
        product.product_name,
        product.description,
        product.category,
        product.subcategory,
        product.manufacturer,
      ]
        .join(" ")
        .toLowerCase();

      // Add stemmed words to TF-IDF
      const stemmedText = textFeatures
        .split(" ")
        .map((word) => stemmer.stem(word))
        .join(" ");

      this.tfidf.addDocument(stemmedText);

      // Store additional features
      this.productFeatures.set(product.product_id, {
        category: product.category,
        subcategory: product.subcategory,
        price: product.price,
        rating: product.rating,
        is_featured: product.is_featured,
        is_on_sale: product.is_on_sale,
        manufacturer: product.manufacturer,
        textIndex: this.tfidf.documents.length - 1,
      });
    });
  }

  // Build user-item interaction matrix
  async buildUserItemMatrix() {
    try {
      const users = await User.find({}).select("_id interactions");

      users.forEach((user) => {
        const userInteractions = new Map();
        user.interactions.forEach((interaction) => {
          const weight = this.getInteractionWeight(interaction.type);
          const currentWeight =
            userInteractions.get(interaction.productId) || 0;
          userInteractions.set(interaction.productId, currentWeight + weight);
        });
        this.userItemMatrix.set(user._id.toString(), userInteractions);
      });
    } catch (error) {
      console.error("Error building user-item matrix:", error);
    }
  }

  // Get weight for different interaction types
  getInteractionWeight(type) {
    const weights = {
      view: 1,
      like: 3,
      cart_add: 5,
      purchase: 10,
    };
    return weights[type] || 1;
  }

  // Content-based filtering
  async getContentBasedRecommendations(userId, productId = null, limit = 10) {
    try {
      let targetProduct = null;

      if (productId) {
        // Recommend similar products to a specific product
        targetProduct = await Product.findOne({ product_id: productId });
      } else {
        // Recommend based on user's interaction history
        const user = await User.findById(userId);
        if (!user || user.interactions.length === 0) {
          return this.getFallbackRecommendations(limit);
        }

        // Find the most recent highly-weighted interaction
        const sortedInteractions = user.interactions
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .sort(
            (a, b) =>
              this.getInteractionWeight(b.type) -
              this.getInteractionWeight(a.type)
          );

        targetProduct = await Product.findOne({
          product_id: sortedInteractions[0].productId,
        });
      }

      if (!targetProduct) {
        return this.getFallbackRecommendations(limit);
      }

      const targetFeatures = this.productFeatures.get(targetProduct.product_id);
      if (!targetFeatures) {
        return this.getFallbackRecommendations(limit);
      }

      // Calculate similarity scores
      const similarities = [];
      const allProducts = await Product.find({
        product_id: { $ne: targetProduct.product_id },
      });

      for (const product of allProducts) {
        const similarity = this.calculateProductSimilarity(
          targetProduct.product_id,
          product.product_id
        );
        if (similarity > 0) {
          similarities.push({ product, similarity });
        }
      }

      // Sort by similarity and return top recommendations
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map((item) => ({
          ...item.product.toObject(),
          similarity_score: item.similarity,
          recommendation_type: "content_based",
        }));
    } catch (error) {
      console.error("Error in content-based recommendations:", error);
      return this.getFallbackRecommendations(limit);
    }
  }

  // Calculate similarity between two products
  calculateProductSimilarity(productId1, productId2) {
    const features1 = this.productFeatures.get(productId1);
    const features2 = this.productFeatures.get(productId2);

    if (!features1 || !features2) return 0;

    let similarity = 0;

    // Text similarity using TF-IDF cosine similarity
    const textSimilarity = this.tfidf.tfidf(
      features1.textIndex,
      features2.textIndex
    );
    similarity += textSimilarity * 0.4;

    // Category similarity
    if (features1.category === features2.category) {
      similarity += 0.3;
      if (features1.subcategory === features2.subcategory) {
        similarity += 0.1;
      }
    }

    // Price similarity (normalized)
    const priceDiff = Math.abs(features1.price - features2.price);
    const maxPrice = Math.max(features1.price, features2.price);
    const priceSimilarity = maxPrice > 0 ? 1 - priceDiff / maxPrice : 1;
    similarity += priceSimilarity * 0.1;

    // Rating similarity
    const ratingDiff = Math.abs(features1.rating - features2.rating);
    const ratingSimilarity = 1 - ratingDiff / 5;
    similarity += ratingSimilarity * 0.1;

    return Math.min(similarity, 1);
  }

  // Collaborative filtering
  async getCollaborativeRecommendations(userId, limit = 10) {
    try {
      const userInteractions = this.userItemMatrix.get(userId);
      if (!userInteractions || userInteractions.size === 0) {
        return this.getFallbackRecommendations(limit);
      }

      // Find similar users
      const similarUsers = this.findSimilarUsers(userId, 10);

      if (similarUsers.length === 0) {
        return this.getFallbackRecommendations(limit);
      }

      // Get recommendations based on similar users
      const recommendations = new Map();

      for (const { userId: similarUserId, similarity } of similarUsers) {
        const similarUserInteractions = this.userItemMatrix.get(similarUserId);

        if (similarUserInteractions) {
          for (const [productId, weight] of similarUserInteractions) {
            if (!userInteractions.has(productId)) {
              const currentScore = recommendations.get(productId) || 0;
              recommendations.set(
                productId,
                currentScore + weight * similarity
              );
            }
          }
        }
      }

      // Convert to array and sort
      const sortedRecommendations = Array.from(recommendations.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

      // Fetch product details
      const productIds = sortedRecommendations.map(([productId]) =>
        parseInt(productId)
      );
      const products = await Product.find({ product_id: { $in: productIds } });

      return sortedRecommendations
        .map(([productId, score]) => {
          const product = products.find(
            (p) => p.product_id === parseInt(productId)
          );
          return {
            ...product.toObject(),
            similarity_score: score,
            recommendation_type: "collaborative",
          };
        })
        .filter((item) => item.product_id);
    } catch (error) {
      console.error("Error in collaborative recommendations:", error);
      return this.getFallbackRecommendations(limit);
    }
  }

  // Find users similar to the given user
  findSimilarUsers(userId, limit = 10) {
    const userInteractions = this.userItemMatrix.get(userId);
    if (!userInteractions) return [];

    const similarities = [];

    for (const [otherUserId, otherInteractions] of this.userItemMatrix) {
      if (otherUserId !== userId && otherInteractions.size > 0) {
        const similarity = this.calculateUserSimilarity(
          userInteractions,
          otherInteractions
        );
        if (similarity > 0.1) {
          // Threshold for similarity
          similarities.push({ userId: otherUserId, similarity });
        }
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Calculate cosine similarity between users
  calculateUserSimilarity(interactions1, interactions2) {
    const commonItems = new Set();

    // Find common items
    for (const productId of interactions1.keys()) {
      if (interactions2.has(productId)) {
        commonItems.add(productId);
      }
    }

    if (commonItems.size === 0) return 0;

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const productId of commonItems) {
      const weight1 = interactions1.get(productId) || 0;
      const weight2 = interactions2.get(productId) || 0;

      dotProduct += weight1 * weight2;
      norm1 += weight1 * weight1;
      norm2 += weight2 * weight2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Hybrid recommendations combining content-based and collaborative
  async getHybridRecommendations(userId, limit = 10) {
    try {
      const [contentRecs, collabRecs] = await Promise.all([
        this.getContentBasedRecommendations(
          userId,
          null,
          Math.ceil(limit * 0.7)
        ),
        this.getCollaborativeRecommendations(userId, Math.ceil(limit * 0.7)),
      ]);

      // Combine and deduplicate
      const combinedRecs = new Map();

      // Add content-based recommendations with weight
      contentRecs.forEach((rec) => {
        combinedRecs.set(rec.product_id, {
          ...rec,
          combined_score: rec.similarity_score * 0.6,
          recommendation_type: "hybrid",
        });
      });

      // Add collaborative recommendations with weight
      collabRecs.forEach((rec) => {
        const existing = combinedRecs.get(rec.product_id);
        if (existing) {
          existing.combined_score += rec.similarity_score * 0.4;
        } else {
          combinedRecs.set(rec.product_id, {
            ...rec,
            combined_score: rec.similarity_score * 0.4,
            recommendation_type: "hybrid",
          });
        }
      });

      // Sort by combined score and return top recommendations
      return Array.from(combinedRecs.values())
        .sort((a, b) => b.combined_score - a.combined_score)
        .slice(0, limit);
    } catch (error) {
      console.error("Error in hybrid recommendations:", error);
      return this.getFallbackRecommendations(limit);
    }
  }

  // Fallback recommendations for new users or when other methods fail
  async getFallbackRecommendations(limit = 10) {
    try {
      const products = await Product.find({})
        .sort({ rating: -1, view_count: -1, is_featured: -1 })
        .limit(limit);

      return products.map((product) => ({
        ...product.toObject(),
        similarity_score: product.rating / 5,
        recommendation_type: "fallback",
      }));
    } catch (error) {
      console.error("Error in fallback recommendations:", error);
      return [];
    }
  }

  // Update user interaction and retrain if needed
  async updateUserInteraction(
    userId,
    productId,
    interactionType,
    rating = null
  ) {
    try {
      const user = await User.findById(userId);
      if (user) {
        await user.addInteraction(productId, interactionType, rating);

        // Update the in-memory user-item matrix
        const userInteractions = this.userItemMatrix.get(userId) || new Map();
        const weight = this.getInteractionWeight(interactionType);
        const currentWeight = userInteractions.get(productId) || 0;
        userInteractions.set(productId, currentWeight + weight);
        this.userItemMatrix.set(userId, userInteractions);

        // Update product metrics
        const product = await Product.findOne({ product_id: productId });
        if (product) {
          switch (interactionType) {
            case "view":
              await product.incrementViewCount();
              break;
            case "like":
              await product.incrementLikeCount();
              break;
            case "purchase":
              await product.incrementPurchaseCount();
              break;
          }
        }
      }
    } catch (error) {
      console.error("Error updating user interaction:", error);
    }
  }
}

// Create singleton instance
const recommendationEngine = new RecommendationEngine();

export default recommendationEngine;
