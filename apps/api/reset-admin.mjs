// One-time script to reset super_admin password
// Usage: node reset-admin.mjs
// Delete this file after use.

import { MongoClient } from "mongodb";
import { createHash } from "crypto";
import { promisify } from "util";

// --- CONFIG ---
const MONGO_URI = "mongodb+srv://rahatcse5bu:1234567890Rahat@cluster0.umg3foq.mongodb.net/";
const DB_NAME = "test"; // change if your DB name is different
const NEW_EMAIL = "admin@dorjee.com";
const NEW_PASSWORD = "Admin@1234"; // change to whatever you want
// --------------

// bcrypt is not built-in; use the dynamic import below
async function hashPassword(password) {
  const bcrypt = await import("bcryptjs").catch(() => import("bcrypt"));
  return bcrypt.default.hash(password, 10);
}

const client = new MongoClient(MONGO_URI);

try {
  await client.connect();
  const db = client.db(DB_NAME);
  const users = db.collection("users");

  const passwordHash = await hashPassword(NEW_PASSWORD);

  const result = await users.updateOne(
    { role: "super_admin" },
    { $set: { email: NEW_EMAIL, passwordHash } }
  );

  if (result.matchedCount === 0) {
    console.log("No super_admin found. Creating one...");
    await users.insertOne({
      email: NEW_EMAIL,
      passwordHash,
      role: "super_admin",
      shopId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("super_admin created.");
  } else {
    console.log("Password reset successfully.");
  }

  console.log(`\nLogin with:\n  Email:    ${NEW_EMAIL}\n  Password: ${NEW_PASSWORD}\n`);
} finally {
  await client.disconnect();
}
