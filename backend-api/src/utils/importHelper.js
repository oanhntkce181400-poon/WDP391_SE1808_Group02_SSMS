const { normalizeRole, isValidUserRole, VALID_USER_ROLES } = require('./role.util');
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

// Fuzzy match status (allow common typos)
const normalizeStatus = (status) => {
  const s = status.toLowerCase().trim();
  
  const statusMap = {
    'active': 'active',
    'actice': 'active', // common typo
    'activ': 'active',
    'avtive': 'active',
    'inactive': 'inactive',
    'inactiv': 'inactive',
    'blocked': 'blocked',
    'block': 'blocked',
    'pending': 'pending',
  };
  
  return statusMap[s] || s;
};

// Map column headers (support both English and Vietnamese)
const mapHeaders = (rawHeaders) => {
  const headerMap = {
    // English variations
    email: 'email',
    'e-mail': 'email',
    'email address': 'email',
    // Vietnamese variations
    'địa chềEemail': 'email',
    'email': 'email',
    
    fullname: 'fullName',
    'full name': 'fullName',
    'full_name': 'fullName',
    'hềEtên': 'fullName',
    'tên đầy đủ': 'fullName',
    'name': 'fullName',
    'tên': 'fullName',
    
    role: 'role',
    'vai trò': 'role',
    'vềEtrí': 'role',
    
    status: 'status',
    'trạng thái': 'status',
    'tình trạng': 'status',
  };

  return rawHeaders.map((header) => {
    const normalized = normalizeCellValue(header).toLowerCase();
    return headerMap[normalized] || normalized;
  });
};

// Find header row by detecting known header labels (email/fullName/role/status), fallback to first non-empty row.
const findHeaderRowIndex = (worksheet) => {
  let headerRowIndex = null;
  const requiredHeaderCandidates = ['email', 'fullName', 'role', 'status'];

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row || row.actualCellCount === 0) continue;

    const rawHeaders = [];
    row.eachCell({ includeEmpty: false }, (cell) => {
      rawHeaders.push(normalizeCellValue(cell.value));
    });

    if (rawHeaders.length === 0) continue;

    const mappedHeaders = mapHeaders(rawHeaders);
    const matched = mappedHeaders.filter((h) => requiredHeaderCandidates.includes(h));

    // Choose row with at least two recognized header columns.
    if (matched.length >= 2) {
      headerRowIndex = rowNumber;
      break;
    }

    // Keep first row containing at least email (fallback if no better rows)
    if (!headerRowIndex && mappedHeaders.includes('email')) {
      headerRowIndex = rowNumber;
    }
  }

  if (!headerRowIndex) {
    // Fallback: first non-empty row if no header-like row was found.
    for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      if (row && row.actualCellCount > 0) {
        headerRowIndex = rowNumber;
        break;
      }
    }
  }

  return headerRowIndex || 1;
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
  const role = normalizeRole(normalizeCellValue(row.role));
  const statusRaw = normalizeCellValue(row.status);
  const status = normalizeStatus(statusRaw); // Use normalizeStatus for fuzzy matching

  // Check required fields
  if (!email) {
    errors.push('Email không được đềEtrống');
  } else if (!isValidEmail(email)) {
    errors.push(`Email không hợp lềE ${email}`);
  }

  if (!fullName) {
    errors.push('HềEtên không được đềEtrống');
  }
  if (role && !isValidUserRole(role)) {
    errors.push(`Role khong hop le: ${role}. Phai la: ${VALID_USER_ROLES.join(', ')}`);
  }
  // Check status only if provided, using normalized value
  if (statusRaw && !['active', 'inactive', 'blocked', 'pending'].includes(status)) {
    errors.push(`Status không hợp lềE ${statusRaw}. Phải là: active, inactive, blocked, pending (typo như "actice" sẽ được fix)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized: { email, fullName, role, status: status || 'active' }, // Default to 'active' if not provided
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
        errors: ['Email bềEtrùng trong file import'],
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
        errors: ['Email đã tồn tại trong hềEthống'],
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
