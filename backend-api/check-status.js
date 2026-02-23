const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/wdp301').then(async () => {
  const db = mongoose.connection.db;
  
  // Check all classes and their statuses
  const classes = await db.collection('classsections').find({}).toArray();
  
  console.log('Total classes:', classes.length);
  console.log('\nStatus counts:');
  const statusCounts = {};
  classes.forEach(c => {
    const s = c.status || 'undefined';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  console.log(statusCounts);
  
  // Show classes with 'active' status
  const activeClasses = classes.filter(c => c.status === 'active');
  console.log('\nClasses with status "active":', activeClasses.length);
  activeClasses.forEach(c => console.log('  -', c.classCode));
  
  await mongoose.disconnect();
}).catch(e => console.error(e));
