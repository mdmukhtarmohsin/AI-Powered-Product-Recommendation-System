import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Star,
  Heart,
  ShoppingCart,
  ArrowLeft,
  Package,
  Truck,
  Shield,
} from "lucide-react";
import { api } from "../services/api";
import useAuthStore from "../store/authStore";
import ProductCard from "../components/ProductCard";
import LoadingSpinner from "../components/LoadingSpinner";

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/api/products/${id}`);
      setProduct(response.data.product);

      // Record view interaction if authenticated
      if (isAuthenticated) {
        try {
          await api.post(`/api/products/${id}/interact`, { type: "view" });
        } catch (err) {
          console.error("Failed to record view interaction:", err);
        }
      }

      // Fetch related products
      if (response.data.product.category) {
        try {
          const relatedResponse = await api.get(
            `/api/products?category=${response.data.product.category}&limit=4&exclude=${id}`
          );
          setRelatedProducts(relatedResponse.data.products || []);
        } catch (err) {
          console.error("Failed to fetch related products:", err);
        }
      }
    } catch (err) {
      setError("Failed to load product details");
      console.error("Error fetching product:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInteraction = async (type) => {
    if (!isAuthenticated) return;

    try {
      await api.post(`/api/products/${id}/interact`, { type });
      console.log(`${type} interaction recorded`);
    } catch (error) {
      console.error(`Failed to record ${type} interaction:`, error);
    }
  };

  const formatPrice = (price) => {
    return typeof price === "number" ? price.toFixed(2) : price;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">
            {error || "Product not found"}
          </p>
          <Link to="/products" className="btn-primary">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const images = product.image_url
    ? [product.image_url]
    : ["/api/placeholder/600/600"];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Link to="/" className="hover:text-primary-600">
            Home
          </Link>
          <span>/</span>
          <Link to="/products" className="hover:text-primary-600">
            Products
          </Link>
          <span>/</span>
          <Link
            to={`/products?category=${product.category}`}
            className="hover:text-primary-600"
          >
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{product.product_name}</span>
        </div>
      </nav>

      {/* Back Button */}
      <Link
        to="/products"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Products
      </Link>

      {/* Product Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
            <img
              src={images[selectedImageIndex]}
              alt={product.product_name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = "/api/placeholder/600/600";
              }}
            />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square rounded-md overflow-hidden border-2 ${
                    selectedImageIndex === index
                      ? "border-primary-600"
                      : "border-gray-200"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.product_name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product.product_name}
            </h1>
            {product.manufacturer && (
              <p className="text-lg text-gray-600">by {product.manufacturer}</p>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <span className="ml-1 text-lg font-medium">
                {product.rating ? product.rating.toFixed(1) : "N/A"}
              </span>
            </div>
            <div className="text-gray-600">
              Product ID: {product.product_id}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center space-x-4">
            {product.is_on_sale && product.sale_price ? (
              <>
                <span className="text-3xl font-bold text-primary-600">
                  ${formatPrice(product.sale_price)}
                </span>
                <span className="text-xl text-gray-500 line-through">
                  ${formatPrice(product.price)}
                </span>
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
                  {Math.round((1 - product.sale_price / product.price) * 100)}%
                  OFF
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-primary-600">
                ${formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-gray-400" />
            {product.quantity_in_stock > 0 ? (
              <span className="text-green-600 font-medium">
                In Stock ({product.quantity_in_stock} available)
              </span>
            ) : (
              <span className="text-red-600 font-medium">Out of Stock</span>
            )}
          </div>

          {/* Badges */}
          <div className="flex space-x-2">
            {product.is_featured && (
              <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                Featured
              </span>
            )}
            {product.is_on_sale && (
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                On Sale
              </span>
            )}
          </div>

          {/* Actions */}
          {isAuthenticated && (
            <div className="flex space-x-4">
              <button
                onClick={() => handleInteraction("purchase")}
                disabled={product.quantity_in_stock === 0}
                className="btn-primary flex items-center space-x-2 flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Add to Cart</span>
              </button>
              <button
                onClick={() => handleInteraction("like")}
                className="btn-secondary flex items-center space-x-2 px-6"
              >
                <Heart className="h-5 w-5" />
                <span>Like</span>
              </button>
            </div>
          )}

          {!isAuthenticated && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-600 mb-2">
                Sign in to purchase or like this product
              </p>
              <div className="flex space-x-2">
                <Link to="/login" className="btn-primary text-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn-secondary text-sm">
                  Sign Up
                </Link>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-gray-600">
              <Truck className="h-5 w-5" />
              <span className="text-sm">Free Shipping</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Secure Payment</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Package className="h-5 w-5" />
              <span className="text-sm">Easy Returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-12">
        <h2 className="text-2xl font-bold mb-4">Product Details</h2>

        {product.description && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Specifications</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Category:</dt>
                <dd className="font-medium">{product.category}</dd>
              </div>
              {product.subcategory && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Subcategory:</dt>
                  <dd className="font-medium">{product.subcategory}</dd>
                </div>
              )}
              {product.weight && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Weight:</dt>
                  <dd className="font-medium">{product.weight}</dd>
                </div>
              )}
              {product.dimensions && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Dimensions:</dt>
                  <dd className="font-medium">{product.dimensions}</dd>
                </div>
              )}
              {product.release_date && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Release Date:</dt>
                  <dd className="font-medium">
                    {new Date(product.release_date).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard
                key={relatedProduct._id}
                product={relatedProduct}
                onInteraction={handleInteraction}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
