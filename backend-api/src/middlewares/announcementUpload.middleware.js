const multer = require('multer');

/**
 * Middleware upload file cho announcement
 * Chấp nhận nhiều loại file: images, PDF, Word, Excel, etc.
 * Store trong memory để upload lên Cloudinary
 */

// Lưu file vào memory (buffer) để upload trực tiếp lên Cloudinary
const storage = multer.memoryStorage();

// File filter - chấp nhận nhiều loại file
const fileFilter = (req, file, cb) => {
  // Danh sách các MIME types được phép
  const allowedMimes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint', // .ppt
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    // Text
    'text/plain',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'File type not allowed. Allowed: images, PDF, Word, Excel, PowerPoint, text, ZIP'
      ),
      false
    );
  }
};

// Cấu hình multer
const announcementUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

module.exports = announcementUpload;
