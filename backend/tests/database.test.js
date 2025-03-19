import mongoose from "mongoose";
import connectDB from "../src/config/database.js";

describe("MongoDB Connection", () => {
  beforeAll(async () => {
    process.env.DB_URI = "mongodb://localhost:27017/testdb"; // Đảm bảo DB_URI hợp lệ
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.close(); // Đóng kết nối sau khi test xong
  });

  test("Should connect to MongoDB without error", async () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = Đã kết nối
  });
});
