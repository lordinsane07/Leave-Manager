const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

// Configures Cloudinary SDK with credentials from environment
const configureCloudinary = () => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    logger.info('Cloudinary configured');
};

module.exports = { cloudinary, configureCloudinary };
