import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) throw new Error("Usage: npm run auth:hash -- <password>");
const salt = randomBytes(16).toString("hex");
console.log(`${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
