import path from 'path';
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|webp|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images only!'));
  }
}

let upload;

const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && 
                      process.env.CLOUDINARY_API_KEY && 
                      process.env.CLOUDINARY_API_SECRET;

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'orbit_uploads',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    },
  });

  upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
  });
} else {
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'uploads/');
    },
    filename(req, file, cb) {
      cb(
        null,
        `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
      );
    },
  });

  upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
      checkFileType(file, cb);
    },
    limits: {
      fileSize: 5 * 1024 * 1024,
    }
  });
}

router.post('/', protect, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).send({ message: err.message });
    }
    if (!req.file) {
      return res.status(400).send({ message: 'No image uploaded' });
    }
    
    const imagePath = req.file.path || req.file.secure_url || '';
    const isAbsolute = imagePath.startsWith('http');
    
    res.send({
      message: 'Image Uploaded',
      image: isAbsolute ? imagePath : `/${imagePath.replace(/\\/g, '/')}`,
    });
  });
});

export default router;
