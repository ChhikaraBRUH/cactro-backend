import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Redis } from "ioredis";
import "dotenv/config";

const app = new Hono();

const MAX_SIZE = 10;

// GET / -> Server is running 🔥
app.get("/", (c) => {
  return c.text("Server is running 🔥");
});

// POST /cache { key: string, value: string }
app.post("/cache", async (c) => {
  if (!process.env.REDIS_CONNECTION_URL) {
    return c.text("REDIS_CONNECTION_URL is required", 500);
  }
  const redis = new Redis(process.env.REDIS_CONNECTION_URL);

  const { key, value } = await c.req.json();

  // Check if the cache limit is reached
  const size = await redis.dbsize();
  if (size >= MAX_SIZE) {
    return c.text(
      `Cache limit reached. Cannot store more than ${MAX_SIZE} keys.`,
      400
    );
  }

  // Check if the key already exists
  const exists = await redis.exists(key);
  if (exists === 1) {
    return c.text("Key already exists.", 400);
  }

  // Store the key-value pair and return the response
  await redis.set(key, value);
  return c.text(`Stored {${key} : ${value}} successfully.`);
});

// GET /cache/:key -> Value: string
app.get("/cache/:key", async (c) => {
  if (!process.env.REDIS_CONNECTION_URL) {
    return c.text("REDIS_CONNECTION_URL is required", 500);
  }
  const redis = new Redis(process.env.REDIS_CONNECTION_URL);

  const key = c.req.param("key");

  // Get the value from the cache
  const data = await redis.get(key);

  // If the key is not found, return 404
  if (data === null) {
    return c.text("Key not found.", 404);
  }

  // Return the value
  return c.text(`Value: ${data}`);
});

// DELETE /cache/:key -> Deleted key: string
app.delete("/cache/:key", async (c) => {
  if (!process.env.REDIS_CONNECTION_URL) {
    return c.text("REDIS_CONNECTION_URL is required", 500);
  }
  const redis = new Redis(process.env.REDIS_CONNECTION_URL);

  const key = c.req.param("key");

  // Delete the key from the cache
  await redis.del(key);
  return c.text(`Deleted key: ${key}`);
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
