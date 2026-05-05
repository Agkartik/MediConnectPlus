import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
// Note: Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are in .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file buffer to Cloudinary
 * @param {Buffer} buffer - The file buffer from Multer
 * @param {String} folder - Optional folder name in Cloudinary
 * @returns {Promise<Object>} - The Cloudinary upload result
 */
export const uploadToCloudinary = (buffer, folder = "mediconnect_profiles") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

export default cloudinary;
