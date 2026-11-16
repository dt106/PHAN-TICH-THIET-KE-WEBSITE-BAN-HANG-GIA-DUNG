/**
 * Upload ảnh: Cloudinary nếu đã cấu hình, không thì lưu local vào DOCUMENT/uploads.
 */

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { Express } from "express";
import cloudinary from "../config/cloudinary";

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const cloudinaryReady = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  return Boolean(
    cloud_name &&
      api_key &&
      api_secret &&
      cloud_name !== "your_cloud_name" &&
      api_key !== "your_api_key" &&
      api_secret !== "your_api_secret",
  );
};

const saveLocal = async (file: Express.Multer.File, folder: string): Promise<string> => {
  const root = path.resolve(process.env.DOCUMENT_PATH || "./DOCUMENT");
  const relativeDir = path.join("uploads", folder.replace(/\\/g, "/"));
  const dir = path.join(root, relativeDir);
  await mkdir(dir, { recursive: true });

  const ext = EXT[file.mimetype] || path.extname(file.originalname) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, filename), file.buffer);

  // URL tương đối — frontend/admin proxy /uploads sang backend.
  return `/uploads/${folder.replace(/\\/g, "/")}/${filename}`.replace(/\/+/g, "/");
};

const saveCloudinary = async (file: Express.Multer.File, folder: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        use_filename: false,
        unique_filename: true,
      },
      (error, uploadResult) => {
        if (error) {
          return reject(new Error("Không thể tải ảnh lên Cloudinary."));
        }
        if (!uploadResult?.secure_url) {
          return reject(new Error("Cloudinary không trả về URL ảnh."));
        }
        resolve(uploadResult.secure_url);
      },
    );
    uploadStream.end(file.buffer);
  });

export const uploadImageService = async (
  file: Express.Multer.File,
  folder: string,
): Promise<string> => {
  if (!file) {
    throw new Error("Vui lòng chọn ảnh cần tải lên.");
  }
  if (!file.buffer || file.buffer.length === 0) {
    throw new Error("Dữ liệu ảnh không hợp lệ.");
  }

  if (cloudinaryReady()) {
    return saveCloudinary(file, folder);
  }
  return saveLocal(file, folder);
};
