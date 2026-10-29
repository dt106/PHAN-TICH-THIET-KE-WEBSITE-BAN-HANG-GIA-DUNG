import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { toJSON } from "./plugins/toJSON.plugin";

export type PaymentMethod = "COD" | "BANK" | "MOMO" | "VNPAY" | "ZALOPAY";
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export interface IPayment extends Document {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  paymentMethod: PaymentMethod;
  transactionCode?: string | null;
  gatewayOrderId?: string | null;
  amount: number;
  currency: string;
  orderInfo?: string | null;
  paymentUrl?: string | null;
  expiredAt?: Date | null;
  status: PaymentStatus;
  gatewayResponse?: string | null;
  failedReason?: string | null;
  refundAmount: number;
  refundedAt?: Date | null;
  refundTransactionCode?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "BANK", "MOMO", "VNPAY", "ZALOPAY"],
      required: true,
    },
    transactionCode: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
    gatewayOrderId: { type: String, default: null, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "VND" },
    orderInfo: { type: String, default: null },
    paymentUrl: { type: String, default: null, maxlength: 2000 },
    expiredAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    gatewayResponse: { type: String, default: null },
    failedReason: { type: String, default: null },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundedAt: { type: Date, default: null },
    refundTransactionCode: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

paymentSchema.plugin(toJSON);

paymentSchema.index({ paymentMethod: 1, status: 1 });
paymentSchema.index({ orderId: 1, createdAt: -1 });

export const Payment: Model<IPayment> = mongoose.model<IPayment>(
  "Payment",
  paymentSchema
);
export default Payment;
