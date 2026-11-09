/**
 * FILE: BACK_END/src/middlewares/upload.middleware.ts
 */

import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  callback,
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new Error(
        "Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG, WEBP hoặc GIF.",
      ),
    );
  }

  callback(null, true);
};

// Middleware cũ: giữ nguyên cho avatar customer/admin.
const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

// Middleware mới: upload một hoặc nhiều ảnh Product Media.
export const uploadMultipleImagesMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 20,
  },
});

export default uploadMiddleware;