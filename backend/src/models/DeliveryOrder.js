import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const deliveryOrderSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    buyerName: { type: String, required: true },
    buyerRole: { type: String, enum: ["patient", "doctor"], required: true },
    address: { type: String, required: true },
    status: {
      type: String,
      enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Processing",
    },
    date: { type: String, required: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String, sparse: true, unique: true },
    paymentStatus: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
  },
  { timestamps: true }
);

export const DeliveryOrder =
  mongoose.models.DeliveryOrder || mongoose.model("DeliveryOrder", deliveryOrderSchema);
