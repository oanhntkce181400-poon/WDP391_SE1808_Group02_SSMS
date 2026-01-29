// Tuition Fee Service - Logic xử lý học phí
const TuitionFee = require('../models/tuitionFee.model');
const Subject = require('../models/subject.model');

// Lấy danh sách học phí (có phân trang)
exports.getTuitionFees = async ({ page = 1, limit = 10, cohort, majorCode, academicYear }) => {
  const query = {};
  
  if (cohort) query.cohort = cohort;
  if (majorCode) query.majorCode = majorCode;
  if (academicYear) query.academicYear = academicYear;

  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    TuitionFee.find(query)
      .sort({ academicYear: -1, semester: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TuitionFee.countDocuments(query),
  ]);

  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// Lấy chi tiết học phí theo ID
exports.getTuitionFeeById = async (id) => {
  const tuitionFee = await TuitionFee.findById(id).populate('subjects.subjectId');
  if (!tuitionFee) {
    throw new Error('Không tìm thấy học phí');
  }
  return tuitionFee;
};

// Tạo học phí mới cho kỳ học
exports.createTuitionFee = async (data) => {
  const { semester, cohort, academicYear, majorCode, subjectIds } = data;

  // Lấy thông tin môn học
  const subjects = await Subject.find({ _id: { $in: subjectIds } });
  
  // Tính tổng tín chỉ và học phí
  let totalCredits = 0;
  let baseTuitionFee = 0;
  
  const semesterSubjects = subjects.map(subject => {
    totalCredits += subject.credits;
    const fee = subject.tuitionFee || subject.credits * 630000;
    baseTuitionFee += fee;
    
    return {
      subjectId: subject._id,
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
      credits: subject.credits,
      tuitionFee: fee,
    };
  });

  // Tạo tuition fee mới
  const tuitionFee = new TuitionFee({
    semester,
    cohort,
    academicYear,
    majorCode,
    subjects: semesterSubjects,
    totalCredits,
    baseTuitionFee,
    discounts: [],
    totalDiscount: 0,
    finalTuitionFee: baseTuitionFee,
    status: 'active',
  });

  await tuitionFee.save();
  return tuitionFee;
};

// Cập nhật học phí
exports.updateTuitionFee = async (id, data) => {
  const tuitionFee = await TuitionFee.findById(id);
  if (!tuitionFee) {
    throw new Error('Không tìm thấy học phí');
  }

  // Update fields
  Object.assign(tuitionFee, data);
  
  // Recalculate nếu có discount mới
  if (data.discounts) {
    tuitionFee.totalDiscount = tuitionFee.calculateTotalDiscount();
    tuitionFee.finalTuitionFee = tuitionFee.calculateFinalFee();
  }

  await tuitionFee.save();
  return tuitionFee;
};

// Thêm discount
exports.addDiscount = async (id, discountData) => {
  const tuitionFee = await TuitionFee.findById(id);
  if (!tuitionFee) {
    throw new Error('Không tìm thấy học phí');
  }

  tuitionFee.discounts.push(discountData);
  tuitionFee.totalDiscount = tuitionFee.calculateTotalDiscount();
  tuitionFee.finalTuitionFee = tuitionFee.calculateFinalFee();

  await tuitionFee.save();
  return tuitionFee;
};

// Xóa discount
exports.removeDiscount = async (id, discountId) => {
  const tuitionFee = await TuitionFee.findById(id);
  if (!tuitionFee) {
    throw new Error('Không tìm thấy học phí');
  }

  tuitionFee.discounts = tuitionFee.discounts.filter(
    d => d._id.toString() !== discountId
  );
  
  tuitionFee.totalDiscount = tuitionFee.calculateTotalDiscount();
  tuitionFee.finalTuitionFee = tuitionFee.calculateFinalFee();

  await tuitionFee.save();
  return tuitionFee;
};

// Xóa học phí
exports.deleteTuitionFee = async (id) => {
  const tuitionFee = await TuitionFee.findByIdAndDelete(id);
  if (!tuitionFee) {
    throw new Error('Không tìm thấy học phí');
  }
  return tuitionFee;
};

// Lấy summary theo cohort
exports.getSummaryByCohort = async (cohort, majorCode) => {
  const query = { cohort };
  if (majorCode) query.majorCode = majorCode;

  const tuitionFees = await TuitionFee.find(query);
  
  const summary = {
    cohort,
    majorCode,
    totalSemesters: tuitionFees.length,
    totalCredits: 0,
    totalBaseFee: 0,
    totalDiscount: 0,
    totalFinalFee: 0,
    semesters: tuitionFees.map(tf => ({
      semester: tf.semester,
      credits: tf.totalCredits,
      baseFee: tf.baseTuitionFee,
      discount: tf.totalDiscount,
      finalFee: tf.finalTuitionFee,
    })),
  };

  tuitionFees.forEach(tf => {
    summary.totalCredits += tf.totalCredits;
    summary.totalBaseFee += tf.baseTuitionFee;
    summary.totalDiscount += tf.totalDiscount;
    summary.totalFinalFee += tf.finalTuitionFee;
  });

  return summary;
};
