const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadImage(filePath, options = {}) {
  try {
    const defaultOptions = {
      folder: 'ssms',
      resource_type: 'image',
      ...options,
    };

    const result = await cloudinary.uploader.upload(filePath, defaultOptions);

    return {
      url: result.url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

async function deleteImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'not found') {
      throw new Error('Image not found');
    }

    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

async function deleteImages(publicIds) {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    console.error('Cloudinary bulk delete error:', error);
    throw new Error(`Failed to delete images: ${error.message}`);
  }
}

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  deleteImages,
};
