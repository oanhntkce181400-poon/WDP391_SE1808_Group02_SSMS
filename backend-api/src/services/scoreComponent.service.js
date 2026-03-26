// scoreComponent.service.js
// Service quản lý thành phần điểm của môn học
// Cho phép định nghĩa các thành phần điểm và trọng số cho từng môn

const ScoreComponent = require('../models/scoreComponent.model');
const Subject = require('../models/subject.model');

class ScoreComponentService {
  /**
   * Lấy thành phần điểm của một môn học
   * @param {string} subjectId - ID của môn học
   * @returns {Promise<Object>} Thành phần điểm của môn
   */
  async getScoreComponentBySubject(subjectId) {
    try {
      if (!subjectId) {
        throw new Error('subjectId is required');
      }

      const scoreComponent = await ScoreComponent.findOne({
        subject: subjectId,
        isActive: true
      })
        .populate('subject', 'subjectCode subjectName credits')
        .lean();

      if (!scoreComponent) {
        return null;
      }

      return scoreComponent;
    } catch (error) {
      console.error('[ScoreComponentService] Error getting score component:', error);
      throw error;
    }
  }

  /**
   * Lấy thành phần điểm theo mã môn học
   * @param {string} subjectCode - Mã môn học (WDP301, etc.)
   * @returns {Promise<Object>} Thành phần điểm
   */
  async getScoreComponentByCode(subjectCode) {
    try {
      const subject = await Subject.findOne({ subjectCode }).select('_id');
      if (!subject) {
        throw new Error(`Subject with code ${subjectCode} not found`);
      }

      return await this.getScoreComponentBySubject(subject._id);
    } catch (error) {
      console.error('[ScoreComponentService] Error getting score component by code:', error);
      throw error;
    }
  }

  /**
   * Tạo hoặc cập nhật thành phần điểm
   * @param {string} subjectId - ID của môn học
   * @param {Array} components - Danh sách thành phần điểm
   * @param {Object} options - Tùy chọn thêm
   * @returns {Promise<Object>} Thành phần điểm đã lưu
   */
  async createOrUpdateScoreComponent(subjectId, components, options = {}) {
    try {
      if (!subjectId || !Array.isArray(components) || components.length === 0) {
        throw new Error('subjectId and components array are required');
      }

      // Validate subject exists
      const subject = await Subject.findById(subjectId);
      if (!subject) {
        throw new Error('Subject not found');
      }

      // Validate components
      let totalWeight = 0;
      const validatedComponents = components.map(comp => {
        if (!comp.code || !comp.name || comp.weight === undefined) {
          throw new Error('Each component must have code, name, and weight');
        }
        if (comp.weight < 0 || comp.weight > 1) {
          throw new Error('Weight must be between 0 and 1');
        }
        totalWeight += comp.weight;
        return {
          code: comp.code.toUpperCase().trim(),
          name: comp.name.trim(),
          weight: comp.weight,
          description: comp.description || '',
          minScore: comp.minScore || 0,
          maxScore: comp.maxScore || 10,
          numberOfAttempts: comp.numberOfAttempts || 1,
          isRequired: comp.isRequired !== false,
          order: comp.order || 0
        };
      });

      // Check total weight
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        console.warn(`[ScoreComponentService] Total weight is ${totalWeight}, should be 1.0`);
      }

      // Find existing and update, or create new
      let scoreComponent = await ScoreComponent.findOne({ subject: subjectId });

      if (scoreComponent) {
        scoreComponent.components = validatedComponents;
        scoreComponent.totalWeight = totalWeight;
        scoreComponent.calculationType = options.calculationType || 'WEIGHTED_AVG';
        scoreComponent.note = options.note || '';
        scoreComponent.isActive = true;
      } else {
        scoreComponent = new ScoreComponent({
          subject: subjectId,
          components: validatedComponents,
          totalWeight,
          calculationType: options.calculationType || 'WEIGHTED_AVG',
          note: options.note || '',
          isActive: true
        });
      }

      const saved = await scoreComponent.save();
      return await saved.populate('subject', 'subjectCode subjectName credits');
    } catch (error) {
      console.error('[ScoreComponentService] Error creating/updating score component:', error);
      throw error;
    }
  }

  /**
   * Tính điểm tổng dựa trên thành phần điểm
   * @param {Object} enrollmentScores - Điểm các thành phần (PT1, PT2, GK, CK, ...)
   * @param {Object} scoreComponent - Định nghĩa thành phần điểm
   * @returns {number} Điểm tổng kết (0-10)
   */
  calculateFinalScore(enrollmentScores, scoreComponent) {
    try {
      if (!enrollmentScores || !scoreComponent || !scoreComponent.components) {
        console.warn('[ScoreComponentService] Missing enrollmentScores or scoreComponent');
        return null;
      }

      const { components, calculationType } = scoreComponent;

      // Kiến tạo map để lookup scores theo code
      const scoresMap = {};
      if (Array.isArray(enrollmentScores.ptScores)) {
        enrollmentScores.ptScores.forEach(pt => {
          scoresMap[pt.type] = pt.score;
        });
      }
      scoresMap['GK'] = enrollmentScores.midtermScore;
      scoresMap['CK'] = enrollmentScores.finalScore;
      scoresMap['BT'] = enrollmentScores.assignmentScore;
      scoresMap['QT'] = enrollmentScores.continuousScore;

      if (calculationType === 'WEIGHTED_AVG') {
        // Tính trung bình có trọng số
        let totalScore = 0;
        let totalWeight = 0;

        components.forEach(comp => {
          const score = scoresMap[comp.code];
          if (score !== undefined && score !== null) {
            totalScore += score * comp.weight;
            totalWeight += comp.weight;
          }
        });

        if (totalWeight === 0) {
          return null;
        }

        const finalScore = parseFloat((totalScore / totalWeight).toFixed(2));
        return Math.min(10, Math.max(0, finalScore));
      } else if (calculationType === 'SUM') {
        // Cộng trực tiếp
        let total = 0;
        components.forEach(comp => {
          const score = scoresMap[comp.code];
          if (score !== undefined && score !== null) {
            total += score * comp.weight;
          }
        });
        return Math.min(10, Math.max(0, parseFloat(total.toFixed(2))));
      }

      return null;
    } catch (error) {
      console.error('[ScoreComponentService] Error calculating final score:', error);
      return null;
    }
  }

  /**
   * Lấy danh sách tất cả score components
   * @param {Object} filters - Bộ lọc
   * @returns {Promise<Array>}
   */
  async getAllScoreComponents(filters = {}) {
    try {
      const query = { isActive: true };

      if (filters.subjectId) {
        query.subject = filters.subjectId;
      }

      const components = await ScoreComponent.find(query)
        .populate('subject', 'subjectCode subjectName')
        .sort({ createdAt: -1 })
        .lean();

      return components;
    } catch (error) {
      console.error('[ScoreComponentService] Error getting all score components:', error);
      throw error;
    }
  }

  /**
   * Xóa score component
   * @param {string} scoreComponentId - ID của score component
   * @returns {Promise<Object>}
   */
  async deleteScoreComponent(scoreComponentId) {
    try {
      const result = await ScoreComponent.findByIdAndDelete(scoreComponentId);
      return result;
    } catch (error) {
      console.error('[ScoreComponentService] Error deleting score component:', error);
      throw error;
    }
  }

  /**
   * Validate scores có đủ các component bắt buộc không
   * @param {Object} enrollmentScores - Điểm của sinh viên
   * @param {Object} scoreComponent - Định nghĩa score component
   * @returns {Object} { isValid: boolean, missingComponents: [] }
   */
  validateRequiredComponents(enrollmentScores, scoreComponent) {
    try {
      if (!scoreComponent || !scoreComponent.components) {
        return { isValid: false, missingComponents: [] };
      }

      const scoresMap = {};
      if (Array.isArray(enrollmentScores.ptScores)) {
        enrollmentScores.ptScores.forEach(pt => {
          scoresMap[pt.type] = pt.score;
        });
      }
      scoresMap['GK'] = enrollmentScores.midtermScore;
      scoresMap['CK'] = enrollmentScores.finalScore;
      scoresMap['BT'] = enrollmentScores.assignmentScore;
      scoresMap['QT'] = enrollmentScores.continuousScore;

      const missingComponents = [];
      scoreComponent.components.forEach(comp => {
        if (comp.isRequired && (scoresMap[comp.code] === undefined || scoresMap[comp.code] === null)) {
          missingComponents.push(comp);
        }
      });

      return {
        isValid: missingComponents.length === 0,
        missingComponents
      };
    } catch (error) {
      console.error('[ScoreComponentService] Error validating required components:', error);
      return { isValid: false, missingComponents: [] };
    }
  }
}

module.exports = new ScoreComponentService();
