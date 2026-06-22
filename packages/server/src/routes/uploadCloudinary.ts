import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

router.post('/', authenticate, upload.single('file'), (req: AuthRequest, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  const uploadStream = cloudinary.uploader.upload_stream(
    { folder: 'trust-home' },
    (err, result) => {
      if (err || !result) {
        res.status(500).json({ success: false, error: 'Upload to Cloudinary failed' });
        return;
      }
      res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
    }
  );

  uploadStream.end(file.buffer);
});

router.delete('/', authenticate, (req: AuthRequest, res: Response) => {
  const { publicId } = req.body;
  if (!publicId) {
    res.status(400).json({ success: false, error: 'publicId is required' });
    return;
  }

  cloudinary.uploader.destroy(publicId).then(() => {
    res.json({ success: true });
  }).catch((err) => {
    res.status(500).json({ success: false, error: 'Failed to delete from Cloudinary' });
  });
});

export default router;
