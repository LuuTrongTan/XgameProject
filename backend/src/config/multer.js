import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tạo thư mục uploads nếu chưa tồn tại
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Hàm tạo tên file an toàn nhưng vẫn giữ được tên gốc
const generateSafeFileName = (originalname) => {
  // Tạo chuỗi ngẫu nhiên để đảm bảo tên file là duy nhất
  const timestamp = Date.now();
  const randomString = Math.round(Math.random() * 1e9);
  
  // Giữ extension gốc của file
  const extension = path.extname(originalname);
  const baseName = path.basename(originalname, extension);
  
  // Tạo tên file mới: timestamp-random-tên_file_gốc.extension
  return `${timestamp}-${randomString}-${baseName}${extension}`;
};

// Cấu hình storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    try {
      // Xử lý originalname để đảm bảo mã hóa UTF-8 đúng
      // Một số client gửi file tiếng Việt có thể bị encode sai
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      console.log(`Original filename: "${file.originalname}" → Decoded: "${originalName}"`);
      
      // Lưu tên file gốc vào req để có thể sử dụng sau này
      if (!req.fileOriginalNames) {
        req.fileOriginalNames = {};
      }
      
      // Tạo tên file an toàn cho lưu trữ
      const timestamp = Date.now();
      const randomString = Math.round(Math.random() * 1e9);
      const extension = path.extname(originalName);
      
      // Tạo slug từ tên file để loại bỏ dấu tiếng Việt và các ký tự đặc biệt
      let baseName = path.basename(originalName, extension)
        .normalize('NFD')                     // Tách các dấu thành component riêng biệt
        .replace(/[\u0300-\u036f]/g, '')     // Loại bỏ dấu
        .replace(/[^a-zA-Z0-9]/g, '_')       // Thay thế ký tự đặc biệt bằng gạch dưới
        .replace(/_+/g, '_')                 // Thay thế nhiều gạch dưới liên tiếp bằng một gạch dưới
        .replace(/^_|_$/g, '')               // Loại bỏ gạch dưới ở đầu và cuối
        .toLowerCase();
        
      // Nếu tên file rỗng sau khi xử lý, dùng "file" thay thế
      if (!baseName) baseName = 'file';
      
      // Tên file cuối cùng
      const safeFileName = `${timestamp}-${randomString}-${baseName}${extension}`;
      
      // Lưu mapping giữa filename trên đĩa và originalname
      req.fileOriginalNames[safeFileName] = originalName;
      
      console.log(`Saving file as: "${safeFileName}"`);
      
      cb(null, safeFileName);
    } catch (error) {
      console.error("Error in multer filename handler:", error);
      // Fallback nếu có lỗi
      const fallbackName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, fallbackName);
    }
  },
});

// Filter để chấp nhận nhiều loại file
const fileFilter = (req, file, cb) => {
  // Danh sách các loại MIME chấp nhận được
  const allowedMimeTypes = [
    // Hình ảnh
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Tài liệu
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    // Audio/Video
    'video/mp4', 'video/webm', 'video/ogg',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    // Archive
    'application/zip', 'application/x-rar-compressed', 
    'application/x-7z-compressed', 'application/x-tar',
    // Khác
    'application/octet-stream'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.log(`Rejected file type: ${file.mimetype} for file ${file.originalname}`);
    cb(null, true); // Chấp nhận tất cả các loại file cho bây giờ, có thể thay đổi thành false nếu muốn giới hạn
  }
};

// Tạo middleware upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // Tăng giới hạn lên 15MB
  },
});

export default upload;
