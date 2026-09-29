import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import portfolioRoutes from "./routes/portfolio.routes.js";
import behaviorRoutes from "./routes/behavior.routes.js";
import healthRoutes from "./routes/health.routes.js";
import interventionRoutes from "./routes/intervention.routes.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get("/", (_req, res) => {
  res.json({
    name: "Personalized Stock Advisory API",
    version: "1.0.0",
    status: "running"
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/behavior", behaviorRoutes);
app.use("/api/intervention", interventionRoutes);

export default app;
