require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('../../configs/db.config');

const MIGRATIONS_DIR = __dirname;
const MIGRATIONS_COLLECTION = process.env.MONGODB_MIGRATIONS_COLLECTION || '__migrations';

function getCommand() {
  const cmd = (process.argv[2] || 'up').trim().toLowerCase();
  if (!['up', 'down', 'status'].includes(cmd)) {
    throw new Error(`Unsupported command: ${cmd}. Use one of: up, down, status.`);
  }
  return cmd;
}

function listMigrationFiles() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.js'))
    .filter((file) => file !== 'index.js')
    .sort();

  return files;
}

function loadMigrations() {
  const files = listMigrationFiles();
  return files.map((file) => {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const migration = require(fullPath);
    return {
      id: migration.id || file.replace(/\.js$/i, ''),
      description: migration.description || '',
      up: migration.up,
      down: migration.down,
      file,
      fullPath,
    };
  });
}

function getMigrationsCollection() {
  return mongoose.connection.collection(MIGRATIONS_COLLECTION);
}

async function getAppliedMigrations() {
  const collection = getMigrationsCollection();
  await collection.createIndex({ id: 1 }, { unique: true });
  const docs = await collection.find({}).sort({ appliedAt: 1 }).toArray();
  return docs;
}

function buildContext() {
  return {
    mongoose,
    db: mongoose.connection.db,
    now: () => new Date(),
  };
}

async function applyUpMigrations(migrations, appliedSet) {
  const collection = getMigrationsCollection();
  const context = buildContext();

  for (const migration of migrations) {
    if (appliedSet.has(migration.id)) {
      // eslint-disable-next-line no-console
      console.log(`- skip ${migration.id} (already applied)`);
      // eslint-disable-next-line no-continue
      continue;
    }

    if (typeof migration.up !== 'function') {
      throw new Error(`Migration ${migration.id} does not export an up() function.`);
    }

    // eslint-disable-next-line no-console
    console.log(`- applying ${migration.id} ${migration.description ? `- ${migration.description}` : ''}`);
    await migration.up(context);

    await collection.insertOne({
      id: migration.id,
      description: migration.description || '',
      file: migration.file,
      appliedAt: new Date(),
    });
  }
}

async function applyDownMigration(migrations, appliedDocs) {
  if (appliedDocs.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No applied migrations to roll back.');
    return;
  }

  const lastApplied = appliedDocs[appliedDocs.length - 1];
  const migration = migrations.find((m) => m.id === lastApplied.id);

  if (!migration) {
    throw new Error(
      `Cannot find migration file for last applied migration: ${lastApplied.id}.`,
    );
  }

  if (typeof migration.down !== 'function') {
    throw new Error(`Migration ${migration.id} does not export a down() function.`);
  }

  const collection = getMigrationsCollection();
  const context = buildContext();

  // eslint-disable-next-line no-console
  console.log(`- rolling back ${migration.id}`);
  await migration.down(context);
  await collection.deleteOne({ id: migration.id });
}

async function printStatus(migrations, appliedSet) {
  // eslint-disable-next-line no-console
  console.log(`Migrations collection: ${MIGRATIONS_COLLECTION}`);
  migrations.forEach((migration) => {
    const status = appliedSet.has(migration.id) ? 'applied' : 'pending';
    // eslint-disable-next-line no-console
    console.log(`- [${status}] ${migration.id}${migration.description ? ` - ${migration.description}` : ''}`);
  });
}

async function run() {
  const command = getCommand();
  await connectDB();

  const migrations = loadMigrations();
  const appliedDocs = await getAppliedMigrations();
  const appliedSet = new Set(appliedDocs.map((doc) => doc.id));

  if (command === 'status') {
    await printStatus(migrations, appliedSet);
  } else if (command === 'down') {
    await applyDownMigration(migrations, appliedDocs);
  } else {
    await applyUpMigrations(migrations, appliedSet);
  }

  await mongoose.connection.close();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Migration runner failed:', err.message);
  process.exit(1);
});
