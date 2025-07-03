import mongoose from "mongoose";
import bcryptjs from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    preferences: {
      favoriteCategories: [
        {
          type: String,
          default: [],
        },
      ],
      priceRange: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 1000 },
      },
    },
    interactions: [
      {
        productId: { type: Number, required: true },
        type: {
          type: String,
          enum: ["view", "like", "purchase", "cart_add"],
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
        rating: { type: Number, min: 1, max: 5 }, // Optional rating for purchases
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcryptjs.genSalt(12);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcryptjs.compare(candidatePassword, this.password);
};

// Get user's interaction history for a specific product
userSchema.methods.getProductInteractions = function (productId) {
  return this.interactions.filter(
    (interaction) => interaction.productId === productId
  );
};

// Add interaction method
userSchema.methods.addInteraction = function (productId, type, rating = null) {
  this.interactions.push({
    productId,
    type,
    rating,
    timestamp: new Date(),
  });
  return this.save();
};

export default mongoose.model("User", userSchema);
