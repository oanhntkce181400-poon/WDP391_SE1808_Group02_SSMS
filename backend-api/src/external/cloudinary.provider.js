const cloudinary = require('cloudinary').v2;

/**
 * Cấu hình Cloudinary với thông tin từ environment variables
 * Các biến môi trường cần thiết:
 * - CLOUDINARY_CLOUD_NAME: Tên cloud của bạn trên Cloudinary
 * - CLOUDINARY_API_KEY: API key từ Cloudinary dashboard
 * - CLOUDINARY_API_SECRET: API secret từ Cloudinary dashboard
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload ảnh lên Cloudinary
 * @param {string} filePath - Đường dẫn file hoặc base64 string hoặc buffer
 * @param {object} options - Các options bổ sung cho upload
 * @param {string} options.folder - Thư mục lưu trữ trên Cloudinary (mặc định: 'ssms')
 * @param {string} options.public_id - ID tùy chỉnh cho ảnh
 * @returns {Promise<object>} - Thông tin ảnh đã upload (url, public_id, secure_url, etc.)
 * 
 * Ví dụ sử dụng:
 * const result = await uploadImage(file.path, { folder: 'avatars' });
 * console.log(result.secure_url); // URL HTTPS của ảnh
 * console.log(result.public_id);  // ID để xóa ảnh sau này
 */
async function uploadImage(filePath, options = {}) {
  try {
    const defaultOptions = {
      folder: 'ssms', // Thư mục mặc định
      resource_type: 'image', // Loại tài nguyên: image, video, raw, auto
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

/**
 * Xóa ảnh từ Cloudinary
 * @param {string} publicId - Public ID của ảnh cần xóa (lấy từ kết quả uploadImage)
 * @returns {Promise<object>} - Kết quả xóa { result: 'ok' hoặc 'not found' }
 * 
 * Ví dụ sử dụng:
 * await deleteImage('ssms/avatar_abc123');
 */
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

/**
 * Xóa nhiều ảnh cùng lúc
 * @param {string[]} publicIds - Mảng các public_id cần xóa
 * @returns {Promise<object>} - Kết quả xóa
 */
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
