import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import userRoutes from "./routes/user.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import qrRoutes from "./routes/qr.routes.js";
import { errorHandler } from "./middlewares/error-handler.middleware.js";
import { sessionConfig } from "./config/session.js";
dotenv.config();

const app = express();
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const defaultFrontendUrl = "http://localhost:5173";
const allowedFrontendOrigins = Array.from(
  new Set([
    ...(process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim())
      : []),
    ...(process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
      : []),
    ...(process.env.NODE_ENV === "production"
      ? []
      : [defaultFrontendUrl, "http://127.0.0.1:5173"]),
  ]),
).filter(Boolean);

// Global Middlewares
app.use(
  cors((req, callback) => {
    const origin = req.get("Origin");
    const isSameOrigin =
      origin !== undefined &&
      origin === `${req.protocol}://${req.get("host")}`;

    callback(null, {
      origin:
        !origin || isSameOrigin || allowedFrontendOrigins.includes(origin),
      credentials: true,
    });
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessionConfig);
app.use("/api/users", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/qr", qrRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Gym System API is running",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found." },
  });
});

app.use(errorHandler);

export default app;
