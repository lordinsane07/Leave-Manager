const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Multer stores file in memory (buffer) — we then upload to Cloudinary
const storage = multer.memoryStorage();

// File filter — only images
const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new ApiError(400, 'Only JPEG, PNG, WebP, and GIF images are allowed'), false);
    }
};

const uploadAvatar = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB max
    },
});

// Upload buffer to Cloudinary and return the secure URL
const uploadToCloudinary = (fileBuffer, userId) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'leave-manager/avatars',
                public_id: `avatar-${userId}-${Date.now()}`,
                transformation: [
                    { width: 300, height: 300, crop: 'fill', gravity: 'face' },
                    { quality: 'auto', fetch_format: 'auto' },
                ],
                overwrite: true,
            },
            (error, result) => {
                if (error) {
                    logger.error(`Cloudinary upload failed: ${error.message}`);
                    reject(new ApiError(500, 'Image upload failed'));
                } else {
                    resolve(result);
                }
            }
        );
        uploadStream.end(fileBuffer);
    });
};

// Delete an image from Cloudinary by public_id
const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        logger.warn(`Cloudinary delete failed for ${publicId}: ${err.message}`);
    }
};

module.exports = { uploadAvatar, uploadToCloudinary, deleteFromCloudinary };
