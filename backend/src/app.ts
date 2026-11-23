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
const defaultFrontendUrl = "http://localhost:5173";
const allowedFrontendOrigins =
  process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL ?? defaultFrontendUrl
    : Array.from(
        new Set([
          process.env.FRONTEND_URL ?? defaultFrontendUrl,
          defaultFrontendUrl,
          "http://127.0.0.1:5173",
        ]),
      );

// Global Middlewares
app.use(
  cors({
    origin: allowedFrontendOrigins,
    credentials: true,
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
