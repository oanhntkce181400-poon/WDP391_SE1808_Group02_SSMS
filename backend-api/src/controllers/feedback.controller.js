const feedbackService = require('../services/feedback.service');

class FeedbackController {
  /**
   * POST /api/feedbacks
   *
   * The mobile feedback flow must always know which authenticated student owns
   * the submission so the same record can later be shown again in "My feedback"
   * and updated inside the feedback window. For that reason we always resolve
   * the user id from the access token and pass it into the service layer.
   */
  async submitFeedback(req, res) {
    try {
      const userId = req.auth?.sub || req.auth?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { classSection, rating, comment, criteria, isAnonymous } = req.body;

      // Keep the request validation in the controller so obviously-invalid
      // payloads fail fast before the service starts hitting the database.
      if (!classSection) {
        return res.status(400).json({
          success: false,
          message: 'classSection is required',
        });
      }

      if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5',
        });
      }

      const feedback = await feedbackService.createFeedback(
        { classSection, rating, comment, criteria, isAnonymous },
        userId,
        req,
      );

      return res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: feedback,
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);

      if (error.code === 'FEEDBACK_WINDOW_CLOSED') {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes('not enrolled') || error.message.includes('already submitted')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async getFeedbackAvailability(req, res) {
    try {
      const availability = await feedbackService.getFeedbackAvailability();

      return res.json({
        success: true,
        data: availability,
      });
    } catch (error) {
      console.error('Error fetching feedback availability:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  /**
   * GET /api/feedbacks/class/:classSectionId
   *
   * This feed is used by authenticated users only. Students see approved
   * lecturer feedback inside the mobile app, while admin/staff can inspect the
   * same approved feed through the API with their own token.
   */
  async getClassFeedback(req, res) {
    try {
      const { classSectionId } = req.params;
      // This mobile-facing feed should only expose approved feedback. Allowing
      // callers to inject an arbitrary status would make pending/rejected
      // records readable through a public route.
      const feedbacks = await feedbackService.getFeedbackByClass(classSectionId, {
        status: 'approved',
      });

      return res.json({
        success: true,
        data: feedbacks,
        total: feedbacks.length,
      });
    } catch (error) {
      console.error('Error fetching class feedback:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  /**
   * GET /api/feedbacks/class/:classSectionId/stats
   *
   * The mobile screen shows a compact summary card before the student reads or
   * submits comments. This endpoint provides that aggregated snapshot.
   */
  async getClassFeedbackStats(req, res) {
    try {
      const { classSectionId } = req.params;

      const stats = await feedbackService.getClassFeedbackStats(classSectionId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  /**
   * GET /api/feedbacks/my-feedbacks
   *
   * "My feedback" is keyed by the authenticated user id, not by the student
   * document id. The service translates that into the stored feedback owner.
   */
  async getMyFeedback(req, res) {
    try {
      const userId = req.auth?.sub || req.auth?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const feedbacks = await feedbackService.getStudentFeedback(userId);

      return res.json({
        success: true,
        data: feedbacks,
      });
    } catch (error) {
      console.error('Error fetching student feedback:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async approveFeedback(req, res) {
    try {
      const { feedbackId } = req.params;

      const feedback = await feedbackService.approveFeedback(feedbackId);

      return res.json({
        success: true,
        message: 'Feedback approved',
        data: feedback,
      });
    } catch (error) {
      console.error('Error approving feedback:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async rejectFeedback(req, res) {
    try {
      const { feedbackId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required',
        });
      }

      const feedback = await feedbackService.rejectFeedback(feedbackId, reason);

      return res.json({
        success: true,
        message: 'Feedback rejected',
        data: feedback,
      });
    } catch (error) {
      console.error('Error rejecting feedback:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  /**
   * PUT /api/feedbacks/:id
   *
   * Only the student who created the feedback can update it. The service keeps
   * the ownership guard and editable-field whitelist, but no longer blocks
   * updates behind a global template time window.
   */
  async updateFeedback(req, res) {
    try {
      const userId = req.auth?.sub || req.auth?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { id: feedbackId } = req.params;
      const { rating, comment, criteria } = req.body;

      if (rating !== undefined && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5',
        });
      }

      const feedback = await feedbackService.updateFeedback(feedbackId, userId, {
        rating,
        comment,
        criteria,
      });

      return res.json({
        success: true,
        message: 'Feedback updated successfully',
        data: feedback,
      });
    } catch (error) {
      console.error('Error updating feedback:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes('permission') || error.message.includes('window') || error.message.includes('expired')) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  /**
   * DELETE /api/feedbacks/:id
   *
   * One controller method intentionally covers both moderation and student self-
   * service:
   * - admin/staff can delete any feedback immediately
   * - student can delete only their own feedback while the edit window is open
   *
   * This also fixes the previous bug where the controller declared two methods
   * with the same name, causing the moderation branch to be overwritten.
   */
  async deleteFeedback(req, res) {
    try {
      const userId = req.auth?.sub || req.auth?.id;
      const role = req.auth?.role;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { id: feedbackId } = req.params;
      let deletedFeedback = null;

      if (role === 'admin' || role === 'staff') {
        deletedFeedback = await feedbackService.deleteFeedback(feedbackId);
      } else if (role === 'student') {
        deletedFeedback = await feedbackService.deleteStudentFeedback(feedbackId, userId);
      } else {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete feedback',
        });
      }

      return res.json({
        success: true,
        message: 'Feedback deleted successfully',
        data: deletedFeedback,
      });
    } catch (error) {
      console.error('Error deleting feedback:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes('permission') || error.message.includes('window') || error.message.includes('expired')) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  /**
   * GET /api/feedbacks/:id/window
   *
   * The mobile app uses this to decide whether the current user may edit the
   * selected feedback record.
   */
  async getFeedbackWindowInfo(req, res) {
    try {
      const { id: feedbackId } = req.params;
      const userId = req.auth?.sub || req.auth?.id;
      const role = req.auth?.role;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const windowInfo = await feedbackService.getFeedbackWindowInfo(
        feedbackId,
        userId,
        role,
      );

      return res.json({
        success: true,
        data: windowInfo,
      });
    } catch (error) {
      console.error('Error getting feedback window info:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async getPendingFeedback(req, res) {
    try {
      const { limit = 20, skip = 0 } = req.query;

      const result = await feedbackService.getPendingFeedback(
        parseInt(limit, 10),
        parseInt(skip, 10),
      );

      return res.json({
        success: true,
        data: result.data,
        total: result.total,
        limit: result.limit,
        skip: result.skip,
      });
    } catch (error) {
      console.error('Error fetching pending feedback:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
}

module.exports = new FeedbackController();
