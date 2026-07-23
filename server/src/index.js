import "dotenv/config";
import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

connectDatabase()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`Microcosm API running on port ${env.port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start Microcosm API", error);
    process.exit(1);
  });
