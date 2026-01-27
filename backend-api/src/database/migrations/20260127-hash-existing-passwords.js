const bcrypt = require('bcryptjs');

const HASH_REGEX = /^\$2[aby]\$/;
const SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 10);

async function up({ mongoose }) {
  const usersCol = mongoose.connection.collection('users');

  const cursor = usersCol.find({
    password: { $type: 'string', $ne: '' },
  });

  let updatedCount = 0;

  // eslint-disable-next-line no-restricted-syntax
  for await (const user of cursor) {
    const password = String(user.password || '');
    if (!password || HASH_REGEX.test(password)) {
      // Already hashed or empty
      // eslint-disable-next-line no-continue
      continue;
    }

    // Hash the existing plain-text password
    // eslint-disable-next-line no-await-in-loop
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    // eslint-disable-next-line no-await-in-loop
    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashed,
          authProvider: user.authProvider === 'google' && !user.password ? 'google' : 'local',
          mustChangePassword: user.mustChangePassword ?? false,
          passwordChangedAt: new Date(),
        },
      },
    );

    updatedCount += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`[migration] Hashed ${updatedCount} user password(s).`);
}

async function down() {
  // Irreversible: we cannot restore plain-text passwords.
}

module.exports = {
  id: '20260127-hash-existing-passwords',
  description: 'Hash existing plain-text passwords so local login works.',
  up,
  down,
};

