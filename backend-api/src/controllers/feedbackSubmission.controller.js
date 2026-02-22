const FeedbackSubmission = require('../models/feedbackSubmission.model');
const FeedbackTemplate = require('../models/feedbackTemplate.model');

class FeedbackSubmissionController {
  /**
   * POST /api/feedback-submissions
   * Sinh viên gửi đánh giá
   */
  async submitFeedback(req, res) {
    try {
      const {
        feedbackTemplateId,
        evaluatedEntityId,
        evaluationType,
        responses
      } = req.body;

      // Validation
      if (!feedbackTemplateId || !evaluatedEntityId || !evaluationType || !responses) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Check if template exists and active
      const template = await FeedbackTemplate.findById(feedbackTemplateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Feedback template not found'
        });
      }

      const now = new Date();
      if (template.feedbackPeriod.startDate > now || template.feedbackPeriod.endDate < now) {
        return res.status(400).json({
          success: false,
          message: 'Feedback period is not open'
        });
      }

      // Check duplicate submission
      const existing = await FeedbackSubmission.findOne({
        feedbackTemplate: feedbackTemplateId,
        submittedBy: req.auth.sub
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'You already submitted feedback for this template'
        });
      }

      // Create submission
      const submission = new FeedbackSubmission({
        feedbackTemplate: feedbackTemplateId,
        submittedBy: req.auth.sub,
        evaluatedEntity: evaluatedEntityId,
        evaluationType,
        responses,
        status: 'submitted',
        submissionIp: req.ip,
        submissionUserAgent: req.get('User-Agent')
      });

      await submission.save();
      await submission.populate('feedbackTemplate');

      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        data: submission
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * GET /api/feedback-submissions/:templateId/statistics
   * Lấy thống kê đánh giá
   */
  async getStatistics(req, res) {
    try {
      const { templateId } = req.params;

      const template = await FeedbackTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Feedback template not found'
        });
      }

      // Get all submissions
      const submissions = await FeedbackSubmission.find({
        feedbackTemplate: templateId,
        status: 'submitted'
      }).populate('feedbackTemplate');

      if (submissions.length === 0) {
        return res.json({
          success: true,
          data: {
            totalSubmissions: 0,
            statistics: [],
            averageScore: 0,
            categoryBreakdown: {}
          }
        });
      }

      // Calculate statistics
      const statistics = this.calculateStatistics(template, submissions);

      res.json({
        success: true,
        data: {
          totalSubmissions: submissions.length,
          statistics,
          averageScore: statistics.overallAverage,
          categoryBreakdown: this.getCategoryBreakdown(template, submissions)
        }
      });
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Tính toán thống kê từ các đánh giá
   */
  calculateStatistics(template, submissions) {
    const statistics = [];
    let totalScore = 0;
    let ratingCount = 0;

    // Duyệt qua từng câu hỏi trong template
    for (const question of template.questions) {
      const questionStats = {
        questionId: question._id,
        questionText: question.questionText,
        questionType: question.questionType,
        responses: []
      };

      if (question.questionType === 'rating') {
        // Tính trung bình cho rating questions
        let sum = 0;
        let count = 0;

        for (const submission of submissions) {
          const response = submission.responses.find(r => r.questionId.toString() === question._id.toString());
          if (response && response.answer) {
            sum += parseInt(response.answer);
            count++;
            ratingCount++;
          }
        }

        const average = count > 0 ? (sum / count).toFixed(2) : 0;
        totalScore += parseFloat(average);

        questionStats.average = parseFloat(average);
        questionStats.totalResponses = count;

        // Phân loại theo sao
        const ratingDistribution = this.getRatingDistribution(submissions, question._id);
        questionStats.distribution = ratingDistribution;
      } else if (question.questionType === 'text') {
        // Với text, chỉ lưu số lượng response
        const responses = submissions
          .map(s => s.responses.find(r => r.questionId.toString() === question._id.toString()))
          .filter(r => r && r.answer)
          .map(r => r.answer);

        questionStats.responses = responses;
        questionStats.totalResponses = responses.length;
      } else if (question.questionType === 'multipleChoice') {
        // Đếm lựa chọn cho multiple choice
        const choiceCount = {};
        for (const question_option of question.options) {
          choiceCount[question_option.value] = 0;
        }

        for (const submission of submissions) {
          const response = submission.responses.find(r => r.questionId.toString() === question._id.toString());
          if (response && response.answer) {
            choiceCount[response.answer] = (choiceCount[response.answer] || 0) + 1;
          }
        }

        questionStats.distribution = choiceCount;
      }

      statistics.push(questionStats);
    }

    return {
      questions: statistics,
      overallAverage: ratingCount > 0 ? (totalScore / Math.max(ratingCount, 1)).toFixed(2) : 0
    };
  }

  /**
   * Lấy phân bố rating cho câu hỏi
   */
  getRatingDistribution(submissions, questionId) {
    const distribution = {};

    for (const submission of submissions) {
      const response = submission.responses.find(r => r.questionId.toString() === questionId.toString());
      if (response && response.answer) {
        const rating = response.answer;
        distribution[rating] = (distribution[rating] || 0) + 1;
      }
    }

    return distribution;
  }

  /**
   * Lấy phân loại theo tiêu chí
   */
  getCategoryBreakdown(template, submissions) {
    const breakdown = {};

    // Phân loại: Rất tốt (4.5-5), Tốt (3.5-4.5), Trung bình (2.5-3.5), Cần cải thiện (<2.5)
    const categories = {
      'Rất tốt': { min: 4.5, max: 5 },
      'Tốt': { min: 3.5, max: 4.5 },
      'Trung bình': { min: 2.5, max: 3.5 },
      'Cần cải thiện': { min: 0, max: 2.5 }
    };

    // Tính GPA cho từng submission
    const scores = [];
    for (const submission of submissions) {
      let sum = 0;
      let count = 0;

      for (const response of submission.responses) {
        if (response.questionType === 'rating' && response.answer) {
          sum += parseInt(response.answer);
          count++;
        }
      }

      if (count > 0) {
        scores.push(sum / count);
      }
    }

    // Phân loại điểm số
    for (const [category, range] of Object.entries(categories)) {
      breakdown[category] = scores.filter(s => s >= range.min && s < range.max).length;
    }

    return breakdown;
  }

  /**
   * GET /api/feedback-submissions/teacher/:teacherId/summary
   * Lấy tóm tắt đánh giá cho một giáo viên
   */
  async getTeacherFeedbackSummary(req, res) {
    try {
      const { teacherId } = req.params;

      const submissions = await FeedbackSubmission.find({
        evaluatedEntity: teacherId,
        evaluationType: 'teacher',
        status: 'submitted'
      })
        .populate('feedbackTemplate')
        .populate('feedbackTemplate.questions');

      if (submissions.length === 0) {
        return res.json({
          success: true,
          data: {
            totalFeedback: 0,
            overallGPA: 0,
            categoryDistribution: {},
            questionBreakdown: []
          }
        });
      }

      // Tính GPA tổng thể
      let totalRatingSum = 0;
      let totalRatingCount = 0;
      const categoryCount = { 'Rất tốt': 0, 'Tốt': 0, 'Trung bình': 0, 'Cần cải thiện': 0 };

      for (const submission of submissions) {
        let submissionSum = 0;
        let submissionCount = 0;

        for (const response of submission.responses) {
          if (response.questionType === 'rating' && response.answer) {
            const rating = parseInt(response.answer);
            submissionSum += rating;
            submissionCount++;
            totalRatingSum += rating;
            totalRatingCount++;
          }
        }

        if (submissionCount > 0) {
          const avgScore = submissionSum / submissionCount;
          if (avgScore >= 4.5) categoryCount['Rất tốt']++;
          else if (avgScore >= 3.5) categoryCount['Tốt']++;
          else if (avgScore >= 2.5) categoryCount['Trung bình']++;
          else categoryCount['Cần cải thiện']++;
        }
      }

      const overallGPA = totalRatingCount > 0 ? (totalRatingSum / totalRatingCount).toFixed(2) : 0;

      res.json({
        success: true,
        data: {
          totalFeedback: submissions.length,
          overallGPA: parseFloat(overallGPA),
          categoryDistribution: categoryCount,
          submissionDates: submissions.map(s => ({
            date: s.createdAt,
            score: this.calculateSubmissionScore(s)
          }))
        }
      });
    } catch (error) {
      console.error('Error getting teacher feedback summary:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Tính điểm cho một submission
   */
  calculateSubmissionScore(submission) {
    let sum = 0;
    let count = 0;

    for (const response of submission.responses) {
      if (response.questionType === 'rating' && response.answer) {
        sum += parseInt(response.answer);
        count++;
      }
    }

    return count > 0 ? (sum / count).toFixed(2) : 0;
  }
}

module.exports = new FeedbackSubmissionController();
