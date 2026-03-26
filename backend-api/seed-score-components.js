#!/usr/bin/env node

/**
 * Seed Score Component Data
 * Chạy: node backend-api/seed-score-components.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Subject = require('./src/models/subject.model');
const ScoreComponent = require('./src/models/scoreComponent.model');
const scoreComponentService = require('./src/services/scoreComponent.service');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ssms';

async function seedScoreComponents() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Ví dụ 1: WDP301 - Web Design & Prototyping
    console.log('\n📚 Seeding WDP301 (Web Design & Prototyping)...');
    const wdp301 = await Subject.findOne({ subjectCode: 'WDP301' }).select('_id');
    if (wdp301) {
      await scoreComponentService.createOrUpdateScoreComponent(
        wdp301._id,
        [
          {
            code: 'PT1',
            name: 'Kiểm tra 1',
            weight: 0.1,
            description: 'Kiểm tra thường xuyên lần 1',
            isRequired: false,
            order: 1
          },
          {
            code: 'PT2',
            name: 'Kiểm tra 2',
            weight: 0.1,
            description: 'Kiểm tra thường xuyên lần 2',
            isRequired: false,
            order: 2
          },
          {
            code: 'PT3',
            name: 'Kiểm tra 3',
            weight: 0.1,
            description: 'Kiểm tra thường xuyên lần 3',
            isRequired: false,
            order: 3
          },
          {
            code: 'GK',
            name: 'Giữa kỳ',
            weight: 0.2,
            description: 'Bài kiểm tra giữa kỳ',
            isRequired: true,
            order: 4
          },
          {
            code: 'BT',
            name: 'Bài tập/Thực hành',
            weight: 0.2,
            description: 'Các bài tập và project nhỏ',
            isRequired: true,
            order: 5
          },
          {
            code: 'CK',
            name: 'Cuối kỳ',
            weight: 0.3,
            description: 'Bài kiểm tra cuối kỳ',
            isRequired: true,
            order: 6
          }
        ],
        {
          calculationType: 'WEIGHTED_AVG',
          note: 'Tính trung bình có trọng số'
        }
      );
      console.log('✅ WDP301 seeded successfully');
    }

    // Ví dụ 2: WDP303 - Introduction to Software Engineering
    console.log('\n📚 Seeding WDP303 (Introduction to Software Engineering)...');
    const wdp303 = await Subject.findOne({ subjectCode: 'WDP303' }).select('_id');
    if (wdp303) {
      await scoreComponentService.createOrUpdateScoreComponent(
        wdp303._id,
        [
          {
            code: 'PT1',
            name: 'Assignment 1',
            weight: 0.15,
            description: 'Bài tập 1',
            isRequired: false,
            order: 1
          },
          {
            code: 'PT2',
            name: 'Assignment 2',
            weight: 0.15,
            description: 'Bài tập 2',
            isRequired: false,
            order: 2
          },
          {
            code: 'GK',
            name: 'Midterm Exam',
            weight: 0.3,
            description: 'Bài kiểm tra giữa kỳ',
            isRequired: true,
            order: 3
          },
          {
            code: 'CK',
            name: 'Final Exam',
            weight: 0.4,
            description: 'Bài kiểm tra cuối kỳ',
            isRequired: true,
            order: 4
          }
        ],
        {
          calculationType: 'WEIGHTED_AVG',
          note: 'Tính trung bình có trọng số'
        }
      );
      console.log('✅ WDP303 seeded successfully');
    }

    // Ví dụ 3: WDP302 - Fundamentals of Database
    console.log('\n📚 Seeding WDP302 (Fundamentals of Database)...');
    const wdp302 = await Subject.findOne({ subjectCode: 'WDP302' }).select('_id');
    if (wdp302) {
      await scoreComponentService.createOrUpdateScoreComponent(
        wdp302._id,
        [
          {
            code: 'Lab1',
            name: 'Lab Assignment 1',
            weight: 0.1,
            description: 'Bài lab 1',
            isRequired: false,
            order: 1
          },
          {
            code: 'Lab2',
            name: 'Lab Assignment 2',
            weight: 0.1,
            description: 'Bài lab 2',
            isRequired: false,
            order: 2
          },
          {
            code: 'Lab3',
            name: 'Lab Assignment 3',
            weight: 0.1,
            description: 'Bài lab 3',
            isRequired: false,
            order: 3
          },
          {
            code: 'GK',
            name: 'Kiểm tra giữa kỳ',
            weight: 0.25,
            description: 'Bài kiểm tra giữa kỳ',
            isRequired: true,
            order: 4
          },
          {
            code: 'CK',
            name: 'Kiểm tra cuối kỳ',
            weight: 0.45,
            description: 'Bài kiểm tra cuối kỳ (thực hành)',
            isRequired: true,
            order: 5
          }
        ],
        {
          calculationType: 'WEIGHTED_AVG',
          note: 'Trọng số cao cho bài kiểm tra thực hành cuối kỳ'
        }
      );
      console.log('✅ WDP302 seeded successfully');
    }

    console.log('\n✅ Score components seeded successfully!');
    console.log('\n📋 Ví dụ sử dụng API:');
    console.log('- GET /api/score-components/:subjectId');
    console.log('- POST /api/score-components/:subjectId');
    console.log('- GET /api/score-components');
    console.log('- DELETE /api/score-components/:scoreComponentId');

  } catch (error) {
    console.error('❌ Error seeding score components:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedScoreComponents();
