require('dotenv').config();

const { connectDB } = require('../src/configs/db.config');
const Curriculum = require('../src/models/curriculum.model');
const CurriculumSemester = require('../src/models/curriculumSemester.model');

function parseSemesterNumber(name) {
  if (!name) return null;
  const match = String(name).match(/(\d+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function buildNewOrder(semesters) {
  const used = new Set();
  const result = [];

  // First pass: use numeric value from semester name when available.
  for (const semester of semesters) {
    const parsed = parseSemesterNumber(semester.name);
    if (parsed && parsed > 0 && !used.has(parsed)) {
      result.push({ id: semester._id, name: semester.name, newOrder: parsed });
      used.add(parsed);
    } else {
      result.push({ id: semester._id, name: semester.name, newOrder: null });
    }
  }

  // Second pass: fill gaps so order becomes contiguous 1..N.
  let next = 1;
  for (const item of result) {
    if (item.newOrder != null) continue;
    while (used.has(next)) next += 1;
    item.newOrder = next;
    used.add(next);
  }

  // Normalize to strictly contiguous sequence by current newOrder.
  result.sort((a, b) => a.newOrder - b.newOrder);
  return result.map((item, index) => ({
    ...item,
    newOrder: index + 1,
  }));
}

async function run() {
  const curriculumCode = process.argv[2] || 'FXT-AI-2026';

  await connectDB();

  const curriculum = await Curriculum.findOne({ code: curriculumCode }).lean();
  if (!curriculum) {
    throw new Error(`Curriculum not found: ${curriculumCode}`);
  }

  const semesters = await CurriculumSemester.find({ curriculum: curriculum._id })
    .select('_id name semesterOrder')
    .sort({ semesterOrder: 1, createdAt: 1 })
    .lean();

  if (semesters.length === 0) {
    console.log(`No semesters found for curriculum ${curriculumCode}`);
    return;
  }

  console.log('Before:');
  semesters.forEach((s) => {
    console.log(`- ${s.name}: ${s.semesterOrder}`);
  });

  const reordered = buildNewOrder(semesters);

  const ops = reordered.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { semesterOrder: item.newOrder } },
    },
  }));

  await CurriculumSemester.bulkWrite(ops, { ordered: true });

  const after = await CurriculumSemester.find({ curriculum: curriculum._id })
    .select('_id name semesterOrder')
    .sort({ semesterOrder: 1, createdAt: 1 })
    .lean();

  console.log('After:');
  after.forEach((s) => {
    console.log(`- ${s.name}: ${s.semesterOrder}`);
  });

  console.log(`Updated ${after.length} semesterOrder values for ${curriculumCode}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
