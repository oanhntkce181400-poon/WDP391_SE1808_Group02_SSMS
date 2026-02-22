const FeedbackSubmission = require('../models/feedbackSubmission.model');
const FeedbackTemplate = require('../models/feedbackTemplate.model');
const User = require('../models/user.model');

class FeedbackStatisticsService {
  /**
   * Tính điểm trung bình (GPA) cho giáo viên dựa trên đánh giá
   */
  async calculateTeacherGPA(teacherId, semesterId = null) {
    try {
      const query = {
        evaluatedEntity: teacherId,
        evaluationType: 'teacher',
        status: 'submitted'
      };

      const submissions = await FeedbackSubmission.find(query).populate('feedbackTemplate');

      if (submissions.length === 0) {
        return {
          teacherId,
          gpa: 0,
          totalFeedback: 0,
          categoryDistribution: {},
          trend: []
        };
      }

      return this.processTeacherStatistics(teacherId, submissions);
    } catch (error) {
      console.error('Error calculating teacher GPA:', error);
      throw error;
    }
  }

  /**
   * Xử lý thống kê của giáo viên
   */
  processTeacherStatistics(teacherId, submissions) {
    const categoryCount = { 'Rất tốt': 0, 'Tốt': 0, 'Trung bình': 0, 'Cần cải thiện': 0 };
    const ratings = [];
    let totalSum = 0;
    let totalCount = 0;

    for (const submission of submissions) {
      let submissionSum = 0;
      let submissionCount = 0;

      for (const response of submission.responses) {
        if (response.questionType === 'rating' && response.answer) {
          const rating = parseInt(response.answer);
          submissionSum += rating;
          submissionCount++;
          totalSum += rating;
          totalCount++;
        }
      }

      if (submissionCount > 0) {
        const avgScore = submissionSum / submissionCount;
        ratings.push(avgScore);

        // Phân loại
        if (avgScore >= 4.5) categoryCount['Rất tốt']++;
        else if (avgScore >= 3.5) categoryCount['Tốt']++;
        else if (avgScore >= 2.5) categoryCount['Trung bình']++;
        else categoryCount['Cần cải thiện']++;
      }
    }

    const gpa = totalCount > 0 ? (totalSum / totalCount).toFixed(2) : 0;
    const satisfactionPercentage = ratings.filter(r => r >= 4).length / ratings.length * 100;

    return {
      teacherId,
      gpa: parseFloat(gpa),
      satisfactionPercentage: satisfactionPercentage.toFixed(2),
      totalFeedback: submissions.length,
      categoryDistribution: categoryCount,
      ratingDistribution: this.getRatingDistribution(submissions),
      averageByTemplate: this.getAverageByTemplate(submissions),
      trend: ratings
    };
  }

  /**
   * Lấy phân bố rating (1 sao, 2 sao, ...)
   */
  getRatingDistribution(submissions) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const submission of submissions) {
      for (const response of submission.responses) {
        if (response.questionType === 'rating' && response.answer) {
          const rating = parseInt(response.answer);
          if (distribution.hasOwnProperty(rating)) {
            distribution[rating]++;
          }
        }
      }
    }

    return distribution;
  }

  /**
   * Lấy trung bình theo template
   */
  getAverageByTemplate(submissions) {
    const byTemplate = {};

    for (const submission of submissions) {
      const templateId = submission.feedbackTemplate._id.toString();

      if (!byTemplate[templateId]) {
        byTemplate[templateId] = {
          templateName: submission.feedbackTemplate.templateName,
          ratings: [],
          count: 0
        };
      }

      let sum = 0;
      let count = 0;

      for (const response of submission.responses) {
        if (response.questionType === 'rating' && response.answer) {
          const rating = parseInt(response.answer);
          sum += rating;
          count++;
        }
      }

      if (count > 0) {
        byTemplate[templateId].ratings.push(sum / count);
        byTemplate[templateId].count++;
      }
    }

    // Tính trung bình cho mỗi template
    const result = {};
    for (const [templateId, data] of Object.entries(byTemplate)) {
      const avg = data.ratings.length > 0 
        ? (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(2)
        : 0;
      result[templateId] = {
        templateName: data.templateName,
        average: parseFloat(avg),
        submissionCount: data.count
      };
    }

    return result;
  }

  /**
   * Tính thống kê cho một template cụ thể
   */
  async calculateTemplateStatistics(templateId) {
    try {
      const template = await FeedbackTemplate.findById(templateId).lean();

      if (!template) {
        throw new Error('Template not found');
      }

      const submissions = await FeedbackSubmission.find({
        feedbackTemplate: templateId,
        status: 'submitted'
      }).lean();

      if (submissions.length === 0) {
        return {
          templateId,
          templateName: template.templateName,
          totalSubmissions: 0,
          questionStatistics: {},
          overallAverage: 0
        };
      }

      const questionStats = {};
      let totalRating = 0;
      let totalRatingCount = 0;

      for (const question of template.questions) {
        const qStats = {
          questionId: question._id,
          questionText: question.questionText,
          questionType: question.questionType
        };

        if (question.questionType === 'rating') {
          const ratings = [];
          const distribution = {};

          for (const submission of submissions) {
            const response = submission.responses.find(
              r => r.questionId.toString() === question._id.toString()
            );

            if (response && response.answer) {
              const rating = parseInt(response.answer);
              ratings.push(rating);
              totalRating += rating;
              totalRatingCount++;

              distribution[rating] = (distribution[rating] || 0) + 1;
            }
          }

          qStats.average = ratings.length > 0 
            ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
            : 0;
          qStats.distribution = distribution;
          qStats.totalResponses = ratings.length;
        } else if (question.questionType === 'multipleChoice') {
          const distribution = {};

          for (const submission of submissions) {
            const response = submission.responses.find(
              r => r.questionId.toString() === question._id.toString()
            );

            if (response && response.answer) {
              distribution[response.answer] = (distribution[response.answer] || 0) + 1;
            }
          }

          qStats.distribution = distribution;
          qStats.totalResponses = Object.values(distribution).reduce((a, b) => a + b, 0);
        }

        questionStats[question._id] = qStats;
      }

      const overallAverage = totalRatingCount > 0 
        ? (totalRating / totalRatingCount).toFixed(2)
        : 0;

      return {
        templateId,
        templateName: template.templateName,
        totalSubmissions: submissions.length,
        questionStatistics: questionStats,
        overallAverage: parseFloat(overallAverage),
        submissionDates: submissions.map(s => s.createdAt || new Date()),
        evaluationTarget: template.evaluationTarget
      };
    } catch (error) {
      console.error('Error calculating template statistics:', error);
      throw error;
    }
  }

  /**
   * So sánh giáo viên (lấy GPA top N)
   */
  async getTeacherComparison(limit = 10) {
    try {
      // Lấy tất cả đánh giá theo giáo viên
      const submissions = await FeedbackSubmission.find({
        evaluationType: 'teacher',
        status: 'submitted'
      }).lean();

      const teacherMap = {};

      for (const submission of submissions) {
        const teacherId = submission.evaluatedEntity.toString();

        if (!teacherMap[teacherId]) {
          teacherMap[teacherId] = [];
        }

        let scoreSum = 0;
        let scoreCount = 0;

        for (const response of submission.responses) {
          if (response.questionType === 'rating' && response.answer) {
            scoreSum += parseInt(response.answer);
            scoreCount++;
          }
        }

        if (scoreCount > 0) {
          teacherMap[teacherId].push(scoreSum / scoreCount);
        }
      }

      // Tính GPA cho mỗi giáo viên
      const teacherStats = [];

      for (const [teacherId, scores] of Object.entries(teacherMap)) {
        const totalScore = scores.reduce((a, b) => a + b, 0);
        const gpa = (totalScore / scores.length).toFixed(2);

        teacherStats.push({
          teacherId,
          gpa: parseFloat(gpa),
          totalFeedback: scores.length,
          satisfactionCount: scores.filter(s => s >= 4).length
        });
      }

      // Sắp xếp theo GPA giảm dần
      teacherStats.sort((a, b) => b.gpa - a.gpa);

      return teacherStats.slice(0, limit);
    } catch (error) {
      console.error('Error getting teacher comparison:', error);
      throw error;
    }
  }

  /**
   * Lấy thống kê theo khoảng thời gian
   */
  async getStatisticsByDateRange(startDate, endDate) {
    try {
      const submissions = await FeedbackSubmission.find({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        status: 'submitted'
      })
        .populate('feedbackTemplate')
        .lean();

      if (submissions.length === 0) {
        return {
          totalSubmissions: 0,
          averageRating: 0,
          submissionsByDate: {}
        };
      }

      const submissionsByDate = {};
      let totalRating = 0;
      let totalRatingCount = 0;

      for (const submission of submissions) {
        const dateKey = new Date(submission.createdAt).toISOString().split('T')[0];

        if (!submissionsByDate[dateKey]) {
          submissionsByDate[dateKey] = [];
        }

        let scoreSum = 0;
        let scoreCount = 0;

        for (const response of submission.responses) {
          if (response.questionType === 'rating' && response.answer) {
            scoreSum += parseInt(response.answer);
            totalRating += parseInt(response.answer);
            scoreCount++;
            totalRatingCount++;
          }
        }

        if (scoreCount > 0) {
          submissionsByDate[dateKey].push(scoreSum / scoreCount);
        }
      }

      // Tính trung bình cho mỗi ngày
      const dailyAverages = {};
      for (const [date, scores] of Object.entries(submissionsByDate)) {
        dailyAverages[date] = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
      }

      return {
        totalSubmissions: submissions.length,
        averageRating: (totalRating / totalRatingCount).toFixed(2),
        submissionsByDate: dailyAverages,
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      console.error('Error getting statistics by date range:', error);
      throw error;
    }
  }

  /**
   * Phân tích câu hỏi cụ thể
   */
  async analyzeQuestion(templateId, questionId) {
    try {
      const submissions = await FeedbackSubmission.find({
        feedbackTemplate: templateId,
        status: 'submitted'
      }).lean();

      const template = await FeedbackTemplate.findById(templateId).lean();
      const question = template.questions.find(q => q._id.toString() === questionId);

      if (!question) {
        throw new Error('Question not found');
      }

      const responses = [];
      const distribution = {};

      for (const submission of submissions) {
        const response = submission.responses.find(
          r => r.questionId.toString() === questionId
        );

        if (response) {
          responses.push(response.answer);

          if (question.questionType === 'rating' || question.questionType === 'multipleChoice') {
            distribution[response.answer] = (distribution[response.answer] || 0) + 1;
          }
        }
      }

      const analysis = {
        questionId,
        questionText: question.questionText,
        questionType: question.questionType,
        totalResponses: responses.length,
        responseRate: ((responses.length / submissions.length) * 100).toFixed(2)
      };

      if (question.questionType === 'rating') {
        const ratings = responses.map(r => parseInt(r));
        analysis.average = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
        analysis.distribution = distribution;
      } else if (question.questionType === 'multipleChoice') {
        analysis.distribution = distribution;
      } else if (question.questionType === 'text') {
        analysis.textResponses = responses.slice(0, 10); // Top 10 responses
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing question:', error);
      throw error;
    }
  }
}

module.exports = new FeedbackStatisticsService();
