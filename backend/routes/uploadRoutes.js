import path from 'path';
import express from 'express';
import multer from 'multer';

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/'); // Will create uploads folder if it doesn't exist? Wait, multer doesn't automatically create folders if it's deeply nested but root ones might. Actually, it's safer to just use 'uploads/' and create it, or use `fs` to ensure it. Multer handles 'uploads/' relative to the CWD if the folder exists. Let's just use it, and we will create the folder via command.
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

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

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No image uploaded' });
  }
  
  res.send({
    message: 'Image Uploaded',
    image: `/${req.file.path.replace(/\\/g, '/')}`,
  });
});

export default router;
