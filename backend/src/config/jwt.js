import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET chưa được định nghĩa trong biến môi trường!");
}

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d", // Mặc định là 7 ngày nếu chưa cấu hình
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("❌ Lỗi xác minh JWT:", error.message);
    return null;
  }
};
