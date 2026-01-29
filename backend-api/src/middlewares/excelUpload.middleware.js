const multer = require('multer');

// Configure multer for Excel file upload
// Store files in memory (buffer) for processing
const storage = multer.memoryStorage();

// File filter to accept only Excel files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Only Excel files (.xlsx, .xls, .csv) are allowed',
      ),
      false,
    );
  }
};

// Multer configuration for Excel files
const excelUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = excelUpload;
