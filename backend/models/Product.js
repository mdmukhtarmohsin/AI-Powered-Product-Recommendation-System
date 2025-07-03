import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    product_id: {
      type: Number,
      required: true,
      unique: true,
    },
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    subcategory: {
      type: String,
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity_in_stock: {
      type: Number,
      required: true,
      min: 0,
    },
    manufacturer: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
    },
    dimensions: {
      type: String,
      required: true,
    },
    release_date: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    is_featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_on_sale: {
      type: Boolean,
      default: false,
      index: true,
    },
    sale_price: {
      type: Number,
      min: 0,
    },
    image_url: {
      type: String,
      required: true,
    },
    // Additional fields for recommendation engine
    tags: [
      {
        type: String,
      },
    ],
    view_count: {
      type: Number,
      default: 0,
    },
    like_count: {
      type: Number,
      default: 0,
    },
    purchase_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create text index for search functionality
productSchema.index({
  product_name: "text",
  description: "text",
  category: "text",
  subcategory: "text",
  manufacturer: "text",
});

// Create compound indexes for efficient filtering
productSchema.index({ category: 1, price: 1 });
productSchema.index({ rating: -1, is_featured: -1 });
productSchema.index({ is_on_sale: 1, price: 1 });

// Virtual for effective price (sale price if on sale, otherwise regular price)
productSchema.virtual("effective_price").get(function () {
  return this.is_on_sale && this.sale_price ? this.sale_price : this.price;
});

// Method to increment view count
productSchema.methods.incrementViewCount = function () {
  this.view_count = (this.view_count || 0) + 1;
  return this.save();
};

// Method to increment like count
productSchema.methods.incrementLikeCount = function () {
  this.like_count = (this.like_count || 0) + 1;
  return this.save();
};

// Method to increment purchase count
productSchema.methods.incrementPurchaseCount = function () {
  this.purchase_count = (this.purchase_count || 0) + 1;
  return this.save();
};

// Static method to get popular products
productSchema.statics.getPopularProducts = function (limit = 10) {
  return this.find({})
    .sort({ view_count: -1, like_count: -1, purchase_count: -1 })
    .limit(limit);
};

// Static method to get featured products
productSchema.statics.getFeaturedProducts = function (limit = 10) {
  return this.find({ is_featured: true })
    .sort({ rating: -1, view_count: -1 })
    .limit(limit);
};

// Static method to get products on sale
productSchema.statics.getSaleProducts = function (limit = 10) {
  return this.find({ is_on_sale: true })
    .sort({ rating: -1, view_count: -1 })
    .limit(limit);
};

export default mongoose.model("Product", productSchema);
