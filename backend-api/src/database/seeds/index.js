require('dotenv').config();

const { connectDB } = require('../../configs/db.config');
const User = require('../../models/user.model');

async function seed() {
  await connectDB();

  const adminEmail = 'admin@example.com';

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log('✅ Admin user already exists, skip seeding.');
    return;
  }

  await User.create({
    email: adminEmail,
    password: '123456', // TODO: hash bằng bcrypt sau
    fullName: 'System Admin',
    role: 'admin',
  });

  console.log('✅ Seeded admin user:', adminEmail);
}

seed()
  .then(() => {
    console.log('🎉 Seeding completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
