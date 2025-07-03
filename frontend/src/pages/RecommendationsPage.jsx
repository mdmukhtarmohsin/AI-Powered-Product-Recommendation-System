import React, { useState, useEffect } from "react";
import { Sparkles, TrendingUp, Users, RefreshCw } from "lucide-react";
import { api } from "../services/api";
import ProductCard from "../components/ProductCard";
import LoadingSpinner from "../components/LoadingSpinner";

const RecommendationsPage = () => {
  const [contentBasedRecommendations, setContentBasedRecommendations] =
    useState([]);
  const [collaborativeRecommendations, setCollaborativeRecommendations] =
    useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch both types of recommendations in parallel
      const [contentBasedResponse, collaborativeResponse] = await Promise.all([
        api.get("/api/recommendations/content-based"),
        api.get("/api/recommendations/collaborative"),
      ]);

      setContentBasedRecommendations(
        contentBasedResponse.data.recommendations || []
      );
      setCollaborativeRecommendations(
        collaborativeResponse.data.recommendations || []
      );
    } catch (err) {
      setError("Failed to load recommendations");
      console.error("Error fetching recommendations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchRecommendations(true);
  };

  const handleProductInteraction = (productId, interactionType) => {
    console.log(`Product ${productId} ${interactionType} interaction recorded`);
    // Optionally refresh recommendations after certain interactions
    if (interactionType === "like" || interactionType === "purchase") {
      // Could trigger a refresh of recommendations
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Sparkles className="h-16 w-16 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">
            Generating Your Recommendations
          </h1>
          <p className="text-gray-600 mb-8">
            Our AI is analyzing your preferences...
          </p>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <Sparkles className="h-16 w-16 text-primary-600 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Your Personalized Recommendations
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
          Discover products tailored just for you, powered by our advanced AI
          recommendation engine
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center space-x-2 mx-auto"
        >
          <RefreshCw
            className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
          />
          <span>
            {refreshing ? "Refreshing..." : "Refresh Recommendations"}
          </span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8">
          <p className="text-center">{error}</p>
          <div className="text-center mt-4">
            <button
              onClick={() => fetchRecommendations()}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Content-Based Recommendations */}
      <section className="mb-16">
        <div className="flex items-center mb-8">
          <TrendingUp className="h-8 w-8 text-primary-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Based on Your Interests
            </h2>
            <p className="text-gray-600">
              Products similar to ones you've liked and viewed
            </p>
          </div>
        </div>

        {contentBasedRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {contentBasedRecommendations.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onInteraction={handleProductInteraction}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Content-Based Recommendations Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start browsing and liking products to get personalized
              recommendations based on your interests.
            </p>
            <a href="/products" className="btn-primary">
              Explore Products
            </a>
          </div>
        )}
      </section>

      {/* Collaborative Filtering Recommendations */}
      <section className="mb-16">
        <div className="flex items-center mb-8">
          <Users className="h-8 w-8 text-primary-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              People Like You Also Liked
            </h2>
            <p className="text-gray-600">
              Recommendations based on users with similar preferences
            </p>
          </div>
        </div>

        {collaborativeRecommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collaborativeRecommendations.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onInteraction={handleProductInteraction}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Collaborative Recommendations Yet
            </h3>
            <p className="text-gray-600 mb-4">
              As more users interact with products, we'll be able to recommend
              items based on similar user preferences.
            </p>
            <a href="/products" className="btn-primary">
              Explore Products
            </a>
          </div>
        )}
      </section>

      {/* Tips for Better Recommendations */}
      {(contentBasedRecommendations.length === 0 ||
        collaborativeRecommendations.length === 0) && (
        <section className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-8">
          <h3 className="text-xl font-bold text-primary-900 mb-4">
            Get Better Recommendations
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-primary-800 mb-2">
                For Content-Based:
              </h4>
              <ul className="text-primary-700 space-y-1">
                <li>• Browse and view products you're interested in</li>
                <li>• Like products that appeal to you</li>
                <li>• Interact with products in categories you enjoy</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-primary-800 mb-2">
                For Collaborative:
              </h4>
              <ul className="text-primary-700 space-y-1">
                <li>• Rate and review products</li>
                <li>• Make purchases to show preferences</li>
                <li>• Help us understand your taste better</li>
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default RecommendationsPage;
