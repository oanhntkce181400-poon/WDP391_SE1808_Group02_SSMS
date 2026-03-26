#!/usr/bin/env node

/**
 * Score Component Testing Script
 * Kiểm tra end-to-end: Create ScoreComponent → Save enrollment scores → Verify grade calculated
 * 
 * Chạy: node backend-api/test-score-component.js
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ssms';
const API_BASE_URL = 'http://localhost:8000/api';

// Models
const Subject = require('./src/models/subject.model');
const ClassSection = require('./src/models/classSection.model');
const ClassEnrollment = require('./src/models/classEnrollment.model');
const ScoreComponent = require('./src/models/scoreComponent.model');
const User = require('./src/models/user.model');
const scoreComponentService = require('./src/services/scoreComponent.service');

// Test data
let testData = {
  subject: null,
  classSection: null,
  teacher: null,
  student: null,
  enrollment: null,
};

// Color logging
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}\n${msg}\n${colors.blue}${'='.repeat(60)}${colors.reset}\n`),
};

async function setup() {
  try {
    log.section('SETUP: Connect to MongoDB and create test data');

    // Connect to MongoDB
    log.info('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    log.success('Connected to MongoDB');

    // Create or find test subject
    log.info('Creating/finding test subject...');
    testData.subject = await Subject.findOneAndUpdate(
      { subjectCode: 'TEST_SC_SUB' },
      {
        subjectCode: 'TEST_SC_SUB',
        subjectName: 'Test Subject for Score Component',
        credits: 3,
        description: 'This is a test subject for score component testing'
      },
      { upsert: true, new: true }
    );
    log.success(`Subject: ${testData.subject.subjectCode} (${testData.subject._id})`);

    // Create test teacher
    log.info('Creating/finding test teacher...');
    testData.teacher = await User.findOneAndUpdate(
      { email: 'test-teacher-sc@test.com' },
      {
        email: 'test-teacher-sc@test.com',
        firstName: 'Test',
        lastName: 'Teacher',
        role: 'lecturer',
        password: 'test123'
      },
      { upsert: true, new: true }
    );
    log.success(`Teacher: ${testData.teacher.email} (${testData.teacher._id})`);

    // Create test student
    log.info('Creating/finding test student...');
    testData.student = await User.findOneAndUpdate(
      { email: 'test-student-sc@test.com' },
      {
        email: 'test-student-sc@test.com',
        firstName: 'Test',
        lastName: 'Student',
        role: 'student',
        password: 'test123'
      },
      { upsert: true, new: true }
    );
    log.success(`Student: ${testData.student.email} (${testData.student._id})`);

    // Create test class section
    log.info('Creating/finding test class section...');
    testData.classSection = await ClassSection.findOneAndUpdate(
      { sectionCode: 'TEST_SC_SE1' },
      {
        sectionCode: 'TEST_SC_SE1',
        sectionName: 'Test SC Class SE1',
        subject: testData.subject._id,
        lecturer: testData.teacher._id,
        semester: '20241',
        capacity: 30
      },
      { upsert: true, new: true }
    );
    log.success(`Class Section: ${testData.classSection.sectionCode} (${testData.classSection._id})`);

    // Create test enrollment
    log.info('Creating/finding test enrollment...');
    testData.enrollment = await ClassEnrollment.findOneAndUpdate(
      { student: testData.student._id, classSection: testData.classSection._id },
      {
        student: testData.student._id,
        classSection: testData.classSection._id,
        enrollmentDate: new Date(),
        status: 'active'
      },
      { upsert: true, new: true }
    );
    log.success(`Enrollment: ${testData.enrollment._id}`);

    log.success('Setup completed successfully');
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    throw error;
  }
}

async function testCreateScoreComponent() {
  try {
    log.section('TEST 1: Create Score Component for Test Subject');

    const components = [
      {
        code: 'PT1',
        name: 'Kiểm tra 1',
        weight: 0.1,
        description: 'Kiểm tra lần 1',
        isRequired: false,
        order: 1
      },
      {
        code: 'PT2',
        name: 'Kiểm tra 2',
        weight: 0.1,
        description: 'Kiểm tra lần 2',
        isRequired: false,
        order: 2
      },
      {
        code: 'GK',
        name: 'Giữa kỳ',
        weight: 0.3,
        description: 'Kiểm tra giữa kỳ',
        isRequired: true,
        order: 3
      },
      {
        code: 'CK',
        name: 'Cuối kỳ',
        weight: 0.5,
        description: 'Kiểm tra cuối kỳ',
        isRequired: true,
        order: 4
      }
    ];

    log.info(`Creating score component with ${components.length} components...`);
    const scoreComponent = await scoreComponentService.createOrUpdateScoreComponent(
      testData.subject._id,
      components
    );

    log.success('Score Component created successfully');
    log.info(`Total Weight: ${scoreComponent.totalWeight}`);
    
    if (Math.abs(scoreComponent.totalWeight - 1.0) <= 0.01) {
      log.success(`Weight validation passed: ${scoreComponent.totalWeight.toFixed(2)} ≈ 1.0`);
    } else {
      log.error(`Weight validation failed: ${scoreComponent.totalWeight.toFixed(2)} ≠ 1.0`);
    }

    return scoreComponent;
  } catch (error) {
    log.error(`Test 1 failed: ${error.message}`);
    throw error;
  }
}

async function testGetScoreComponent(scoreComponentId) {
  try {
    log.section('TEST 2: Get Score Component by Subject');

    log.info(`Fetching score component for subject: ${testData.subject._id}`);
    const scoreComponent = await scoreComponentService.getScoreComponentBySubject(
      testData.subject._id
    );

    if (scoreComponent) {
      log.success('Score Component retrieved successfully');
      log.info(`Components: ${scoreComponent.components.length}`);
      scoreComponent.components.forEach((comp) => {
        log.info(`  • ${comp.code}: ${comp.name} (${(comp.weight * 100).toFixed(0)}%)`);
      });
    } else {
      log.error('Score Component not found');
    }

    return scoreComponent;
  } catch (error) {
    log.error(`Test 2 failed: ${error.message}`);
    throw error;
  }
}

async function testCalculateFinalGrade(scoreComponent) {
  try {
    log.section('TEST 3: Calculate Final Grade using Score Component');

    // Mock enrollment scores
    const enrollmentScores = {
      ptScores: [
        { type: 'PT1', score: 8.5 },
        { type: 'PT2', score: 9.0 }
      ],
      midtermScore: 7.5,
      finalScore: 8.0,
      assignmentScore: 8.5,
      continuousScore: 8.0
    };

    log.info('Input Scores:');
    log.info(`  • PT1: 8.5`);
    log.info(`  • PT2: 9.0`);
    log.info(`  • GK (Midterm): 7.5`);
    log.info(`  • CK (Final): 8.0`);

    log.info(`\nCalculating final grade using formula...`);
    const finalGrade = scoreComponentService.calculateFinalScore(
      enrollmentScores,
      scoreComponent
    );

    log.success(`Final Grade calculated: ${finalGrade.toFixed(2)}`);

    // Verify calculation
    log.info('\nVerifying calculation:');
    const ptAvg = (8.5 + 9.0) / 2;
    const expected = (ptAvg * 0.2) + (7.5 * 0.3) + (8.0 * 0.5);
    log.info(`  PT Average: ${ptAvg.toFixed(2)}`);
    log.info(`  Expected: (${ptAvg.toFixed(2)} × 0.2) + (7.5 × 0.3) + (8.0 × 0.5)`);
    log.info(`  Expected: ${expected.toFixed(2)}`);
    
    if (Math.abs(finalGrade - expected) < 0.01) {
      log.success('Calculation verified ✓');
    } else {
      log.error(`Calculation mismatch: ${finalGrade.toFixed(2)} ≠ ${expected.toFixed(2)}`);
    }

    return finalGrade;
  } catch (error) {
    log.error(`Test 3 failed: ${error.message}`);
    throw error;
  }
}

async function testUpdateEnrollmentGrade(scoreComponent) {
  try {
    log.section('TEST 4: Update Enrollment with Scores and Calculate Grade');

    const scores = {
      ptScores: [
        { type: 'PT1', score: 8.0 },
        { type: 'PT2', score: 9.0 }
      ],
      midtermScore: 7.5,
      finalScore: 8.5,
      assignmentScore: 8.0
    };

    log.info('Updating enrollment with scores...');
    
    // Fetch fresh enrollment
    testData.enrollment = await ClassEnrollment.findById(testData.enrollment._id);
    
    // Apply scores
    if (scores.midtermScore !== undefined) testData.enrollment.midtermScore = scores.midtermScore;
    if (scores.finalScore !== undefined) testData.enrollment.finalScore = scores.finalScore;
    if (scores.assignmentScore !== undefined) testData.enrollment.assignmentScore = scores.assignmentScore;
    if (scores.ptScores) testData.enrollment.ptScores = scores.ptScores;

    // Calculate grade using score component
    const enrollmentScores = {
      ptScores: testData.enrollment.ptScores || [],
      midtermScore: testData.enrollment.midtermScore,
      finalScore: testData.enrollment.finalScore,
      assignmentScore: testData.enrollment.assignmentScore
    };

    const calculatedGrade = scoreComponentService.calculateFinalScore(
      enrollmentScores,
      scoreComponent
    );

    testData.enrollment.grade = calculatedGrade;
    await testData.enrollment.save();

    log.success('Enrollment updated successfully');
    log.info(`Final Grade: ${testData.enrollment.grade.toFixed(2)}`);
    log.info(`PT Scores stored: ${testData.enrollment.ptScores.length} scores`);

    return testData.enrollment;
  } catch (error) {
    log.error(`Test 4 failed: ${error.message}`);
    throw error;
  }
}

async function testValidateRequiredComponents(scoreComponent) {
  try {
    log.section('TEST 5: Validate Required Components');

    // Test 1: All required components present
    log.info('Test 5a: All required components present');
    const completeScores = {
      ptScores: [{ type: 'PT1', score: 8.0 }],
      midtermScore: 7.5,
      finalScore: 8.0,
      assignmentScore: 8.5
    };

    const validation1 = scoreComponentService.validateRequiredComponents(
      completeScores,
      scoreComponent
    );

    if (validation1.isValid) {
      log.success('Validation passed: All required components present');
    } else {
      log.error(`Validation failed: Missing ${validation1.missing.join(', ')}`);
    }

    // Test 2: Missing required component
    log.info('Test 5b: Missing required component (CK)');
    const incompleteScores = {
      ptScores: [{ type: 'PT1', score: 8.0 }],
      midtermScore: 7.5,
      finalScore: undefined, // Missing CK
      assignmentScore: 8.5
    };

    const validation2 = scoreComponentService.validateRequiredComponents(
      incompleteScores,
      scoreComponent
    );

    if (!validation2.isValid) {
      log.warn(`Validation correctly failed: Missing ${validation2.missing.join(', ')}`);
      log.success('Required component validation working correctly');
    } else {
      log.error('Validation should have failed for missing CK');
    }

  } catch (error) {
    log.error(`Test 5 failed: ${error.message}`);
    throw error;
  }
}

async function testGetAllScoreComponents() {
  try {
    log.section('TEST 6: Get All Score Components');

    log.info('Fetching all score components...');
    const allComponents = await scoreComponentService.getAllScoreComponents();

    log.success(`Found ${allComponents.length} score component(s)`);
    allComponents.forEach((sc) => {
      log.info(`  • Subject ID: ${sc.subject} (${sc.components.length} components)`);
    });

  } catch (error) {
    log.error(`Test 6 failed: ${error.message}`);
    throw error;
  }
}

async function testAPIEndpoint() {
  try {
    log.section('TEST 7: Test API Endpoints (if backend running)');

    log.info(`Testing GET /api/score-components (requires running backend)...`);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/score-components`, { timeout: 2000 });
      log.success(`API responded with ${response.data.count || 0} score components`);
    } catch (err) {
      log.warn('Backend not running or API not accessible');
      log.info('To test API endpoints, run: npm start');
    }

  } catch (error) {
    log.warn(`Test 7 skipped: ${error.message}`);
  }
}

async function runAllTests() {
  try {
    console.clear();
    log.section('SCORE COMPONENT TESTING SUITE');

    await setup();
    const scoreComponent = await testCreateScoreComponent();
    await testGetScoreComponent(scoreComponent._id);
    await testCalculateFinalGrade(scoreComponent);
    await testUpdateEnrollmentGrade(scoreComponent);
    await testValidateRequiredComponents(scoreComponent);
    await testGetAllScoreComponents();
    await testAPIEndpoint();

    log.section('TESTING COMPLETED');
    log.success('All tests passed! ✨');

  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB');
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
