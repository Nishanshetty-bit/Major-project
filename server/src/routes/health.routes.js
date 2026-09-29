import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.json({
    status: databaseConnected ? "ok" : "degraded",
    service: "stock-advisor-api",
    database: databaseConnected ? "connected" : "disconnected"
  });
});

export default router;
