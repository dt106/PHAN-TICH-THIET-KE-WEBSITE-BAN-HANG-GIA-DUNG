import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { toJSON } from "./plugins/toJSON.plugin";

export type PaymentMethod = "COD" | "BANK" | "MOMO" | "VNPAY" | "ZALOPAY";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipping"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned";

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  userId?: Types.ObjectId | null;
  couponId?: Types.ObjectId | null;

  customerName: string;
  customerEmail: string;
  customerPhone: string;

  shippingAddress: string;
  shippingWard?: string | null;
  shippingDistrict?: string | null;
  shippingProvince?: string | null;

  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;

  note?: string | null;

  confirmedAt?: Date | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
      index: true,
    },

    customerName: { type: String, required: true, maxlength: 150 },
    customerEmail: { type: String, required: true, lowercase: true, trim: true },
    customerPhone: { type: String, required: true, maxlength: 20 },

    shippingAddress: { type: String, required: true },
    shippingWard: { type: String, default: null, maxlength: 100 },
    shippingDistrict: { type: String, default: null, maxlength: 100 },
    shippingProvince: { type: String, default: null, maxlength: 100 },

    subtotal: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    paymentMethod: {
      type: String,
      enum: ["COD", "BANK", "MOMO", "VNPAY", "ZALOPAY"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipping",
        "delivered",
        "completed",
        "cancelled",
        "returned",
      ],
      default: "pending",
      index: true,
    },

    note: { type: String, default: null },

    confirmedAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

orderSchema.plugin(toJSON);

orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1, status: 1 });

export const Order: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);
export default Order;