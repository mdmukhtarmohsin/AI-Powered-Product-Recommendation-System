import React from "react";
import { Link } from "react-router-dom";
import { Star, Heart, Eye, ShoppingCart } from "lucide-react";
import { api } from "../services/api";
import useAuthStore from "../store/authStore";

const ProductCard = ({ product, onInteraction }) => {
  const { isAuthenticated } = useAuthStore();

  const handleInteraction = async (type) => {
    if (!isAuthenticated) return;

    try {
      await api.post(`/api/products/${product._id}/interact`, { type });
      if (onInteraction) {
        onInteraction(product._id, type);
      }
    } catch (error) {
      console.error(`Failed to record ${type} interaction:`, error);
    }
  };

  const formatPrice = (price) => {
    return typeof price === "number" ? price.toFixed(2) : price;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="aspect-square bg-gray-200 relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.product_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = "/api/placeholder/300/300";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <img
              src="/api/placeholder/300/300"
              alt="Product placeholder"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {product.is_on_sale && (
            <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
              Sale
            </div>
          )}
          {product.is_featured && (
            <div className="bg-primary-600 text-white px-2 py-1 rounded text-xs font-medium">
              Featured
            </div>
          )}
        </div>

        {/* Interaction Buttons */}
        {isAuthenticated && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => handleInteraction("like")}
              className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
              title="Like this product"
            >
              <Heart className="h-4 w-4 text-gray-600 hover:text-red-500" />
            </button>
            <button
              onClick={() => handleInteraction("view")}
              className="p-2 bg-white rounded-full shadow-md hover:bg-blue-50 transition-colors"
              title="Mark as viewed"
            >
              <Eye className="h-4 w-4 text-gray-600 hover:text-blue-500" />
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2">
          <Link
            to={`/products/${product._id}`}
            className="font-semibold text-lg text-gray-900 hover:text-primary-600 transition-colors line-clamp-2"
            onClick={() => isAuthenticated && handleInteraction("view")}
          >
            {product.product_name}
          </Link>
        </div>

        <div className="text-sm text-gray-600 mb-2">
          <span className="font-medium">{product.category}</span>
          {product.subcategory && (
            <span className="text-gray-400"> • {product.subcategory}</span>
          )}
        </div>

        {product.manufacturer && (
          <div className="text-sm text-gray-500 mb-2">
            by {product.manufacturer}
          </div>
        )}

        <div className="flex items-center mb-3">
          <div className="flex items-center mr-2">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm text-gray-600">
              {product.rating ? product.rating.toFixed(1) : "N/A"}
            </span>
          </div>
          {product.quantity_in_stock !== undefined && (
            <div className="text-sm text-gray-500">
              {product.quantity_in_stock > 0 ? (
                <span className="text-green-600">
                  In Stock ({product.quantity_in_stock})
                </span>
              ) : (
                <span className="text-red-600">Out of Stock</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {product.is_on_sale && product.sale_price ? (
              <>
                <span className="text-lg font-bold text-primary-600">
                  ${formatPrice(product.sale_price)}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  ${formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-primary-600">
                ${formatPrice(product.price)}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to={`/products/${product._id}`}
              className="btn-primary text-sm px-3 py-1"
              onClick={() => isAuthenticated && handleInteraction("view")}
            >
              View Details
            </Link>
            {isAuthenticated && product.quantity_in_stock > 0 && (
              <button
                onClick={() => handleInteraction("purchase")}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="Add to cart"
              >
                <ShoppingCart className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
