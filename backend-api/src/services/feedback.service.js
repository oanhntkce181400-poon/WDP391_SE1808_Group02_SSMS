const Feedback = require('../models/feedback.model');
const ClassSection = require('../models/classSection.model');
const StudentEnrollment = require('../models/classEnrollment.model');
const Student = require('../models/student.model');
const feedbackTemplateService = require('./feedbackTemplate.service');

/**
 * A shared populate definition keeps every feedback response consistent between
 * "my feedback", "recent class feedback", and the update flow. Centralising it
 * avoids subtle field mismatches across endpoints.
 */
const FEEDBACK_CLASS_POPULATE = [
  { path: 'subject', select: 'subjectCode subjectName credits' },
  { path: 'teacher', select: 'teacherCode fullName email' },
  { path: 'room', select: 'roomCode roomName roomNumber' },
];

class FeedbackService {
  /**
   * Feedback ownership is stored against the authenticated User id, but class
   * enrollment records point to the Student document id. We therefore need this
   * translation step before checking whether the caller is allowed to submit
   * feedback for the selected class.
   */
  async getStudentRecordByUserId(userId) {
    const student = await Student.findOne({ userId })
      .select('_id userId studentCode fullName')
      .lean();

    if (!student) {
      throw new Error('Student record not found');
    }

    return student;
  }

  /**
   * Enrollment validation uses the Student document id, not the User id.
   *
   * We only allow feedback when the enrollment is active enough to represent a
   * real learning experience. "completed" is kept valid so students can still
   * review a class after finishing it, while transient statuses are excluded.
   */
  async validateStudentInClass(studentId, classSectionId) {
    try {
      const enrollment = await StudentEnrollment.findOne({
        student: studentId,
        classSection: classSectionId,
        status: { $in: ['enrolled', 'completed'] },
      });

      return !!enrollment;
    } catch (error) {
      console.error('Error validating student enrollment:', error);
      throw error;
    }
  }

  async getFeedbackAvailability() {
    try {
      return await feedbackTemplateService.getTeacherFeedbackAvailability();
    } catch (error) {
      console.error('Error fetching feedback availability:', error);
      throw error;
    }
  }

  async assertFeedbackWindowOpen() {
    const availability = await this.getFeedbackAvailability();

    if (availability?.isOpen) {
      return availability;
    }

    const error = new Error(
      availability?.message || 'Hiện chưa có đợt đánh giá giảng viên nào đang mở.',
    );
    error.code = 'FEEDBACK_WINDOW_CLOSED';
    throw error;
  }

  /**
   * Creates one feedback record for one student in one class.
   *
   * Key business rules:
   * 1. The class must exist.
   * 2. The authenticated user must map to a Student record.
   * 3. That student must actually be enrolled in the class.
   * 4. One student can submit only one feedback per class.
   * 5. Even anonymous feedback still stores submittedBy internally so the owner
   *    can reopen and edit the same submission later.
   */
  async createFeedback(data, userId, req) {
    try {
      const { classSection, rating, comment, criteria, isAnonymous } = data;
      const student = await this.getStudentRecordByUserId(userId);

      await this.assertFeedbackWindowOpen();

      const classExists = await ClassSection.findById(classSection);
      if (!classExists) {
        throw new Error('Class section not found');
      }

      const isEnrolled = await this.validateStudentInClass(student._id, classSection);
      if (!isEnrolled) {
        throw new Error('You are not enrolled in this class');
      }

      if (!rating || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const existingFeedback = await Feedback.findOne({
        classSection,
        submittedBy: userId,
      });

      if (existingFeedback) {
        const duplicateError = new Error('You have already submitted feedback for this class');
        duplicateError.code = 'FEEDBACK_ALREADY_SUBMITTED';
        throw duplicateError;
      }

      const feedback = new Feedback({
        classSection,
        submittedBy: userId,
        // "Anonymous" only controls what is shown publicly. Ownership still
        // needs to exist internally for the student's private edit flow.
        isAnonymous: isAnonymous !== false,
        rating,
        comment: comment || '',
        criteria: criteria || {},
        // Auto-approving keeps the student-facing class feed responsive without
        // requiring a manual moderation step for this specific feature.
        status: 'approved',
        submissionIp: req?.ip,
        submissionUserAgent: req?.get('User-Agent'),
      });

      await feedback.save();
      await feedback.populate({
        path: 'classSection',
        populate: FEEDBACK_CLASS_POPULATE,
      });

      return feedback;
    } catch (error) {
      if (error?.code === 11000) {
        const duplicateError = new Error('You have already submitted feedback for this class');
        duplicateError.code = 'FEEDBACK_ALREADY_SUBMITTED';
        console.error('Duplicate feedback submission blocked:', error);
        throw duplicateError;
      }

      console.error('Error creating feedback:', error);
      throw error;
    }
  }

  /**
   * Returns the public feedback stream for one class.
   *
   * Privacy note: we intentionally strip submittedBy and request metadata so
   * public consumers cannot recover who posted the feedback or from where.
   */
  async getFeedbackByClass(classSectionId, filters = {}) {
    try {
      const { status = 'approved' } = filters;

      const query = {
        classSection: classSectionId,
        ...(status && { status }),
      };

      const feedbacks = await Feedback.find(query)
        .select('-submittedBy -submissionIp -submissionUserAgent -__v')
        .sort({ createdAt: -1 })
        .lean();

      return feedbacks;
    } catch (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }
  }

  /**
   * Builds the lecturer feedback summary card shown on mobile.
   *
   * The method stays intentionally lightweight: it computes totals, averages and
   * a sentiment label directly from the approved feedback documents without
   * introducing another reporting table.
   */
  async getClassFeedbackStats(classSectionId) {
    try {
      const feedbacks = await Feedback.find({
        classSection: classSectionId,
        status: 'approved',
      }).lean();

      if (feedbacks.length === 0) {
        return {
          totalFeedback: 0,
          averageRating: 0,
          ratingDistribution: {},
          criteriaAverages: {},
          sentiment: 'No feedback yet',
        };
      }

      const ratings = feedbacks.map((feedback) => feedback.rating);
      const averageRating = (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2);

      const ratingDistribution = {
        1: feedbacks.filter((feedback) => feedback.rating === 1).length,
        2: feedbacks.filter((feedback) => feedback.rating === 2).length,
        3: feedbacks.filter((feedback) => feedback.rating === 3).length,
        4: feedbacks.filter((feedback) => feedback.rating === 4).length,
        5: feedbacks.filter((feedback) => feedback.rating === 5).length,
      };

      const criteriaAverages = {};
      const criteriaKeys = ['teachingQuality', 'courseContent', 'classEnvironment', 'materialQuality'];

      for (const criterion of criteriaKeys) {
        const values = feedbacks
          .map((feedback) => feedback.criteria?.[criterion])
          .filter((value) => value !== null && value !== undefined);

        if (values.length > 0) {
          criteriaAverages[criterion] = (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2);
        }
      }

      let sentiment = 'Average';
      if (averageRating >= 4.5) sentiment = 'Excellent';
      else if (averageRating >= 4) sentiment = 'Very Good';
      else if (averageRating >= 3) sentiment = 'Good';
      else if (averageRating >= 2) sentiment = 'Fair';
      else sentiment = 'Poor';

      return {
        totalFeedback: feedbacks.length,
        averageRating: parseFloat(averageRating),
        ratingDistribution,
        criteriaAverages,
        sentiment,
      };
    } catch (error) {
      console.error('Error calculating feedback stats:', error);
      throw error;
    }
  }

  /**
   * Returns only the feedbacks owned by the authenticated user.
   *
   * The parameter is intentionally the User id because submittedBy now always
   * stores the owner internally, even when the feedback is anonymous to others.
   */
  async getStudentFeedback(userId) {
    try {
      const feedbacks = await Feedback.find({
        submittedBy: userId,
      })
        .populate({
          path: 'classSection',
          populate: FEEDBACK_CLASS_POPULATE,
        })
        .sort({ createdAt: -1 })
        .lean();

      return feedbacks;
    } catch (error) {
      console.error('Error fetching student feedback:', error);
      throw error;
    }
  }

  async approveFeedback(feedbackId) {
    try {
      const feedback = await Feedback.findByIdAndUpdate(
        feedbackId,
        { status: 'approved' },
        { new: true },
      );

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      return feedback;
    } catch (error) {
      console.error('Error approving feedback:', error);
      throw error;
    }
  }

  async rejectFeedback(feedbackId, reason) {
    try {
      const feedback = await Feedback.findByIdAndUpdate(
        feedbackId,
        { status: 'rejected', rejectionReason: reason },
        { new: true },
      );

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      return feedback;
    } catch (error) {
      console.error('Error rejecting feedback:', error);
      throw error;
    }
  }

  async deleteFeedback(feedbackId) {
    try {
      const feedback = await Feedback.findByIdAndDelete(feedbackId);

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      return feedback;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  }

  /**
   * The update window is derived from the latest active feedback template.
   *
   * This keeps the student experience consistent with the rest of the feedback
   * module without storing duplicated date ranges directly on each feedback row.
   */
  async checkFeedbackWindow(feedbackId) {
    try {
      const feedback = await Feedback.findById(feedbackId).populate({
        path: 'classSection',
        populate: {
          path: 'subject',
        },
      });

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      const FeedbackTemplate = require('../models/feedbackTemplate.model');
      const template = await FeedbackTemplate.findOne({
        status: { $in: ['active', 'draft'] },
      }).sort({ createdAt: -1 });

      if (!template || !template.feedbackPeriod) {
        throw new Error('No active feedback template found');
      }

      const now = new Date();
      const startDate = new Date(template.feedbackPeriod.startDate);
      const endDate = new Date(template.feedbackPeriod.endDate);

      if (now < startDate) {
        throw new Error('Feedback window has not started yet');
      }

      if (now > endDate) {
        throw new Error('Feedback window has expired');
      }

      const remainingMs = endDate.getTime() - now.getTime();
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

      return {
        isValid: true,
        remainingMs,
        remainingMinutes,
        remainingHours,
        remainingDays,
        endDate,
      };
    } catch (error) {
      console.error('Error checking feedback window:', error);
      throw error;
    }
  }

  /**
   * Students may update only their own record while the active lecturer
   * feedback window is still open.
   *
   * This intentionally mirrors the create flow so the mobile UI and the API
   * enforce the same business rule instead of drifting apart.
   */
  async updateFeedback(feedbackId, userId, updateData) {
    try {
      const feedback = await Feedback.findById(feedbackId);

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      if (!feedback.submittedBy || feedback.submittedBy.toString() !== userId.toString()) {
        throw new Error('You do not have permission to update this feedback');
      }

      await this.assertFeedbackWindowOpen();

      const allowedFields = ['rating', 'comment', 'criteria'];
      const update = {};

      allowedFields.forEach((field) => {
        if (field in updateData) {
          update[field] = updateData[field];
        }
      });

      if ('rating' in update && (!update.rating || update.rating < 1 || update.rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
      }

      const updatedFeedback = await Feedback.findByIdAndUpdate(
        feedbackId,
        update,
        { new: true, runValidators: true },
      ).populate({
        path: 'classSection',
        populate: FEEDBACK_CLASS_POPULATE,
      });

      return updatedFeedback;
    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  }

  /**
   * Student self-delete follows the same ownership rule as update.
   *
   * Removing the old feedback-window dependency keeps create/update/delete
   * behavior consistent for the student's own lecturer feedback history.
   */
  async deleteStudentFeedback(feedbackId, userId) {
    try {
      const feedback = await Feedback.findById(feedbackId);

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      if (!feedback.submittedBy || feedback.submittedBy.toString() !== userId.toString()) {
        throw new Error('You do not have permission to delete this feedback');
      }

      const deletedFeedback = await Feedback.findByIdAndDelete(feedbackId);
      return deletedFeedback;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  }

  async getFeedbackWindowInfo(feedbackId, userId, role = '') {
    try {
      const feedback = await Feedback.findById(feedbackId).select('submittedBy classSection');

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      const normalizedRole = String(role || '').toLowerCase();
      const canBypassOwnership = normalizedRole === 'admin' || normalizedRole === 'staff';

      if (
        !canBypassOwnership &&
        (!feedback.submittedBy || feedback.submittedBy.toString() !== userId.toString())
      ) {
        throw new Error('You do not have permission to view this feedback');
      }

      const availability = await this.getFeedbackAvailability();

      return {
        isValid: availability?.isOpen === true,
        error: availability?.isOpen ? null : availability?.message || 'Chưa đến thời gian đánh giá.',
        remainingMs: null,
        remainingMinutes: null,
        remainingHours: null,
        remainingDays: null,
        mode: availability?.isOpen ? 'feedback-open' : 'feedback-closed',
        state: availability?.state || 'closed',
        startsAt: availability?.startsAt || null,
        endsAt: availability?.endsAt || null,
        startsAtLabel: availability?.startsAtLabel || null,
        endsAtLabel: availability?.endsAtLabel || null,
        templateId: availability?.templateId || null,
        templateName: availability?.templateName || null,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        remainingMs: 0,
        remainingMinutes: 0,
        remainingHours: 0,
        remainingDays: 0,
      };
    }
  }

  async getPendingFeedback(limit = 20, skip = 0) {
    try {
      const feedbacks = await Feedback.find({ status: 'pending' })
        .populate({
          path: 'classSection',
          populate: FEEDBACK_CLASS_POPULATE,
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await Feedback.countDocuments({ status: 'pending' });

      return {
        data: feedbacks,
        total,
        limit,
        skip,
      };
    } catch (error) {
      console.error('Error fetching pending feedback:', error);
      throw error;
    }
  }
}

module.exports = new FeedbackService();
