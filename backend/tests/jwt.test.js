import { generateToken, verifyToken } from "../src/config/jwt.js";

import dotenv from "dotenv";

dotenv.config(); // Load biến môi trường từ .env

const mockUserId = "user123";

// 📌 Test generateToken
const token = generateToken(mockUserId);
console.log("Generated Token:", token);

// 📌 Test verifyToken
const decoded = verifyToken(token);
console.log("Decoded Token:", decoded);

// 📌 Test với token không hợp lệ
const invalidToken = "invalid.token.value";
const invalidDecoded = verifyToken(invalidToken);
console.log("Invalid Token Decoded:", invalidDecoded);
