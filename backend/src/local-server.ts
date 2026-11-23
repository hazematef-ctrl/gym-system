
import app from "./app.mjs";
import { connectDB } from "./config/db.js";

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
