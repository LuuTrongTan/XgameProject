import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "../../uploads");

// Tạo thư mục uploads nếu chưa tồn tại
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
} else {
  console.log("Uploads directory already exists");
}

// Tạo file .gitkeep để giữ thư mục trong git
const gitkeepFile = path.join(uploadsDir, ".gitkeep");
if (!fs.existsSync(gitkeepFile)) {
  fs.writeFileSync(gitkeepFile, "");
  console.log("Created .gitkeep file");
}
