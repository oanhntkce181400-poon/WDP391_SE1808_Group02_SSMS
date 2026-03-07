require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('../../configs/db.config');
const Teacher = require('../../models/teacher.model');

const teachersData = [
  { teacherCode: "GV001", fullName: "Nguyễn Văn An", email: "an.nguyen@uni.edu.vn", phone: "0901000001", department: "CNTT", specialization: "Kỹ thuật phần mềm", degree: "masters", gender: "male" },
  { teacherCode: "GV002", fullName: "Trần Thị Lan", email: "lan.tran@uni.edu.vn", phone: "0901000002", department: "CNTT", specialization: "Kỹ thuật phần mềm", degree: "masters", gender: "female" },
  { teacherCode: "GV003", fullName: "Lê Minh Hoàng", email: "hoang.le@uni.edu.vn", phone: "0901000003", department: "CNTT", specialization: "Trí tuệ nhân tạo", degree: "phd", gender: "male" },
  { teacherCode: "GV004", fullName: "Phạm Thu Hà", email: "ha.pham@uni.edu.vn", phone: "0901000004", department: "CNTT", specialization: "Trí tuệ nhân tạo", degree: "masters", gender: "female" },
  { teacherCode: "GV005", fullName: "Võ Quốc Bảo", email: "bao.vo@uni.edu.vn", phone: "0901000005", department: "CNTT", specialization: "Khoa học dữ liệu", degree: "masters", gender: "male" },
  { teacherCode: "GV006", fullName: "Nguyễn Thị Hồng", email: "hong.nguyen@uni.edu.vn", phone: "0901000006", department: "CNTT", specialization: "Khoa học dữ liệu", degree: "masters", gender: "female" },
  { teacherCode: "GV007", fullName: "Trần Quốc Tuấn", email: "tuan.tran@uni.edu.vn", phone: "0901000007", department: "CNTT", specialization: "An ninh mạng", degree: "phd", gender: "male" },
  { teacherCode: "GV008", fullName: "Lê Thị Mai", email: "mai.le@uni.edu.vn", phone: "0901000008", department: "CNTT", specialization: "An ninh mạng", degree: "masters", gender: "female" },
  { teacherCode: "GV009", fullName: "Phan Văn Đức", email: "duc.phan@uni.edu.vn", phone: "0901000009", department: "CNTT", specialization: "Phát triển Web", degree: "masters", gender: "male" },
  { teacherCode: "GV010", fullName: "Nguyễn Thị Trang", email: "trang.nguyen@uni.edu.vn", phone: "0901000010", department: "CNTT", specialization: "Phát triển Web", degree: "masters", gender: "female" },
  { teacherCode: "GV011", fullName: "Đỗ Minh Tâm", email: "tam.do@uni.edu.vn", phone: "0901000011", department: "QTKD", specialization: "Marketing", degree: "masters", gender: "male" },
  { teacherCode: "GV012", fullName: "Huỳnh Thị Thảo", email: "thao.huynh@uni.edu.vn", phone: "0901000012", department: "QTKD", specialization: "Marketing", degree: "masters", gender: "female" },
  { teacherCode: "GV013", fullName: "Phạm Quốc Huy", email: "huy.pham@uni.edu.vn", phone: "0901000013", department: "QTKD", specialization: "Quản trị doanh nghiệp", degree: "phd", gender: "male" },
  { teacherCode: "GV014", fullName: "Trương Mỹ Linh", email: "linh.truong@uni.edu.vn", phone: "0901000014", department: "QTKD", specialization: "Quản trị doanh nghiệp", degree: "masters", gender: "female" },
  { teacherCode: "GV015", fullName: "Bùi Văn Long", email: "long.bui@uni.edu.vn", phone: "0901000015", department: "QTKD", specialization: "Thương mại điện tử", degree: "masters", gender: "male" },
  { teacherCode: "GV016", fullName: "Nguyễn Thu Hiền", email: "hien.nguyen@uni.edu.vn", phone: "0901000016", department: "QTKD", specialization: "Thương mại điện tử", degree: "masters", gender: "female" },
  { teacherCode: "GV017", fullName: "Lý Hoàng Nam", email: "nam.ly@uni.edu.vn", phone: "0901000017", department: "KT", specialization: "Kế toán doanh nghiệp", degree: "masters", gender: "male" },
  { teacherCode: "GV018", fullName: "Đặng Thị Hoa", email: "hoa.dang@uni.edu.vn", phone: "0901000018", department: "KT", specialization: "Kế toán doanh nghiệp", degree: "masters", gender: "female" },
  { teacherCode: "GV019", fullName: "Ngô Minh Khánh", email: "khanh.ngo@uni.edu.vn", phone: "0901000019", department: "KT", specialization: "Kiểm toán", degree: "phd", gender: "male" },
  { teacherCode: "GV020", fullName: "Phạm Ngọc Bích", email: "bich.pham@uni.edu.vn", phone: "0901000020", department: "KT", specialization: "Kiểm toán", degree: "masters", gender: "female" },
  { teacherCode: "GV021", fullName: "Trịnh Văn Dũng", email: "dung.trinh@uni.edu.vn", phone: "0901000021", department: "TCNH", specialization: "Tài chính doanh nghiệp", degree: "masters", gender: "male" },
  { teacherCode: "GV022", fullName: "Nguyễn Kim Ngân", email: "ngan.nguyen@uni.edu.vn", phone: "0901000022", department: "TCNH", specialization: "Tài chính doanh nghiệp", degree: "masters", gender: "female" },
  { teacherCode: "GV023", fullName: "Lê Thanh Tùng", email: "tung.le@uni.edu.vn", phone: "0901000023", department: "TCNH", specialization: "Ngân hàng", degree: "phd", gender: "male" },
  { teacherCode: "GV024", fullName: "Phan Thị Hạnh", email: "hanh.phan@uni.edu.vn", phone: "0901000024", department: "TCNH", specialization: "Ngân hàng", degree: "masters", gender: "female" },
  { teacherCode: "GV025", fullName: "Vũ Minh Tuấn", email: "tuan.vu@uni.edu.vn", phone: "0901000025", department: "NN", specialization: "Ngôn ngữ Anh", degree: "masters", gender: "male" },
  { teacherCode: "GV026", fullName: "Nguyễn Thảo Vy", email: "vy.nguyen@uni.edu.vn", phone: "0901000026", department: "NN", specialization: "Ngôn ngữ Anh", degree: "masters", gender: "female" },
  { teacherCode: "GV027", fullName: "Đỗ Nhật Quang", email: "quang.do@uni.edu.vn", phone: "0901000027", department: "NN", specialization: "Ngôn ngữ Nhật", degree: "masters", gender: "male" },
  { teacherCode: "GV028", fullName: "Lê Thuỳ Dương", email: "duong.le@uni.edu.vn", phone: "0901000028", department: "NN", specialization: "Ngôn ngữ Nhật", degree: "masters", gender: "female" },
  { teacherCode: "GV029", fullName: "Phạm Gia Bảo", email: "bao.pham@uni.edu.vn", phone: "0901000029", department: "NN", specialization: "Ngôn ngữ Trung", degree: "masters", gender: "male" },
  { teacherCode: "GV030", fullName: "Trần Ngọc Ánh", email: "anh.tran@uni.edu.vn", phone: "0901000030", department: "NN", specialization: "Ngôn ngữ Trung", degree: "masters", gender: "female" }
];

async function seed() {
  try {
    await connectDB();
    console.log('🔌 Connected to database');

    // Delete existing teachers
    console.log('🗑️ Deleting existing teachers...');
    await Teacher.deleteMany({});

    // Seed new teachers
    console.log('👨‍🏫 Seeding 30 teachers...');
    const teachers = await Teacher.insertMany(teachersData);
    console.log(`✅ Inserted ${teachers.length} teachers`);

    // Verify the data
    const count = await Teacher.countDocuments();
    console.log(`📊 Total teachers in database: ${count}`);

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
