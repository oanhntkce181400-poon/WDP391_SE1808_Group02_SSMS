const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Create sample Excel file for testing import users feature
async function createSampleImportFile() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Users');

  // Sample data rows
  const sampleData = [
    {
      email: 'student1@example.com',
      fullName: 'Nguyễn Văn A',
      role: 'student',
      status: 'active',
    },
    {
      email: 'student2@example.com',
      fullName: 'Trần Thị B',
      role: 'student',
      status: 'active',
    },
    {
      email: 'staff1@example.com',
      fullName: 'Lê Văn C',
      role: 'staff',
      status: 'active',
    },
    {
      email: 'admin1@example.com',
      fullName: 'Phạm Thị D',
      role: 'admin',
      status: 'active',
    },
    {
      email: 'student3@example.com',
      fullName: 'Hoàng Văn E',
      role: 'student',
      status: 'pending',
    },
  ];

  // Add header row
  worksheet.columns = [
    { header: 'email', key: 'email', width: 25 },
    { header: 'fullName', key: 'fullName', width: 25 },
    { header: 'role', key: 'role', width: 15 },
    { header: 'status', key: 'status', width: 15 },
  ];

  // Add sample data rows using insertRows (proper way with ExcelJS)
  const rowsData = sampleData.map((item) => [item.email, item.fullName, item.role, item.status]);
  worksheet.insertRows(2, rowsData);

  // Format header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };

  // Save file
  const filePath = path.join(__dirname, '..', '..', 'sample-users-import.xlsx');
  await workbook.xlsx.writeFile(filePath);

  console.log(`Sample import file created: ${filePath}`);
}

// Run if executed directly
if (require.main === module) {
  createSampleImportFile().catch(console.error);
}

module.exports = createSampleImportFile;
