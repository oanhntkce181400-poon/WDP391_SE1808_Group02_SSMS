const performanceReportService = require('../services/performanceReport.service');

exports.getOverview = async (req, res) => {
  try {
    const { majorCode, cohort, semesterCode } = req.query;
    const overview = await performanceReportService.getOverview({ majorCode, cohort, semesterCode });
    res.json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGPADistribution = async (req, res) => {
  try {
    const { majorCode, cohort } = req.query;
    const distribution = await performanceReportService.getGPADistribution({ majorCode, cohort });
    res.json({ success: true, data: distribution });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGPABySemester = async (req, res) => {
  try {
    const { majorCode, cohort } = req.query;
    const trend = await performanceReportService.getGPABySemester({ majorCode, cohort });
    res.json({ success: true, data: trend });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopStudents = async (req, res) => {
  try {
    const { majorCode, cohort, semester, limit } = req.query;
    const students = await performanceReportService.getTopStudents(
      { majorCode, cohort, semester },
      limit || 10
    );
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAtRiskStudents = async (req, res) => {
  try {
    const { majorCode, cohort, limit } = req.query;
    const students = await performanceReportService.getAtRiskStudents(
      { majorCode, cohort },
      limit || 20
    );
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
