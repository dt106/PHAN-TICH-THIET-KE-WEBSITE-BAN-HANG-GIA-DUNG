
import type { Request, Response, NextFunction } from "express";

import {
  getAdminOverviewStatisticsService,
  getAdminUserStatisticsService,
  type DashboardPeriod,
} from "../../services/statistics/admin.statistics.service";

const VALID_PERIODS: DashboardPeriod[] = [
  "7d",
  "30d",
  "12m",
];

export const getAdminUserStatistics = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await getAdminUserStatisticsService();

    res.status(200).json({
      success: true,
      message: "Lấy thống kê người dùng thành công.",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminOverviewStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const queryPeriod = req.query.period;

    const period: DashboardPeriod =
      typeof queryPeriod === "string"
        ? (queryPeriod as DashboardPeriod)
        : "30d";

    if (!VALID_PERIODS.includes(period)) {
      res.status(400).json({
        success: false,
        message: "Khoảng thời gian không hợp lệ.",
        errors: {
          period: ["Chỉ chấp nhận 7d, 30d hoặc 12m."],
        },
      });
      return;
    }

    const data =
      await getAdminOverviewStatisticsService(period);

    res.status(200).json({
      success: true,
      message: "Lấy thống kê Dashboard thành công.",
      data,
    });
  } catch (error) {
    next(error);
  }
};
