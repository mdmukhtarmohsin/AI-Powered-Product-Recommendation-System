import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post("/auth/register", userData),
  login: (credentials) => api.post("/auth/login", credentials),
  getProfile: () => api.get("/auth/profile"),
  updatePreferences: (preferences) =>
    api.put("/auth/preferences", { preferences }),
  getInteractionHistory: (params = {}) =>
    api.get("/auth/interactions", { params }),
};

// Products API
export const productsAPI = {
  getProducts: (params = {}) => api.get("/products", { params }),
  getProductById: (id) => api.get(`/products/${id}`),
  getFeaturedProducts: (params = {}) =>
    api.get("/products/featured", { params }),
  getSaleProducts: (params = {}) => api.get("/products/sale", { params }),
  getCategories: () => api.get("/products/categories"),
  searchProducts: (params = {}) => api.get("/products/search", { params }),
  trackInteraction: (productId, interactionData) =>
    api.post(`/products/${productId}/interact`, interactionData),
  getProductRecommendations: (productId, params = {}) =>
    api.get(`/products/${productId}/recommendations`, { params }),
};

// Recommendations API
export const recommendationsAPI = {
  getUserRecommendations: (params = {}) =>
    api.get("/recommendations/personal", { params }),
  getTrendingProducts: (params = {}) =>
    api.get("/recommendations/trending", { params }),
  getCategoryBasedRecommendations: (params = {}) =>
    api.get("/recommendations/category-based", { params }),
  getSimilarUsersRecommendations: (params = {}) =>
    api.get("/recommendations/similar-users", { params }),
  getRecommendationStats: () => api.get("/recommendations/stats"),
  initializeEngine: () => api.post("/recommendations/initialize"),
};

// Utility functions
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || "An error occurred",
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Network error
    return {
      message: "Network error. Please check your connection.",
      status: 0,
    };
  } else {
    // Other error
    return {
      message: error.message || "An unexpected error occurred",
      status: -1,
    };
  }
};

export default api;
