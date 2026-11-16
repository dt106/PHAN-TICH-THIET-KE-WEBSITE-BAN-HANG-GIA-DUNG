import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  createPaymentValidator,
  mockCompleteValidator,
} from "../validators/payment.validator";
import * as paymentController from "../controllers/payment.controller";

const router = Router();

router.post(
  "/",
  authMiddleware,
  createPaymentValidator,
  validate,
  paymentController.createPayment
);

router.get("/my-payments", authMiddleware, paymentController.getMyPayments);

router.get("/vnpay/return", paymentController.vnpayReturn);
router.get("/vnpay/ipn", paymentController.vnpayIpn);
router.get("/momo/return", paymentController.momoReturn);
router.post("/momo/ipn", paymentController.momoIpn);
router.post("/zalopay/callback", paymentController.zalopayCallback);
router.post(
  "/mock/complete",
  mockCompleteValidator,
  validate,
  paymentController.mockComplete
);

export default router;
