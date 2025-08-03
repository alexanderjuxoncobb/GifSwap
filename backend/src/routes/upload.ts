import { Router } from "express";
import multer from "multer";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { readFile, unlink } from "fs/promises";
import sharp from "sharp";

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Read the uploaded file
    const fileBuffer = await readFile(req.file.path);
    
    // Convert image to JPEG format using sharp to ensure compatibility
    const convertedBuffer = await sharp(fileBuffer)
      .jpeg({ quality: 90 })
      .toBuffer();
    
    // Create base64 data URL with JPEG format
    const base64Data = `data:image/jpeg;base64,${convertedBuffer.toString('base64')}`;
    
    // Clean up the uploaded file since we have the base64 data
    await unlink(req.file.path);

    res.json({
      success: true,
      filename: req.file.filename,
      base64Data: base64Data,
    });
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    // Clean up file on error
    if (req.file?.path) {
      await unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: "Failed to process uploaded file" });
  }
});

export default router;
