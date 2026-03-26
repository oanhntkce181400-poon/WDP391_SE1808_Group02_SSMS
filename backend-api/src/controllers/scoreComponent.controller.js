// scoreComponent.controller.js
// Controller quản lý thành phần điểm

const scoreComponentService = require('../services/scoreComponent.service');

class ScoreComponentController {
  /**
   * GET /api/score-components/:subjectId
   */
  async getScoreComponentBySubject(req, res) {
    try {
      const { subjectId } = req.params;

      const scoreComponent = await scoreComponentService.getScoreComponentBySubject(subjectId);

      if (!scoreComponent) {
        return res.status(404).json({
          success: false,
          message: 'Score component not found for this subject'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Score component retrieved successfully',
        data: scoreComponent
      });
    } catch (error) {
      console.error('[ScoreComponentController] Error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get score component'
      });
    }
  }

  /**
   * POST /api/score-components/:subjectId
   */
  async createOrUpdateScoreComponent(req, res) {
    try {
      const { subjectId } = req.params;
      const { components, note, calculationType } = req.body;

      if (!Array.isArray(components) || components.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'components array is required'
        });
      }

      const scoreComponent = await scoreComponentService.createOrUpdateScoreComponent(
        subjectId,
        components,
        { note, calculationType }
      );

      return res.status(201).json({
        success: true,
        message: 'Score component created/updated successfully',
        data: scoreComponent
      });
    } catch (error) {
      console.error('[ScoreComponentController] Error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create/update score component'
      });
    }
  }

  /**
   * GET /api/score-components
   */
  async getAllScoreComponents(req, res) {
    try {
      const { subjectId } = req.query;

      const scoreComponents = await scoreComponentService.getAllScoreComponents(
        subjectId ? { subjectId } : {}
      );

      return res.status(200).json({
        success: true,
        message: 'Score components retrieved successfully',
        data: scoreComponents
      });
    } catch (error) {
      console.error('[ScoreComponentController] Error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get score components'
      });
    }
  }

  /**
   * DELETE /api/score-components/:scoreComponentId
   */
  async deleteScoreComponent(req, res) {
    try {
      const { scoreComponentId } = req.params;

      const result = await scoreComponentService.deleteScoreComponent(scoreComponentId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Score component not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Score component deleted successfully'
      });
    } catch (error) {
      console.error('[ScoreComponentController] Error:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete score component'
      });
    }
  }
}

module.exports = new ScoreComponentController();
