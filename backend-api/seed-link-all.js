require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301';
const DB_NAME   = process.env.MONGODB_DB_NAME || 'wdp301';
const PRICE_PER_CREDIT = 630_000;

const FPT_SUBJECTS = {
  WDP301: { name: 'Web Design & Prototyping',                 credits: 4 },
  SDN302: { name: 'Software Development for Network Apps',    credits: 4 },
  MLN122: { name: 'Chủ nghĩa Mác-Lênin',                     credits: 4 },
  PRJ301: { name: 'Java Web Application Development',         credits: 4 },
  EXE201: { name: 'Entrepreneurship Concepts',                credits: 2 },
  PRM393: { name: 'Mobile Programming',                       credits: 3 },
  SWP391: { name: 'Software Project',                         credits: 5 },
  DBI202: { name: 'Introduction to Databases',                credits: 2 },
  OSG202: { name: 'Operating Systems',                        credits: 3 },
  EXE101: { name: 'Introduction to Entrepreneurship',         credits: 2 },
  SWT301: { name: 'Software Testing',                         credits: 5 },
  NWC203: { name: 'Computer Networks',                        credits: 5 },
};

const CEK18_SEMESTERS = [
  { id: 1, name: 'Học kỳ 1', courses: ['WDP301', 'SDN302', 'MLN122'] },
  { id: 2, name: 'Học kỳ 2', courses: ['PRJ301', 'EXE201', 'PRM393', 'SWP391'] },
  { id: 3, name: 'Học kỳ 3', courses: ['DBI202', 'OSG202', 'EXE101'] },
  { id: 4, name: 'Học kỳ 4', courses: ['SWT301', 'NWC203'] },
];

const SCHEDULE_SUBJECTS = ['WDP301','SDN302','MLN122','PRJ301','EXE201','PRM393','SWP391'];

async function run() {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  console.log('✅ Connected:', db.databaseName);

  const subjectsInDB = await db.collection('subjects').find({}).toArray();
  const subjectMap = {};
  subjectsInDB.forEach(s => { subjectMap[s.subjectCode] = s; });

  console.log('\n[1] Subject lookup');
  Object.keys(FPT_SUBJECTS).forEach(code => {
    const found = subjectMap[code];
    console.log(`  ${code}: ${found ? '\u2713' : '\u274c NOT FOUND'}`);
  });

  console.log('\n[2] Updating CEK18 curriculum');

  const updatedSemesters = CEK18_SEMESTERS.map(sem => {
    const courses = sem.courses.map(code => ({
      code,
      name: FPT_SUBJECTS[code].name,
      credits: FPT_SUBJECTS[code].credits,
      hasPrerequisite: false,
    }));
    const semCredits = courses.reduce((s, c) => s + c.credits, 0);
    return { id: sem.id, name: sem.name, credits: semCredits, courses };
  });

  const totalCredits  = updatedSemesters.reduce((s, sem) => s + sem.credits, 0);
  const totalCourses  = updatedSemesters.reduce((s, sem) => s + sem.courses.length, 0);

  const curResult = await db.collection('curriculums').updateOne(
    { code: 'CEK18' },
    {
      $set: {
        name: 'Chương trình đào tạo Công nghệ thông tin K18',
        semesters: updatedSemesters,
        totalCredits,
        totalCourses,
        status: 'active',
      },
    },
  );
  console.log(`  CEK18 updated: ${curResult.modifiedCount} doc`);

  const del = await db.collection('tuitionfees').deleteMany({ cohort: 'K18', academicYear: '2018-2019' });
  console.log(`  Deleted stale: ${del.deletedCount} docs`);

  console.log('\n[4] Creating TuitionFee records for K18 2025-2026');

  for (const sem of updatedSemesters) {
    const subjects = sem.courses.map(c => {
      const sub = subjectMap[c.code];
      return {
        subjectId:   sub?._id ?? null,
        subjectCode: c.code,
        subjectName: c.name,
        credits:     c.credits,
        tuitionFee:  c.credits * PRICE_PER_CREDIT,
      };
    });

    const totalCr  = sem.credits;
    const baseFee  = totalCr * PRICE_PER_CREDIT;

    await db.collection('tuitionfees').updateOne(
      { cohort: 'K18', academicYear: '2025-2026', semester: sem.name },
      {
        $set: {
          cohort:           'K18',
          academicYear:     '2025-2026',
          majorCode:        'CE',
          semester:         sem.name,
          subjects,
          totalCredits:     totalCr,
          baseTuitionFee:   baseFee,
          finalTuitionFee:  baseFee,
          totalDiscount:    0,
          discounts:        [],
          status:           'active',
          notes:            `Khung CEK18 - ${sem.name}`,
          updatedAt:        new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
    console.log(`  ${sem.name}: ${totalCr} TC → ${(baseFee / 1e6).toFixed(3)}M ₫`);
  }

  console.log('\n[5] Verifying pricePerCredit for K18 2025-2026');
  const rule = await db.collection('tuitionfees').findOne({
    cohort: { $in: ['18', 'K18', 'K18CT'] },
    academicYear: '2025-2026',
    status: 'active',
  });
  if (rule) {
    const ppc = Math.round(rule.baseTuitionFee / rule.totalCredits);
    console.log(`  ${rule.semester} | ${rule.totalCredits} TC | ${ppc} vnd/TC`);
  } else {
    console.log('  NOT found');
  }

  console.log('\n[6] Final CEK18 curriculum');
  const updated = await db.collection('curriculums').findOne({ code: 'CEK18' });
  updated.semesters.forEach(s => {
    console.log(`  ${s.name} (${s.credits} TC):`);
    s.courses.forEach(c => console.log(`    ${c.code}  ${c.name}  ${c.credits} TC`));
  });

  await mongoose.disconnect();
  console.log('\n✅ Done — CEK18 curriculum & TuitionFee records updated.');
}

run().catch(e => { console.error(e); process.exit(1); });
