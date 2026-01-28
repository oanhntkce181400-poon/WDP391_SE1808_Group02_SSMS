const User = require('../models/user.model.js');

// Normalize cell value from Excel (handles objects, null, undefined)
const normalizeCellValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle Excel objects with text property (hyperlinks, rich text, etc)
  if (typeof value === 'object') {
    if (value.text) return value.text.toString().trim();
    if (value.hyperlink) return value.hyperlink.toString().trim();
    return '';
  }

  // Handle regular strings and numbers
  return value.toString().trim();
};

// Map column headers (support both English and Vietnamese)
const mapHeaders = (rawHeaders) => {
  const headerMap = {
    // English variations
    email: 'email',
    'e-mail': 'email',
    'email address': 'email',
    // Vietnamese variations
    'địa chỉ email': 'email',
    'email': 'email',
    
    fullname: 'fullName',
    'full name': 'fullName',
    'full_name': 'fullName',
    'họ tên': 'fullName',
    'tên đầy đủ': 'fullName',
    'name': 'fullName',
    'tên': 'fullName',
    
    role: 'role',
    'vai trò': 'role',
    'vị trí': 'role',
    
    status: 'status',
    'trạng thái': 'status',
    'tình trạng': 'status',
  };

  return rawHeaders.map((header) => {
    const normalized = normalizeCellValue(header).toLowerCase();
    return headerMap[normalized] || normalized;
  });
};

// Find header row (skip empty rows, find first non-empty row with data)
const findHeaderRowIndex = (worksheet) => {
  let headerRowIndex = 1;
  worksheet.eachRow((row, rowNumber) => {
    if (headerRowIndex === 1) {
      // Check if row has any non-empty cells
      let hasContent = false;
      row.eachCell((cell) => {
        if (cell.value) hasContent = true;
      });
      if (hasContent && !row.values.every((v) => !v)) {
        headerRowIndex = rowNumber;
      }
    }
  });
  return headerRowIndex;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Check if email already exists in database
const emailExists = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  return !!user;
};

// Validate user row data from Excel
const validateUserRow = (row, rowIndex) => {
  const errors = [];

  // Normalize values
  const email = normalizeCellValue(row.email);
  const fullName = normalizeCellValue(row.fullName);
  const role = normalizeCellValue(row.role).toLowerCase(); // LOWERCASE
  const status = normalizeCellValue(row.status).toLowerCase(); // LOWERCASE

  // Check required fields
  if (!email) {
    errors.push('Email không được để trống');
  } else if (!isValidEmail(email)) {
    errors.push(`Email không hợp lệ: ${email}`);
  }

  if (!fullName) {
    errors.push('Họ tên không được để trống');
  }

  if (role && !['admin', 'staff', 'student'].includes(role)) {
    errors.push(`Role không hợp lệ: ${role}. Phải là: admin, staff, student`);
  }

  if (status && !['active', 'inactive', 'blocked', 'pending'].includes(status)) {
    errors.push(`Status không hợp lệ: ${status}. Phải là: active, inactive, blocked, pending`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized: { email, fullName, role, status }, // Return normalized LOWERCASE values
  };
};

// Validate all rows before import
const validateImportRows = async (rows) => {
  const validRows = [];
  const invalidRows = [];
  const emails = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = i + 2; // Excel row index (1-based, plus header)

    // Validate format
    const validation = validateUserRow(row, rowIndex);
    if (!validation.isValid) {
      invalidRows.push({
        rowIndex,
        email: normalizeCellValue(row.email),
        fullName: normalizeCellValue(row.fullName),
        errors: validation.errors,
      });
      continue;
    }

    const email = validation.normalized.email;

    // Check for duplicate within import file
    if (emails.has(email)) {
      invalidRows.push({
        rowIndex,
        email,
        fullName: validation.normalized.fullName,
        errors: ['Email bị trùng trong file import'],
      });
      continue;
    }

    // Check for duplicate in database
    const exists = await emailExists(email);
    if (exists) {
      invalidRows.push({
        rowIndex,
        email,
        fullName: validation.normalized.fullName,
        errors: ['Email đã tồn tại trong hệ thống'],
      });
      continue;
    }

    emails.add(email);
    validRows.push({
      rowIndex,
      email,
      fullName: validation.normalized.fullName,
      role: validation.normalized.role || 'student',
      status: validation.normalized.status || 'active',
      authProvider: 'local',
      isActive: true,
    });
  }

  return {
    validRows,
    invalidRows,
  };
};

module.exports = {
  isValidEmail,
  emailExists,
  validateUserRow,
  validateImportRows,
  normalizeCellValue,
  mapHeaders,
  findHeaderRowIndex,
};
