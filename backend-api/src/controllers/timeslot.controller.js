const timeslotService = require('../services/timeslot.service');

// Get all timeslots with pagination
exports.getTimeslots = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword = '' } = req.query;
    const result = await timeslotService.getTimeslots({
      page: parseInt(page),
      limit: parseInt(limit),
      keyword,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single timeslot by ID
exports.getTimeslot = async (req, res) => {
  try {
    const timeslot = await timeslotService.getTimeslot(req.params.id);
    res.json({ data: timeslot });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// Create new timeslot
exports.createTimeslot = async (req, res) => {
  try {
    const timeslot = await timeslotService.createTimeslot(req.body);
    res.status(201).json({ message: 'Timeslot created successfully', data: timeslot });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update timeslot
exports.updateTimeslot = async (req, res) => {
  try {
    const timeslot = await timeslotService.updateTimeslot(req.params.id, req.body);
    res.json({ message: 'Timeslot updated successfully', data: timeslot });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete timeslot
exports.deleteTimeslot = async (req, res) => {
  try {
    await timeslotService.deleteTimeslot(req.params.id);
    res.json({ message: 'Timeslot deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
