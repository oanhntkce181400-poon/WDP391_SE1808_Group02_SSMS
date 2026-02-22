const feedbackService = require('../services/feedback.service');

class FeedbackController {
  /**
   * POST /api/feedbacks
   * Student submits feedback for a class
   */
  async submitFeedback(req, res) {
    try {
      const userId = req.auth?.sub;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const { classSection, rating, comment, criteria, isAnonymous } = req.body;

      // Validation
      if (!classSection) {
        return res.status(400).json({
          success: false,
          message: 'classSection is required'
        });
      }

      if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5'
        });
      }

      // Create feedback
      const feedback = await feedbackService.createFeedback(
        { classSection, rating, comment, criteria, isAnonymous },
        userId,
        req
      );

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: feedback
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('not enrolled') || error.message.includes('already submitted')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedbacks/class/:classSectionId
   * Get feedbacks for a class (public - anyone can see approved ones)
   */
  async getClassFeedback(req, res) {
    try {
      const { classSectionId } = req.params;
      const { status = 'approved' } = req.query;

      const feedbacks = await feedbackService.getFeedbackByClass(classSectionId, {
        status,
        includeAnonymous: true
      });

      res.json({
        success: true,
        data: feedbacks,
        total: feedbacks.length
      });
    } catch (error) {
      console.error('Error fetching class feedback:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedbacks/class/:classSectionId/stats
   * Get feedback statistics for a class
   */
  async getClassFeedbackStats(req, res) {
    try {
      const { classSectionId } = req.params;

      const stats = await feedbackService.getClassFeedbackStats(classSectionId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedbacks/my-feedbacks
   * Get feedbacks submitted by current student
   */
  async getMyFeedback(req, res) {
    try {
      const userId = req.auth?.sub;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const feedbacks = await feedbackService.getStudentFeedback(userId);

      res.json({
        success: true,
        data: feedbacks
      });
    } catch (error) {
      console.error('Error fetching student feedback:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * PATCH /api/feedbacks/:feedbackId/approve
   * Approve feedback (admin/staff only)
   */
  async approveFeedback(req, res) {
    try {
      const { feedbackId } = req.params;

      const feedback = await feedbackService.approveFeedback(feedbackId);

      res.json({
        success: true,
        message: 'Feedback approved',
        data: feedback
      });
    } catch (error) {
      console.error('Error approving feedback:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * PATCH /api/feedbacks/:feedbackId/reject
   * Reject feedback (admin/staff only)
   */
  async rejectFeedback(req, res) {
    try {
      const { feedbackId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      const feedback = await feedbackService.rejectFeedback(feedbackId, reason);

      res.json({
        success: true,
        message: 'Feedback rejected',
        data: feedback
      });
    } catch (error) {
      console.error('Error rejecting feedback:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * DELETE /api/feedbacks/:feedbackId
   * Delete feedback (admin/staff only)
   */
  async deleteFeedback(req, res) {
    try {
      const { feedbackId } = req.params;

      const feedback = await feedbackService.deleteFeedback(feedbackId);

      res.json({
        success: true,
        message: 'Feedback deleted',
        data: feedback
      });
    } catch (error) {
      console.error('Error deleting feedback:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/feedbacks/:id
   * Student updates their own feedback (if within feedback window)
   */
  async updateFeedback(req, res) {
    try {
      const userId = req.auth?.sub;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const { id: feedbackId } = req.params;
      const { rating, comment, criteria } = req.body;

      // Validate input
      if (rating !== undefined && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5'
        });
      }

      const feedback = await feedbackService.updateFeedback(feedbackId, userId, {
        rating,
        comment,
        criteria
      });

      res.json({
        success: true,
        message: 'Feedback updated successfully',
        data: feedback
      });
    } catch (error) {
      console.error('Error updating feedback:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('permission') || error.message.includes('window') || error.message.includes('expired')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * DELETE /api/feedbacks/:id
   * Student deletes their own feedback (if within feedback window)
   */
  async deleteFeedback(req, res) {
    try {
      const userId = req.auth?.sub;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const { id: feedbackId } = req.params;

      const deletedFeedback = await feedbackService.deleteStudentFeedback(feedbackId, userId);

      res.json({
        success: true,
        message: 'Feedback deleted successfully',
        data: deletedFeedback
      });
    } catch (error) {
      console.error('Error deleting feedback:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('permission') || error.message.includes('window') || error.message.includes('expired')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedbacks/:id/window
   * Get feedback window info (remaining time to edit)
   */
  async getFeedbackWindowInfo(req, res) {
    try {
      const { id: feedbackId } = req.params;

      const windowInfo = await feedbackService.getFeedbackWindowInfo(feedbackId);

      res.json({
        success: true,
        data: windowInfo
      });
    } catch (error) {
      console.error('Error getting feedback window info:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedbacks/pending
   * Get all pending feedbacks (admin/staff only)
   */
  async getPendingFeedback(req, res) {
    try {
      const { limit = 20, skip = 0 } = req.query;

      const result = await feedbackService.getPendingFeedback(
        parseInt(limit),
        parseInt(skip)
      );

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        limit: result.limit,
        skip: result.skip
      });
    } catch (error) {
      console.error('Error fetching pending feedback:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
}

module.exports = new FeedbackController();
