import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  orderIdParamValidator,
  myOrdersQueryValidator,
} from "../validators/order.validator";
import * as orderController from "../controllers/order.controller";

const router = Router();

router.use(authMiddleware);

router.get("/my-orders", myOrdersQueryValidator, validate, orderController.getMyOrders);

router.get("/:id", orderIdParamValidator, validate, orderController.getOrderDetail);

router.put(
  "/:id/confirm-delivery",
  orderIdParamValidator,
  validate,
  orderController.confirmDeliveryOrder
);

router.put("/:id/cancel", orderIdParamValidator, validate, orderController.cancelMyOrder);

export default router;
