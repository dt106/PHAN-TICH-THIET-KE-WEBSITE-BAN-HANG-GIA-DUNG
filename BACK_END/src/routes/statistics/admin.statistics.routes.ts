
import { Router } from "express";

import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";

import {
  getAdminOverviewStatistics,
  getAdminUserStatistics,
} from "../../controllers/statistics/admin.statistics.controller";

const router = Router();

router.use(authMiddleware, roleMiddleware("admin"));

router.get("/users", getAdminUserStatistics);

router.get("/overview", getAdminOverviewStatistics);

export default router;
