const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadImage(filePathOrBuffer, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const defaultOptions = {
        folder: 'ssms',
        resource_type: 'image',
        ...options,
      };

      // If it's a buffer (from multer), use upload_stream
      if (Buffer.isBuffer(filePathOrBuffer)) {
        console.log('Uploading buffer to Cloudinary...');
        const uploadStream = cloudinary.uploader.upload_stream(
          defaultOptions,
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload stream error:', error);
              reject(new Error(`Failed to upload image: ${error.message}`));
            } else {
              console.log('Buffer uploaded successfully to Cloudinary');
              resolve({
                url: result.url,
                secure_url: result.secure_url,
                public_id: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
              });
            }
          }
        );
        uploadStream.end(filePathOrBuffer);
      } else {
        // If it's a file path string, use regular upload
        console.log('Uploading file path to Cloudinary...');
        cloudinary.uploader.upload(filePathOrBuffer, defaultOptions, (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error(`Failed to upload image: ${error.message}`));
          } else {
            console.log('File uploaded successfully to Cloudinary');
            resolve({
              url: result.url,
              secure_url: result.secure_url,
              public_id: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
            });
          }
        });
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      reject(new Error(`Failed to upload image: ${error.message}`));
    }
  });
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

/**
 * Upload any file (image, PDF, Word, etc.) to Cloudinary
 * @param {Buffer|String} filePathOrBuffer - File buffer or path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
function uploadFile(filePathOrBuffer, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const defaultOptions = {
        folder: 'ssms',
        resource_type: 'auto', // auto detect: image, raw, video
        ...options,
      };

      // If it's a buffer (from multer), use upload_stream
      if (Buffer.isBuffer(filePathOrBuffer)) {
        console.log('Uploading file buffer to Cloudinary...');
        const uploadStream = cloudinary.uploader.upload_stream(
          defaultOptions,
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload stream error:', error);
              reject(new Error(`Failed to upload file: ${error.message}`));
            } else {
              console.log('File buffer uploaded successfully to Cloudinary');
              resolve({
                url: result.url,
                secure_url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type,
                format: result.format,
                bytes: result.bytes,
              });
            }
          }
        );
        uploadStream.end(filePathOrBuffer);
      } else {
        // If it's a file path string, use regular upload
        console.log('Uploading file path to Cloudinary...');
        cloudinary.uploader.upload(filePathOrBuffer, defaultOptions, (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error(`Failed to upload file: ${error.message}`));
          } else {
            console.log('File uploaded successfully to Cloudinary');
            resolve({
              url: result.url,
              secure_url: result.secure_url,
              public_id: result.public_id,
              resource_type: result.resource_type,
              format: result.format,
              bytes: result.bytes,
            });
          }
        });
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      reject(new Error(`Failed to upload file: ${error.message}`));
    }
  });
}

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  deleteImages,
  uploadFile,
};