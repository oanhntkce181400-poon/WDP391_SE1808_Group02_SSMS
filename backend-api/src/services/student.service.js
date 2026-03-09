// student.service.js
// Service xử lý logic nghiệp vụ cho Student
// Tác giả: Group02 - WDP391

const Student = require('../models/student.model');
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const Major = require('../models/major.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const bcrypt = require('bcryptjs');

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
  getStudents,
  getStudentById,
  getStudentByUserId,
  updateStudent,
  deleteStudent,
  getMajorsForFilter,
  getCohortsForFilter,
  getSuggestedClassSection,
};
