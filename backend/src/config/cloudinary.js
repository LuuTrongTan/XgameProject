import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Hàm upload file
export const uploadFile = async (filePath, folder = "uploads") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
    });

    console.log("Upload thành công:", result.secure_url);

    // Xóa file sau khi upload
    fs.unlinkSync(filePath);

    return result.secure_url;
  } catch (error) {
    console.error("Lỗi khi upload file:", error);
    throw error;
  }
};

export default cloudinary;
