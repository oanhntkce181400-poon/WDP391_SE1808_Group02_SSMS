const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/wdp301').then(async () => {
  const db = mongoose.connection.db;
  
  // Check subjects
  const subjects = await db.collection('subjects').find({ subjectCode: /MLN|WDP|PRJ/ }).toArray();
  console.log('Our subjects:', subjects.map(s => s.subjectCode));
  
  // Check teachers
  const teachers = await db.collection('teachers').find({}).toArray();
  console.log('Teachers:', teachers.map(t => ({ code: t.teacherCode, name: t.fullName })));
  
  // Check rooms
  const rooms = await db.collection('rooms').find({}).toArray();
  console.log('Rooms:', rooms.map(r => r.roomCode));
  
  // Check timeslots
  const timeslots = await db.collection('timeslots').find({}).toArray();
  console.log('Timeslots:', timeslots.map(t => t.groupName));
  
  // Check all classes
  const classes = await db.collection('classsections').find({}).toArray();
  console.log('All classes:', classes.map(c => c.classCode));
  
  await mongoose.disconnect();
}).catch(e => console.error(e));
