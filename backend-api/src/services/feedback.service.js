const Feedback = require('../models/feedback.model');
const ClassSection = require('../models/classSection.model');
const StudentEnrollment = require('../models/classEnrollment.model');

class FeedbackService {
  /**
   * Validate sinh viên là học viên của lớp học
   */
  async validateStudentInClass(studentId, classSectionId) {
    try {
      const enrollment = await StudentEnrollment.findOne({
        student: studentId,
        classSection: classSectionId,
        status: { $in: ['enrolled', 'active'] }
      });

      return !!enrollment;
    } catch (error) {
      console.error('Error validating student enrollment:', error);
      throw error;
    }
  }

  /**
   * Tạo feedback mới
   */
  async createFeedback(data, userId, req) {
    try {
      const { classSection, rating, comment, criteria, isAnonymous } = data;

      // Validate classSection exists
      const classExists = await ClassSection.findById(classSection);
      if (!classExists) {
        throw new Error('Class section not found');
      }

      // Validate student is enrolled in this class
      const isEnrolled = await this.validateStudentInClass(userId, classSection);
      if (!isEnrolled) {
        throw new Error('You are not enrolled in this class');
      }

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Check if student already submitted feedback for this class
      const existingFeedback = await Feedback.findOne({
        classSection,
        submittedBy: userId,
        isAnonymous: false
      });

      if (existingFeedback) {
        throw new Error('You have already submitted feedback for this class');
      }

      // Create feedback
      const feedback = new Feedback({
        classSection,
        submittedBy: isAnonymous ? null : userId,
        isAnonymous: isAnonymous !== false, // Default to true if not specified
        rating,
        comment: comment || '',
        criteria: criteria || {},
        status: 'approved',  // Auto-approve student feedback so it displays immediately
        submissionIp: req?.ip,
        submissionUserAgent: req?.get('User-Agent')
      });

      await feedback.save();
      await feedback.populate('classSection');

      return feedback;
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw error;
    }
  }

  /**
   * Lấy các feedback cho một lớp học
   */
  async getFeedbackByClass(classSectionId, filters = {}) {
    try {
      const { status = 'approved', includeAnonymous = true } = filters;

      const query = {
        classSection: classSectionId,
        ...(status && { status })
      };

      const feedbacks = await Feedback.find(query)
        .select(includeAnonymous ? '' : '-submittedBy')
        .sort({ createdAt: -1 })
        .lean();

      return feedbacks;
    } catch (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }
  }

  /**
   * Lấy thống kê feedback cho một lớp học
   */
  async getClassFeedbackStats(classSectionId) {
    try {
      const feedbacks = await Feedback.find({
        classSection: classSectionId,
        status: 'approved'
      }).lean();

      if (feedbacks.length === 0) {
        return {
          totalFeedback: 0,
          averageRating: 0,
          ratingDistribution: {},
          criteriaAverages: {},
          sentiment: 'No feedback yet'
        };
      }

      // Tính toán thống kê
      const ratings = feedbacks.map(f => f.rating);
      const averageRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);

      // Phân bố rating
      const ratingDistribution = {
        1: feedbacks.filter(f => f.rating === 1).length,
        2: feedbacks.filter(f => f.rating === 2).length,
        3: feedbacks.filter(f => f.rating === 3).length,
        4: feedbacks.filter(f => f.rating === 4).length,
        5: feedbacks.filter(f => f.rating === 5).length
      };

      // Tính trung bình các tiêu chí
      const criteriaAverages = {};
      const criteria = ['teachingQuality', 'courseContent', 'classEnvironment', 'materialQuality'];

      for (const criterion of criteria) {
        const values = feedbacks
          .map(f => f.criteria?.[criterion])
          .filter(v => v !== null && v !== undefined);

        if (values.length > 0) {
          criteriaAverages[criterion] = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
        }
      }

      // Xác định sentiment
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
        sentiment
      };
    } catch (error) {
      console.error('Error calculating feedback stats:', error);
      throw error;
    }
  }

  /**
   * Lấy feedback của student
   */
  async getStudentFeedback(studentId) {
    try {
      const feedbacks = await Feedback.find({
        submittedBy: studentId
      })
        .populate('classSection')
        .sort({ createdAt: -1 })
        .lean();

      return feedbacks;
    } catch (error) {
      console.error('Error fetching student feedback:', error);
      throw error;
    }
  }

  /**
   * Approve feedback (admin/staff)
   */
  async approveFeedback(feedbackId) {
    try {
      const feedback = await Feedback.findByIdAndUpdate(
        feedbackId,
        { status: 'approved' },
        { new: true }
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

  /**
   * Reject feedback (admin/staff)
   */
  async rejectFeedback(feedbackId, reason) {
    try {
      const feedback = await Feedback.findByIdAndUpdate(
        feedbackId,
        { status: 'rejected', rejectionReason: reason },
        { new: true }
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

  /**
   * Xóa feedback (admin/staff)
   */
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
   * Check if feedback is within the feedback window (time constraint)
   */
  async checkFeedbackWindow(feedbackId) {
    try {
      const feedback = await Feedback.findById(feedbackId).populate({
        path: 'classSection',
        populate: {
          path: 'subject'
        }
      });

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      // Get FeedbackTemplate - for now, get the active/most recent one
      // In production, this should be linked through ClassSection or Subject
      const FeedbackTemplate = require('../models/feedbackTemplate.model');
      const template = await FeedbackTemplate.findOne({
        status: { $in: ['active', 'draft'] }
      }).sort({ createdAt: -1 });

      if (!template || !template.feedbackPeriod) {
        throw new Error('No active feedback template found');
      }

      const now = new Date();
      const startDate = new Date(template.feedbackPeriod.startDate);
      const endDate = new Date(template.feedbackPeriod.endDate);

      // Check if current time is within feedback window
      if (now < startDate) {
        throw new Error('Feedback window has not started yet');
      }

      if (now > endDate) {
        throw new Error('Feedback window has expired');
      }

      // Calculate remaining time
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
        endDate
      };
    } catch (error) {
      console.error('Error checking feedback window:', error);
      throw error;
    }
  }

  /**
   * Update feedback (student can only update if within feedback window)
   */
  async updateFeedback(feedbackId, userId, updateData) {
    try {
      const feedback = await Feedback.findById(feedbackId);

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      // Verify ownership
      if (feedback.submittedBy.toString() !== userId.toString() && !feedback.isAnonymous) {
        throw new Error('You do not have permission to update this feedback');
      }

      // Check if within feedback window
      const windowCheck = await this.checkFeedbackWindow(feedbackId);
      if (!windowCheck.isValid) {
        throw new Error('Cannot update feedback outside of feedback window');
      }

      // Update allowed fields only
      const allowedFields = ['rating', 'comment', 'criteria'];
      const update = {};

      allowedFields.forEach(field => {
        if (field in updateData) {
          update[field] = updateData[field];
        }
      });

      // Validate rating if provided
      if ('rating' in update) {
        if (!update.rating || update.rating < 1 || update.rating > 5) {
          throw new Error('Rating must be between 1 and 5');
        }
      }

      const updatedFeedback = await Feedback.findByIdAndUpdate(
        feedbackId,
        update,
        { new: true, runValidators: true }
      ).populate('classSection');

      return updatedFeedback;
    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  }

  /**
   * Delete feedback (student can only delete if within feedback window)
   */
  async deleteStudentFeedback(feedbackId, userId) {
    try {
      const feedback = await Feedback.findById(feedbackId);

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      // Verify ownership
      if (feedback.submittedBy.toString() !== userId.toString() && !feedback.isAnonymous) {
        throw new Error('You do not have permission to delete this feedback');
      }

      // Check if within feedback window
      const windowCheck = await this.checkFeedbackWindow(feedbackId);
      if (!windowCheck.isValid) {
        throw new Error('Cannot delete feedback outside of feedback window');
      }

      const deletedFeedback = await Feedback.findByIdAndDelete(feedbackId);
      return deletedFeedback;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  }

  /**
   * Lấy feedback window info for a feedback
   */
  async getFeedbackWindowInfo(feedbackId) {
    try {
      const windowInfo = await this.checkFeedbackWindow(feedbackId);
      return windowInfo;
    } catch (error) {
      // If there's an error, return expired status
      return {
        isValid: false,
        error: error.message,
        remainingMs: 0,
        remainingMinutes: 0,
        remainingHours: 0,
        remainingDays: 0
      };
    }
  }

  /**
   * Lấy tất cả feedback pending
   */
  async getPendingFeedback(limit = 20, skip = 0) {
    try {
      const feedbacks = await Feedback.find({ status: 'pending' })
        .populate('classSection')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await Feedback.countDocuments({ status: 'pending' });

      return {
        data: feedbacks,
        total,
        limit,
        skip
      };
    } catch (error) {
      console.error('Error fetching pending feedback:', error);
      throw error;
    }
  }
}

module.exports = new FeedbackService();
