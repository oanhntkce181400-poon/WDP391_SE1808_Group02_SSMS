const FeedbackSubmission = require('../models/feedbackSubmission.model');
const FeedbackTemplate = require('../models/feedbackTemplate.model');
const ClassSection = require('../models/classSection.model');
const ClassEnrollment = require('../models/classEnrollment.model');
const Student = require('../models/student.model');

const CLASS_SECTION_POPULATE = [
  { path: 'subject', select: 'subjectCode subjectName credits' },
  { path: 'teacher', select: 'teacherCode fullName email' },
  { path: 'room', select: 'roomCode roomName roomNumber' },
  { path: 'timeslot', select: 'groupName startTime endTime dayOfWeek' },
];
const EXPECTED_UNIQUE_INDEX_KEYS = ['feedbackTemplate', 'submittedBy', 'evaluatedEntity', 'classSection'];
let ensureFeedbackSubmissionIndexesPromise = null;

class FeedbackSubmissionService {
  async ensureSubmissionIndexes() {
    if (!ensureFeedbackSubmissionIndexesPromise) {
      ensureFeedbackSubmissionIndexesPromise = (async () => {
        try {
          const indexes = await FeedbackSubmission.collection.indexes();
          for (const index of indexes) {
            const keyNames = Object.keys(index.key || {});
            const hasCoreKeys =
              keyNames.includes('feedbackTemplate') &&
              keyNames.includes('submittedBy');
            const isExpectedIndex =
              EXPECTED_UNIQUE_INDEX_KEYS.length === keyNames.length &&
              EXPECTED_UNIQUE_INDEX_KEYS.every((key) => keyNames.includes(key));

            if (index.unique && hasCoreKeys && !isExpectedIndex) {
              await FeedbackSubmission.collection.dropIndex(index.name);
              console.warn('[feedbackSubmission] Dropped legacy unique index:', index.name);
            }
          }

          await FeedbackSubmission.collection.createIndex(
            {
              feedbackTemplate: 1,
              submittedBy: 1,
              evaluatedEntity: 1,
              classSection: 1,
            },
            {
              unique: true,
              name: 'feedbackTemplate_1_submittedBy_1_evaluatedEntity_1_classSection_1',
            },
          );
        } catch (error) {
          if (
            error?.codeName !== 'IndexOptionsConflict' &&
            error?.codeName !== 'IndexKeySpecsConflict'
          ) {
            console.warn('[feedbackSubmission] Unable to reconcile indexes:', error?.message || error);
          }
        }
      })();
    }

    return ensureFeedbackSubmissionIndexesPromise;
  }

  async getStudentRecordByUserId(userId) {
    const student = await Student.findOne({ userId })
      .select('_id userId studentCode fullName email')
      .lean();

    if (!student) {
      throw new Error('Student record not found');
    }

    return student;
  }

  async getTemplateById(templateId) {
    const template = await FeedbackTemplate.findById(templateId)
      .populate('subject', 'subjectCode subjectName')
      .populate('classSection', 'classCode className');

    if (!template) {
      throw new Error('Feedback template not found');
    }

    return template;
  }

  assertTemplateOpen(template) {
    const now = new Date();
    const startDate = new Date(template.feedbackPeriod?.startDate);
    const endDate = new Date(template.feedbackPeriod?.endDate);

    if (template.status !== 'active') {
      throw new Error('Feedback template is not active');
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error('Feedback template period is invalid');
    }

    if (now < startDate || now > endDate) {
      throw new Error('Feedback period is not open');
    }
  }

  async getClassSectionById(classSectionId) {
    const classSection = await ClassSection.findById(classSectionId)
      .populate(CLASS_SECTION_POPULATE);

    if (!classSection) {
      throw new Error('Class section not found');
    }

    return classSection;
  }

  async validateStudentEnrollment(studentId, classSectionId) {
    const enrollment = await ClassEnrollment.findOne({
      student: studentId,
      classSection: classSectionId,
      status: { $in: ['enrolled', 'completed'] },
    }).lean();

    if (!enrollment) {
      throw new Error('You are not enrolled in this class');
    }

    return enrollment;
  }

  validateTemplateScope(template, classSection) {
    if (!classSection) {
      return { matched: true, reason: null };
    }

    if (template.subject) {
      const templateSubjectId = String(template.subject?._id || template.subject);
      const classSubjectId = String(classSection.subject?._id || classSection.subject || '');

      if (templateSubjectId !== classSubjectId) {
        return { matched: false, reason: 'subject-mismatch' };
      }
    }

    if (template.classSection) {
      const templateClassId = String(template.classSection?._id || template.classSection);
      if (templateClassId !== String(classSection._id)) {
        return { matched: false, reason: 'class-mismatch' };
      }
    }

    return { matched: true, reason: null };
  }

  normalizeResponseAnswer(question, answer) {
    if (question.questionType === 'rating') {
      const rating = Number(answer);
      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > Number(question.ratingScale || 5)
      ) {
        throw new Error(`Invalid rating for question: ${question.questionText}`);
      }

      return rating;
    }

    if (question.questionType === 'multipleChoice') {
      const value = String(answer || '').trim();
      const allowedValues = (question.options || []).map((option) => String(option.value));

      if (!value) {
        return '';
      }

      if (!allowedValues.includes(value)) {
        throw new Error(`Invalid choice for question: ${question.questionText}`);
      }

      return value;
    }

    const text = String(answer || '').trim();
    if (!text) {
      return '';
    }

    if (text.length > Number(question.maxLength || 500)) {
      throw new Error(`Answer is too long for question: ${question.questionText}`);
    }

    return text;
  }

  normalizeResponses(template, responses = []) {
    if (!Array.isArray(responses) || responses.length === 0) {
      throw new Error('responses is required');
    }

    const responseMap = new Map(
      responses.map((response) => [String(response.questionId || ''), response]),
    );

    for (const response of responses) {
      const exists = template.questions.some(
        (question) => String(question._id) === String(response.questionId || ''),
      );

      if (!exists) {
        throw new Error('Response contains an unknown question');
      }
    }

    const normalized = [];

    for (const question of template.questions) {
      const response = responseMap.get(String(question._id));
      const normalizedAnswer = this.normalizeResponseAnswer(question, response?.answer);

      if (question.isRequired && !normalizedAnswer) {
        throw new Error(`Missing answer for question: ${question.questionText}`);
      }

      if (!normalizedAnswer) {
        continue;
      }

      normalized.push({
        questionId: question._id,
        questionText: question.questionText,
        questionType: question.questionType,
        answer: normalizedAnswer,
        answeredAt: new Date(),
      });
    }

    if (normalized.length === 0) {
      throw new Error('At least one response is required');
    }

    return normalized;
  }

  calculateSubmissionScore(responses = []) {
    const ratings = responses
      .filter((response) => response.questionType === 'rating')
      .map((response) => Number(response.answer))
      .filter((value) => Number.isFinite(value));

    if (!ratings.length) {
      return 0;
    }

    const average = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
    return Number(average.toFixed(2));
  }

  async submitFeedback(data, userId, meta = {}) {
    const {
      feedbackTemplateId,
      evaluatedEntityId,
      evaluationType,
      classSectionId,
      responses,
    } = data;

    const [student, template] = await Promise.all([
      this.getStudentRecordByUserId(userId),
      this.getTemplateById(feedbackTemplateId),
    ]);

    await this.ensureSubmissionIndexes();

    this.assertTemplateOpen(template);

    if (String(template.evaluationTarget) !== String(evaluationType)) {
      throw new Error('Evaluation type does not match feedback template');
    }

    let classSection = null;
    let evaluatedEntity = evaluatedEntityId || null;

    if (evaluationType === 'teacher') {
      if (!classSectionId) {
        throw new Error('classSectionId is required');
      }

      classSection = await this.getClassSectionById(classSectionId);
      await this.validateStudentEnrollment(student._id, classSectionId);
      const templateScope = this.validateTemplateScope(template, classSection);
      if (!templateScope.matched) {
        console.warn(
          '[feedbackSubmission] Allowing submit despite template scope mismatch:',
          templateScope.reason,
          'template=',
          String(template._id),
          'classSection=',
          String(classSection._id),
        );
      }

      const teacherId = classSection.teacher?._id || classSection.teacher;
      if (!teacherId) {
        throw new Error('Selected class does not have an assigned lecturer');
      }

      if (evaluatedEntity && String(evaluatedEntity) !== String(teacherId)) {
        console.warn(
          '[feedbackSubmission] Overriding evaluatedEntity to match class lecturer:',
          String(evaluatedEntity),
          '->',
          String(teacherId),
        );
      }

      evaluatedEntity = teacherId;
    }

    if (!evaluatedEntity) {
      throw new Error('evaluatedEntityId is required');
    }

    const normalizedResponses = this.normalizeResponses(template, responses);

    const duplicateQuery = {
      feedbackTemplate: template._id,
      submittedBy: userId,
      evaluatedEntity,
      classSection: classSection?._id || null,
    };

    const existingSubmission = await FeedbackSubmission.findOne(duplicateQuery)
      .select('_id')
      .lean();

    if (existingSubmission) {
      throw new Error('You already submitted feedback for this class in the current feedback campaign');
    }

    let submission;
    try {
      submission = await FeedbackSubmission.create({
        feedbackTemplate: template._id,
        submittedBy: userId,
        evaluatedEntity,
        evaluationType,
        classSection: classSection?._id || null,
        responses: normalizedResponses,
        status: 'submitted',
        submissionScore: this.calculateSubmissionScore(normalizedResponses),
        submissionIp: meta.ip || '',
        submissionUserAgent: meta.userAgent || '',
      });
    } catch (error) {
      if (error?.code === 11000) {
        const existingByClass = await FeedbackSubmission.findOne({
          feedbackTemplate: template._id,
          submittedBy: userId,
          classSection: classSection?._id || null,
        })
          .populate('feedbackTemplate')
          .populate({
            path: 'classSection',
            populate: CLASS_SECTION_POPULATE,
          });

        if (existingByClass) {
          return existingByClass;
        }
      }

      throw error;
    }

    await submission.populate('feedbackTemplate');
    await submission.populate({
      path: 'classSection',
      populate: CLASS_SECTION_POPULATE,
    });

    return submission;
  }

  async getMySubmissions(userId, filters = {}) {
    const query = {
      submittedBy: userId,
    };

    if (filters.feedbackTemplateId) {
      query.feedbackTemplate = filters.feedbackTemplateId;
    }

    if (filters.evaluationType) {
      query.evaluationType = filters.evaluationType;
    }

    if (filters.classSectionId) {
      query.classSection = filters.classSectionId;
    }

    const submissions = await FeedbackSubmission.find(query)
      .populate('feedbackTemplate')
      .populate({
        path: 'classSection',
        populate: CLASS_SECTION_POPULATE,
      })
      .sort({ createdAt: -1 })
      .lean();

    return submissions;
  }

  async listSubmissions({
    page = 1,
    limit = 20,
    feedbackTemplateId = '',
    evaluationType = '',
    classSectionId = '',
  } = {}) {
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 20));
    const query = {};

    if (feedbackTemplateId) {
      query.feedbackTemplate = feedbackTemplateId;
    }

    if (evaluationType) {
      query.evaluationType = evaluationType;
    }

    if (classSectionId) {
      query.classSection = classSectionId;
    }

    const [total, data] = await Promise.all([
      FeedbackSubmission.countDocuments(query),
      FeedbackSubmission.find(query)
        .populate('feedbackTemplate')
        .populate({
          path: 'classSection',
          populate: CLASS_SECTION_POPULATE,
        })
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean(),
    ]);

    return {
      data,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber) || 1,
      },
    };
  }
}

module.exports = new FeedbackSubmissionService();
