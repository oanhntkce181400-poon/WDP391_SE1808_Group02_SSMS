// student.service.js
// Service xử lý logic nghiệp vụ cho Student
// Tác giả: Group02 - WDP391

const Student = require('../models/student.model');
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const Major = require('../models/major.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');

// Export files use human-readable labels instead of raw enum values from MongoDB.
const EXPORT_STATUS_LABELS = {
  enrolled: 'Enrolled',
  'on-leave': 'On leave',
  dropped: 'Dropped',
  graduated: 'Graduated',
};

/*
 * Centralize filter building so the student list API and export API always
 * interpret search/major/cohort/status in exactly the same way.
 */
function buildStudentFilterQuery(filters = {}) {
  const majorCode = filters.majorCode || filters.major;
  const academicStatus = filters.academicStatus || filters.status;
  const query = { isActive: true };

  if (majorCode) {
    query.majorCode = majorCode;
  }

  if (filters.cohort) {
    query.cohort = parseInt(filters.cohort, 10);
  }

  if (academicStatus) {
    query.academicStatus = academicStatus;
  }

  if (filters.search && filters.search.trim()) {
    query.$or = [
      { studentCode: { $regex: filters.search.trim(), $options: 'i' } },
      { fullName: { $regex: filters.search.trim(), $options: 'i' } },
      { identityNumber: { $regex: filters.search.trim(), $options: 'i' } },
    ];
  }

  return query;
}

// Restrict sorting to approved fields so clients cannot request arbitrary Mongo keys.
function buildStudentSort(filters = {}) {
  const allowedFields = new Set([
    'studentCode',
    'fullName',
    'majorCode',
    'cohort',
    'academicStatus',
    'createdAt',
    'updatedAt',
  ]);

  const sortBy = allowedFields.has(filters.sortBy) ? filters.sortBy : 'studentCode';
  const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

  return { [sortBy]: sortOrder };
}

/*
 * Shared data fetcher for both paginated listing and full export. `skip` / `limit`
 * stay optional so export can fetch the full filtered dataset without pagination.
 */
async function findStudentsByFilters(filters = {}, options = {}) {
  const query = buildStudentFilterQuery(filters);
  const sort = buildStudentSort(filters);

  let cursor = Student.find(query).sort(sort);

  if (typeof options.skip === 'number' && options.skip > 0) {
    cursor = cursor.skip(options.skip);
  }

  if (typeof options.limit === 'number' && options.limit > 0) {
    cursor = cursor.limit(options.limit);
  }

  return cursor.lean();
}

// Flatten a student document into a clean row structure that both Excel and PDF can reuse.
function formatStudentExportRow(student = {}) {
  return {
    studentCode: student.studentCode || '',
    fullName: student.fullName || '',
    email: student.email || '',
    phoneNumber: student.phoneNumber || '',
    majorCode: student.majorCode || '',
    cohortLabel: student.cohort ? `K${student.cohort}` : '',
    classSection: student.classSection || '',
    academicStatus: EXPORT_STATUS_LABELS[student.academicStatus] || student.academicStatus || '',
    identityNumber: student.identityNumber || '',
    enrollmentYear: student.enrollmentYear || '',
    createdAt: student.createdAt ? new Date(student.createdAt).toISOString().slice(0, 10) : '',
  };
}

// Timestamp is embedded into export filenames so downloaded files remain unique and traceable.
function buildExportTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// The manual PDF builder only supports ASCII text safely, so we normalize early.
function normalizeAscii(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Escape PDF control characters before injecting text into content streams.
function escapePdfText(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

// Long lines are wrapped manually because the lightweight PDF stream below has no layout engine.
function wrapPdfText(text, maxChars = 92) {
  const normalized = normalizeAscii(text);
  if (!normalized) return [''];
  if (normalized.length <= maxChars) return [normalized];

  const words = normalized.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
      continue;
    }

    const candidate = `${currentLine} ${word}`;
    if (candidate.length <= maxChars) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/*
 * We generate a minimal PDF buffer by hand instead of pulling in a heavier PDF library.
 * The output is simple but enough for tabular admin exports:
 * - one built-in Helvetica font,
 * - multiple pages when needed,
 * - text rows placed line-by-line.
 */
function buildPdfBuffer(lines = []) {
  const linesPerPage = 48;
  const pages = [];

  // Split raw lines into page-sized chunks before building low-level PDF objects.
  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }

  if (pages.length === 0) {
    pages.push(['Student export report', '', 'No student records matched the selected filters.']);
  }

  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  const kids = [];
  let objectId = 4;

  pages.forEach((pageLines) => {
    const pageObjectId = objectId++;
    const contentObjectId = objectId++;
    kids.push(`${pageObjectId} 0 R`);

    // Text commands: begin text object, select font, move to top margin, then print line by line.
    const streamLines = [
      'BT',
      '/F1 10 Tf',
      '50 790 Td',
      '14 TL',
    ];

    pageLines.forEach((line, lineIndex) => {
      streamLines.push(`${lineIndex === 0 ? '' : 'T* ' }(${escapePdfText(line)}) Tj`.trim());
    });

    streamLines.push('ET');

    const stream = streamLines.join('\n');
    objects[contentObjectId] = `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`;
    objects[pageObjectId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
  });

  objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;

  // Assemble PDF objects and keep byte offsets so the xref table points to every object correctly.
  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    if (!objects[index]) continue;
    offsets[index] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < objects.length; index += 1) {
    const offset = offsets[index] || 0;
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

// Excel export is the richer format, so we add column widths, a styled header row, and an auto filter.
async function generateStudentExcelBuffer(rows = []) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');

  worksheet.columns = [
    { header: 'Student Code', key: 'studentCode', width: 18 },
    { header: 'Full Name', key: 'fullName', width: 28 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phoneNumber', width: 16 },
    { header: 'Major', key: 'majorCode', width: 12 },
    { header: 'Cohort', key: 'cohortLabel', width: 10 },
    { header: 'Class Section', key: 'classSection', width: 16 },
    { header: 'Status', key: 'academicStatus', width: 14 },
    { header: 'Identity Number', key: 'identityNumber', width: 20 },
    { header: 'Enrollment Year', key: 'enrollmentYear', width: 16 },
    { header: 'Created At', key: 'createdAt', width: 14 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1D4ED8' },
  };

  rows.forEach((row) => worksheet.addRow(row));
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = {
    from: 'A1',
    to: 'K1',
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/*
 * PDF export trades styling for portability. Each student becomes a small text block
 * so admins can still read the file comfortably when opening it on any device.
 */
function generateStudentPdfBuffer(rows = [], filters = {}) {
  const filterParts = [];
  if (filters.cohort) filterParts.push(`Cohort: K${filters.cohort}`);
  if (filters.majorCode || filters.major) filterParts.push(`Major: ${filters.majorCode || filters.major}`);
  if (filters.academicStatus || filters.status) {
    const statusKey = filters.academicStatus || filters.status;
    filterParts.push(`Status: ${EXPORT_STATUS_LABELS[statusKey] || statusKey}`);
  }

  const lines = [
    'Student export report',
    `Generated at: ${new Date().toISOString()}`,
    filterParts.length > 0 ? `Filters: ${filterParts.join(' | ')}` : 'Filters: none',
    '',
  ];

  if (rows.length === 0) {
    lines.push('No student records matched the selected filters.');
    return buildPdfBuffer(lines);
  }

  rows.forEach((row, index) => {
    const mainLine = `${index + 1}. ${row.studentCode} | ${row.fullName} | ${row.majorCode} | ${row.cohortLabel} | ${row.academicStatus}`;
    const detailLine = `   Email: ${row.email || '-'} | Phone: ${row.phoneNumber || '-'} | Class: ${row.classSection || '-'} | ID: ${row.identityNumber || '-'}`;
    const metaLine = `   Enrollment year: ${row.enrollmentYear || '-'} | Created: ${row.createdAt || '-'}`;

    wrapPdfText(mainLine).forEach((line) => lines.push(line));
    wrapPdfText(detailLine).forEach((line) => lines.push(line));
    wrapPdfText(metaLine).forEach((line) => lines.push(line));
    lines.push('');
  });

  return buildPdfBuffer(lines);
}

/*
 * Main export coordinator:
 * 1. validate requested format,
 * 2. fetch the fully filtered dataset,
 * 3. map documents into flat export rows,
 * 4. delegate to Excel or PDF formatter,
 * 5. return buffer + headers so the controller can send it directly.
 */
async function exportStudents(filters = {}) {
  const format = String(filters.format || 'excel').toLowerCase();
  if (!['excel', 'pdf'].includes(format)) {
    const error = new Error('Unsupported export format. Use excel or pdf.');
    error.statusCode = 400;
    throw error;
  }

  const students = await findStudentsByFilters(filters);
  const rows = students.map(formatStudentExportRow);
  const timestamp = buildExportTimestamp();

  if (format === 'pdf') {
    return {
      buffer: generateStudentPdfBuffer(rows, filters),
      contentType: 'application/pdf',
      fileName: `students-export-${timestamp}.pdf`,
    };
  }

  return {
    buffer: await generateStudentExcelBuffer(rows),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileName: `students-export-${timestamp}.xlsx`,
  };
}

// ─────────────────────────────────────────────────────────────
// HELPER: Tạo mã sinh viên tự động
// Format: {MajorCode}{Year}{Sequential} - VD: SE181234
// ─────────────────────────────────────────────────────────────
async function generateStudentCode(majorCode, enrollmentYear) {
  // Lấy 2 số cuối của năm: 2024 -> 24
  const yearSuffix = String(enrollmentYear).slice(-2);
  
  // Prefix: SE24, AI24...
  const prefix = `${majorCode}${yearSuffix}`;
  
  // Tìm sinh viên có mã lớn nhất với prefix này
  const lastStudent = await Student.findOne({ 
    studentCode: new RegExp(`^${prefix}`) 
  })
    .sort({ studentCode: -1 })
    .select('studentCode')
    .lean();
  
  let sequential = 1;
  if (lastStudent) {
    // Extract số thứ tự từ mã cuối: SE241234 -> 1234
    const lastSeq = parseInt(lastStudent.studentCode.substring(prefix.length));
    if (!isNaN(lastSeq)) {
      sequential = lastSeq + 1;
    }
  }
  
  // Pad 4 chữ số: 1 -> 0001
  const seqStr = String(sequential).padStart(4, '0');
  
  return `${prefix}${seqStr}`;
}

// ─────────────────────────────────────────────────────────────
// HELPER: Gợi ý lớp sinh hoạt dựa trên ngành học
// ─────────────────────────────────────────────────────────────
async function suggestClassSection(majorCode, cohort) {
  // Logic: Tìm lớp có ít sinh viên nhất cùng ngành và khóa
  const students = await Student.find({ 
    majorCode, 
    cohort,
    classSection: { $ne: null }
  }).select('classSection').lean();
  
  // Đếm số lượng sinh viên trong mỗi lớp
  const classCounts = {};
  students.forEach(s => {
    if (s.classSection) {
      classCounts[s.classSection] = (classCounts[s.classSection] || 0) + 1;
    }
  });
  
  // Nếu chưa có lớp nào, tạo lớp mới
  if (Object.keys(classCounts).length === 0) {
    const yearSuffix = String(cohort).slice(-2);
    return `${majorCode}${yearSuffix}01`; // SE1801
  }
  
  // Tìm lớp có ít sinh viên nhất
  const minClass = Object.entries(classCounts)
    .sort((a, b) => a[1] - b[1])[0][0];
  
  // Nếu lớp ít nhất đã đầy (>= 30), tạo lớp mới
  if (classCounts[minClass] >= 30) {
    const classNumbers = Object.keys(classCounts)
      .map(c => parseInt(c.slice(-2)))
      .filter(n => !isNaN(n));
    const maxNum = Math.max(...classNumbers);
    const yearSuffix = String(cohort).slice(-2);
    return `${majorCode}${yearSuffix}${String(maxNum + 1).padStart(2, '0')}`;
  }
  
  return minClass;
}

// ─────────────────────────────────────────────────────────────
// HELPER: Tạo email tự động theo format FPT
// Format: firstname + lastname_initials + studentCode@fpt.edu.vn
// VD: Nguyễn Văn Minh + SE241234 => minhNVSE241234@fpt.edu.vn
// ─────────────────────────────────────────────────────────────
function generateEmail(fullName, studentCode) {
  // Loại bỏ dấu tiếng Việt
  const removeVietnameseTones = (str) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  // Tách họ tên thành mảng
  const nameParts = fullName.trim().split(/\s+/);
  
  if (nameParts.length === 0) return '';
  
  // Lấy tên (phần cuối)
  const firstName = nameParts[nameParts.length - 1];
  
  // Lấy họ và tên đệm (các phần trước tên)
  const lastNameParts = nameParts.slice(0, -1);
  
  // Tạo initials từ họ và tên đệm
  const initials = lastNameParts.map(part => part.charAt(0).toUpperCase()).join('');
  
  // Loại bỏ dấu và chuyển thành chữ thường cho firstname
  const firstNameNormalized = removeVietnameseTones(firstName).toLowerCase();
  
  // Tạo email
  return `${firstNameNormalized}${initials}${studentCode}@fpt.edu.vn`;
}

// ─────────────────────────────────────────────────────────────
// HELPER: Tạo mật khẩu ngẫu nhiên mạnh
// ─────────────────────────────────────────────────────────────
function generateRandomPassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  // Đảm bảo có ít nhất 1 ký tự mỗi loại
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Thêm các ký tự ngẫu nhiên còn lại
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Xáo trộn password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// ─────────────────────────────────────────────────────────────
// HELPER: Tính Khóa từ Năm nhập học
// Lấy 2 số cuối, nếu là 00 thì lấy 2 số đầu
// VD: 2026 -> '26', 2000 -> '20', 2100 -> '21'
// ─────────────────────────────────────────────────────────────
function calculateCohort(enrollmentYear) {
  const yearStr = String(enrollmentYear);
  const lastTwo = yearStr.slice(-2);
  
  // Nếu 2 số cuối là '00', lấy 2 số đầu
  if (lastTwo === '00') {
    return yearStr.slice(0, 2);
  }
  
  // Ngược lại, lấy 2 số cuối
  return lastTwo;
}

// ─────────────────────────────────────────────────────────────
// 1. TẠO SINH VIÊN MỚI
// Logic: Tạo Student -> Tạo User Account -> Tạo Wallet
// ─────────────────────────────────────────────────────────────
async function createStudent(payload, createdById) {
  const {
    fullName,
    majorCode,
    identityNumber,
    dateOfBirth,
    phoneNumber,
    address,
    gender,
    enrollmentYear,
  } = payload;

  // Tự động tính Khóa từ Năm nhập học
  const cohort = payload.cohort || calculateCohort(enrollmentYear);

  // Validate major exists
  const major = await Major.findOne({ majorCode, isActive: true });
  if (!major) {
    const error = new Error('Ngành học không tồn tại hoặc đã bị vô hiệu hóa');
    error.statusCode = 400;
    throw error;
  }

  // Sanitize: chuyển empty string thành null
  const sanitizedIdentityNumber = identityNumber && identityNumber.trim() !== '' 
    ? identityNumber.trim() 
    : undefined; // Dùng undefined thay vì null để MongoDB sparse index bỏ qua

  // Check CCCD đã tồn tại chưa (nếu có)
  if (sanitizedIdentityNumber) {
    const existingId = await Student.findOne({ identityNumber: sanitizedIdentityNumber });
    if (existingId) {
      const error = new Error('Số CCCD/CMND đã được sử dụng');
      error.statusCode = 400;
      throw error;
    }
  }

  // Tạo mã sinh viên tự động
  const studentCode = await generateStudentCode(majorCode, enrollmentYear || cohort);
  
  // Tạo email tự động theo format FPT
  const email = generateEmail(fullName, studentCode);
  
  // Generate random password cho email
  const emailPassword = generateRandomPassword(12);
  
  // Check email đã tồn tại trong User hoặc Student chưa (trường hợp hiếm gặp)
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('Email tự động tạo ra đã tồn tại, vui lòng thử lại');
    error.statusCode = 400;
    throw error;
  }

  const existingStudent = await Student.findOne({ email });
  if (existingStudent) {
    const error = new Error('Email tự động tạo ra đã tồn tại, vui lòng thử lại');
    error.statusCode = 400;
    throw error;
  }
  
  // Gợi ý lớp sinh hoạt
  const classSection = await suggestClassSection(majorCode, cohort);

  // 1. Tạo User Account
  const defaultPassword = sanitizedIdentityNumber || '123456'; // Mật khẩu hệ thống = CCCD hoặc 123456
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  
  const newUser = await User.create({
    email,
    password: hashedPassword,
    fullName,
    authProvider: 'local',
    role: 'student',
    mustChangePassword: true, // Bắt đổi mật khẩu lần đầu
    status: 'active',
    createdBy: createdById,
  });

  // 2. Tạo Student - chỉ thêm identityNumber nếu có giá trị
  const studentData = {
    studentCode,
    fullName,
    email,
    majorCode,
    cohort,
    dateOfBirth,
    phoneNumber,
    address,
    gender,
    classSection,
    academicStatus: 'enrolled',
    enrollmentYear: enrollmentYear || cohort,
    userId: newUser._id,
    isActive: true,
    createdBy: createdById,
  };

  // Chỉ thêm identityNumber nếu có giá trị
  if (sanitizedIdentityNumber) {
    studentData.identityNumber = sanitizedIdentityNumber;
  }

  const newStudent = await Student.create(studentData);

  // 3. Tạo Wallet với số dư 0 VND
  await Wallet.create({
    userId: newUser._id,
    balance: 0,
    currency: 'VND',
    status: 'active',
  });

  // TODO: Gửi email thông báo cho sinh viên
  // await sendWelcomeEmail(email, fullName, studentCode, defaultPassword, emailPassword);
  
  return {
    ...newStudent.toObject(),
    defaultPassword, // Mật khẩu hệ thống
    emailPassword,   // Mật khẩu email (để admin thông báo cho sinh viên)
  };
}

// ─────────────────────────────────────────────────────────────
// 2. LẤY DANH SÁCH SINH VIÊN (có filter và search)
// Filter: majorCode, cohort, academicStatus
// Search: studentCode, fullName, identityNumber
// ─────────────────────────────────────────────────────────────
async function getStudents(filters = {}) {
  const {
    search,
    majorCode,
    cohort,
    academicStatus,
    page = 1,
    limit = 20,
    sortBy = 'studentCode', // studentCode hoặc fullName
    sortOrder = 'asc',
  } = filters;

  // Build query
  const query = { isActive: true };

  // Filter theo ngành
  if (majorCode) {
    query.majorCode = majorCode;
  }

  // Filter theo khóa (K18, K19, K20)
  if (cohort) {
    query.cohort = parseInt(cohort);
  }

  // Filter theo trạng thái học tập
  if (academicStatus) {
    query.academicStatus = academicStatus;
  }

  // Search theo MSSV hoặc CCCD/CMND hoặc Tên
  if (search && search.trim()) {
    query.$or = [
      { studentCode: { $regex: search.trim(), $options: 'i' } },
      { fullName: { $regex: search.trim(), $options: 'i' } },
      { identityNumber: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  // Sorting
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Pagination
  const skip = (page - 1) * limit;

  // Execute query
  const [students, total] = await Promise.all([
    Student.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Student.countDocuments(query),
  ]);

  return {
    students,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
}

/*
 * Paginated student listing intentionally reuses the same helpers as export so
 * the admin table and downloaded report always describe the same dataset.
 */
async function getStudentsList(filters = {}) {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.max(1, parseInt(filters.limit, 10) || 20);
  const query = buildStudentFilterQuery(filters);
  const skip = (page - 1) * limit;

  // Reuse the same query helper as export so list totals and export totals always describe the same dataset.
  const [students, total] = await Promise.all([
    findStudentsByFilters(filters, { skip, limit }),
    Student.countDocuments(query),
  ]);

  return {
    students,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// 3. LẤY CHI TIẾT SINH VIÊN
// ─────────────────────────────────────────────────────────────
async function getStudentById(studentId) {
  const student = await Student.findById(studentId)
    .populate('userId', 'email status lastLoginAt')
    .populate('createdBy', 'fullName email')
    .populate('updatedBy', 'fullName email')
    .lean();

  if (!student) {
    const error = new Error('Không tìm thấy sinh viên');
    error.statusCode = 404;
    throw error;
  }

  // Lấy thông tin ví điện tử
  if (student.userId) {
    const wallet = await Wallet.findOne({ userId: student.userId }).lean();
    student.wallet = wallet;
  }

  // Lấy số lượng lớp đã đăng ký
  const enrollmentCount = await ClassEnrollment.countDocuments({ 
    student: studentId,
    status: { $in: ['enrolled', 'completed'] }
  });
  student.enrollmentCount = enrollmentCount;

  return student;
}

// ─────────────────────────────────────────────────────────────
// 4. CẬP NHẬT SINH VIÊN
// Cập nhật thông tin cá nhân và trạng thái học tập
// ─────────────────────────────────────────────────────────────
async function updateStudent(studentId, payload, updatedById) {
  const student = await Student.findById(studentId);
  
  if (!student) {
    const error = new Error('Không tìm thấy sinh viên');
    error.statusCode = 404;
    throw error;
  }

  // Các field được phép cập nhật
  const allowedUpdates = [
    'fullName',
    'phoneNumber',
    'address',
    'dateOfBirth',
    'gender',
    'classSection',
    'academicStatus',
    'identityNumber',
  ];

  // Kiểm tra email trùng (nếu thay đổi)
  if (payload.email && payload.email !== student.email) {
    const existingEmail = await Student.findOne({ 
      email: payload.email,
      _id: { $ne: studentId }
    });
    if (existingEmail) {
      const error = new Error('Email đã được sử dụng');
      error.statusCode = 400;
      throw error;
    }
    student.email = payload.email;
    
    // Cập nhật email trong User
    if (student.userId) {
      await User.findByIdAndUpdate(student.userId, { email: payload.email });
    }
  }

  // Kiểm tra CCCD trùng (nếu thay đổi)
  const sanitizedIdentityNumber = payload.identityNumber && payload.identityNumber.trim() !== '' 
    ? payload.identityNumber.trim() 
    : undefined; // Dùng undefined thay vì null
    
  if (sanitizedIdentityNumber && sanitizedIdentityNumber !== student.identityNumber) {
    const existingId = await Student.findOne({ 
      identityNumber: sanitizedIdentityNumber,
      _id: { $ne: studentId }
    });
    if (existingId) {
      const error = new Error('Số CCCD/CMND đã được sử dụng');
      error.statusCode = 400;
      throw error;
    }
    student.identityNumber = sanitizedIdentityNumber;
  } else if (payload.identityNumber === '' || payload.identityNumber === null) {
    // Nếu xóa CCCD (set thành empty), unset field này
    student.identityNumber = undefined;
  }

  // Ngành học + majorId (đồng bộ khi đổi ngành hoặc bản ghi cũ chưa có majorId)
  if (payload.majorCode !== undefined && String(payload.majorCode).trim() !== '') {
    const nextMajor = String(payload.majorCode).trim();
    if (nextMajor !== student.majorCode || !student.majorId) {
      const major = await Major.findOne({ majorCode: nextMajor, isActive: true });
      if (!major) {
        const error = new Error('Ngành học không tồn tại hoặc đã bị vô hiệu hóa');
        error.statusCode = 400;
        throw error;
      }
      student.majorCode = nextMajor;
      student.majorId = major._id;
    }
  }

  // Năm nhập học + khóa (cohort) — MSSV không đổi khi sửa
  if (
    payload.enrollmentYear !== undefined &&
    payload.enrollmentYear !== null &&
    String(payload.enrollmentYear).trim() !== ''
  ) {
    const y = parseInt(String(payload.enrollmentYear).trim(), 10);
    if (!Number.isNaN(y)) {
      student.enrollmentYear = y;
      let nextCohort;
      if (
        payload.cohort !== undefined &&
        payload.cohort !== null &&
        String(payload.cohort).trim() !== ''
      ) {
        nextCohort = parseInt(String(payload.cohort).trim(), 10);
      } else {
        nextCohort = parseInt(calculateCohort(y), 10);
      }
      if (!Number.isNaN(nextCohort)) {
        student.cohort = nextCohort;
      }
    }
  }

  // Cập nhật các field
  allowedUpdates.forEach(field => {
    if (payload[field] !== undefined && field !== 'identityNumber') {
      student[field] = payload[field];
    }
  });

  student.updatedBy = updatedById;
  await student.save();

  // Cập nhật fullName trong User nếu thay đổi
  if (payload.fullName && student.userId) {
    await User.findByIdAndUpdate(student.userId, { fullName: payload.fullName });
  }
  
  return student;
}

// ─────────────────────────────────────────────────────────────
// 5. XÓA SINH VIÊN (Soft delete)
// Kiểm tra ràng buộc: không xóa nếu đang có đăng ký lớp học
// ─────────────────────────────────────────────────────────────
async function deleteStudent(studentId, deletedById) {
  const student = await Student.findById(studentId);
  
  if (!student) {
    const error = new Error('Không tìm thấy sinh viên');
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra xem sinh viên có đang đăng ký lớp học không
  const activeEnrollments = await ClassEnrollment.countDocuments({
    student: studentId,
    status: 'enrolled'
  });

  if (activeEnrollments > 0) {
    const error = new Error(
      `Không thể xóa sinh viên đang có ${activeEnrollments} lớp học đang đăng ký. ` +
      'Vui lòng hủy đăng ký các lớp trước.'
    );
    error.statusCode = 400;
    throw error;
  }

  // Soft delete: chỉ đánh dấu isActive = false
  student.isActive = false;
  student.updatedBy = deletedById;
  await student.save();

  // Vô hiệu hóa User account
  if (student.userId) {
    await User.findByIdAndUpdate(student.userId, { 
      status: 'inactive',
      isActive: false 
    });
  }

  return { message: 'Xóa sinh viên thành công' };
}

// ─────────────────────────────────────────────────────────────
// 6. LẤY DANH SÁCH NGÀNH HỌC (để dropdown filter)
// ─────────────────────────────────────────────────────────────
async function getMajorsForFilter() {
  const majors = await Major.find({ isActive: true })
    .select('majorCode majorName')
    .sort({ majorCode: 1 })
    .lean();
  
  return majors;
}

// ─────────────────────────────────────────────────────────────
// 7. LẤY DANH SÁCH KHÓA (COHORT) có trong hệ thống
// ─────────────────────────────────────────────────────────────
async function getCohortsForFilter() {
  const cohorts = await Student.distinct('cohort');
  return cohorts.sort((a, b) => b - a); // Sắp xếp giảm dần (mới nhất trước)
}

// ─────────────────────────────────────────────────────────────
// 8. GỢI Ý LỚP SINH HOẠT (API endpoint riêng)
// ─────────────────────────────────────────────────────────────
async function getSuggestedClassSection(majorCode, cohort) {
  const major = await Major.findOne({ majorCode, isActive: true });
  if (!major) {
    const error = new Error('Ngành học không hợp lệ');
    error.statusCode = 400;
    throw error;
  }

  const suggested = await suggestClassSection(majorCode, cohort);
  
  return {
    classSection: suggested,
    majorCode,
    cohort,
  };
}

// GET /api/students/me - Lấy thông tin sinh viên hiện tại qua userId
async function getStudentByUserId(userId) {
  const student = await Student.findOne({ userId }).lean();
  
  if (!student) {
    return null;
  }

  return student;
}

module.exports = {
  createStudent,
  getStudents: getStudentsList,
  exportStudents,
  getStudentById,
  getStudentByUserId,
  updateStudent,
  deleteStudent,
  getMajorsForFilter,
  getCohortsForFilter,
  getSuggestedClassSection,
};
