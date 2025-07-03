import React, { useState, useEffect } from "react";
import {
  User,
  Heart,
  Eye,
  ShoppingCart,
  Settings,
  Calendar,
  Mail,
} from "lucide-react";
import { api } from "../services/api";
import useAuthStore from "../store/authStore";
import ProductCard from "../components/ProductCard";
import LoadingSpinner from "../components/LoadingSpinner";

const ProfilePage = () => {
  const { user, updateProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [interactions, setInteractions] = useState([]);
  const [interactionProducts, setInteractionProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const [profileForm, setProfileForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
    preferences: user?.preferences || [],
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user interactions
      const interactionsResponse = await api.get("/api/users/interactions");
      setInteractions(interactionsResponse.data.interactions || []);

      // Fetch products for interactions
      if (interactionsResponse.data.interactions?.length > 0) {
        const productIds = [
          ...new Set(
            interactionsResponse.data.interactions.map((i) => i.product_id)
          ),
        ];
        const productsResponse = await api.post("/api/products/batch", {
          productIds,
        });
        setInteractionProducts(productsResponse.data.products || []);
      }
    } catch (err) {
      setError("Failed to load profile data");
      console.error("Error fetching profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      await updateProfile(profileForm);
      // Success feedback could be added here
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getInteractionsByType = (type) => {
    return interactions.filter((interaction) => interaction.type === type);
  };

  const getProductsForInteractions = (interactionList) => {
    return interactionList
      .map((interaction) => {
        const product = interactionProducts.find(
          (p) => p._id === interaction.product_id
        );
        return product
          ? { ...product, interactionDate: interaction.timestamp }
          : null;
      })
      .filter(Boolean);
  };

  const interactionStats = {
    views: getInteractionsByType("view").length,
    likes: getInteractionsByType("like").length,
    purchases: getInteractionsByType("purchase").length,
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "liked", label: "Liked Products", icon: Heart },
    { id: "viewed", label: "Recently Viewed", icon: Eye },
    { id: "purchased", label: "Purchases", icon: ShoppingCart },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center space-x-4">
          <div className="bg-primary-100 rounded-full p-4">
            <User className="h-12 w-12 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.username}
            </h1>
            <p className="text-gray-600 flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              {user?.email}
            </p>
            <p className="text-sm text-gray-500 flex items-center mt-1">
              <Calendar className="h-4 w-4 mr-2" />
              Member since{" "}
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Eye className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {interactionStats.views}
          </div>
          <div className="text-gray-600">Products Viewed</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <Heart className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {interactionStats.likes}
          </div>
          <div className="text-gray-600">Products Liked</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <ShoppingCart className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {interactionStats.purchases}
          </div>
          <div className="text-gray-600">Products Purchased</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                {interactions.length > 0 ? (
                  <div className="space-y-3">
                    {interactions.slice(0, 5).map((interaction, index) => {
                      const product = interactionProducts.find(
                        (p) => p._id === interaction.product_id
                      );
                      const iconMap = {
                        view: Eye,
                        like: Heart,
                        purchase: ShoppingCart,
                      };
                      const Icon = iconMap[interaction.type];

                      return (
                        <div
                          key={index}
                          className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <Icon className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium">
                                {interaction.type}
                              </span>{" "}
                              {product?.product_name || "Unknown Product"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(
                                interaction.timestamp
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-600">No recent activity</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "liked" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Liked Products</h3>
              {(() => {
                const likedProducts = getProductsForInteractions(
                  getInteractionsByType("like")
                );
                return likedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {likedProducts.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No liked products yet</p>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === "viewed" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Recently Viewed Products
              </h3>
              {(() => {
                const viewedProducts = getProductsForInteractions(
                  getInteractionsByType("view")
                );
                return viewedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {viewedProducts.slice(0, 12).map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No viewed products yet</p>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === "purchased" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Purchase History</h3>
              {(() => {
                const purchasedProducts = getProductsForInteractions(
                  getInteractionsByType("purchase")
                );
                return purchasedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {purchasedProducts.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No purchases yet</p>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === "settings" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Profile Settings</h3>
              <form
                onSubmit={handleProfileUpdate}
                className="max-w-md space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={profileForm.username}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary flex items-center space-x-2"
                >
                  {updating ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Settings className="h-4 w-4" />
                      <span>Update Profile</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
