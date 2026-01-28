const Timeslot = require('../models/timeslot.model');

class TimeslotService {
  // Get all timeslots with pagination
  async getTimeslots({ page = 1, limit = 10, keyword = '' }) {
    try {
      const skip = (page - 1) * limit;
      const query = {};

      if (keyword) {
        query.groupName = { $regex: keyword, $options: 'i' };
      }

      const [data, total] = await Promise.all([
        Timeslot.find(query)
          .sort({ startDate: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Timeslot.countDocuments(query),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

  // Get single timeslot by ID
  async getTimeslot(id) {
    try {
      const timeslot = await Timeslot.findById(id);
      if (!timeslot) {
        throw new Error('Timeslot not found');
      }
      return timeslot;
    } catch (error) {
      throw error;
    }
  }

  // Create new timeslot
  async createTimeslot(data) {
    try {
      // Validate time format
      if (!this.isValidTimeFormat(data.startTime)) {
        throw new Error('Invalid start time format. Use HH:MM format');
      }
      if (!this.isValidTimeFormat(data.endTime)) {
        throw new Error('Invalid end time format. Use HH:MM format');
      }

      // Validate end time after start time
      if (!this.isEndTimeAfterStartTime(data.startTime, data.endTime)) {
        throw new Error('End time must be after start time');
      }

      // Validate dates
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      if (endDate < startDate) {
        throw new Error('End date must be after start date');
      }

      // Check for time overlap with existing timeslots in the same group
      const overlap = await this.checkTimeOverlap(data.startTime, data.endTime, null, data.groupName);
      if (overlap) {
        throw new Error(`Time slot conflicts with existing slot in same group: ${overlap.groupName} (${overlap.startTime} - ${overlap.endTime})`);
      }

      const timeslot = new Timeslot(data);
      await timeslot.save();
      return timeslot;
    } catch (error) {
      throw error;
    }
  }

  // Update timeslot
  async updateTimeslot(id, data) {
    try {
      const timeslot = await Timeslot.findById(id);
      if (!timeslot) {
        throw new Error('Timeslot not found');
      }

      // Validate time if provided
      if (data.startTime && !this.isValidTimeFormat(data.startTime)) {
        throw new Error('Invalid start time format. Use HH:MM format');
      }
      if (data.endTime && !this.isValidTimeFormat(data.endTime)) {
        throw new Error('Invalid end time format. Use HH:MM format');
      }

      // Check end time after start time
      const startTime = data.startTime || timeslot.startTime;
      const endTime = data.endTime || timeslot.endTime;
      if (!this.isEndTimeAfterStartTime(startTime, endTime)) {
        throw new Error('End time must be after start time');
      }

      // Check for time overlap with existing timeslots in the same group (excluding current one)
      const groupName = data.groupName || timeslot.groupName;
      const overlap = await this.checkTimeOverlap(startTime, endTime, id, groupName);
      if (overlap) {
        throw new Error(`Time slot conflicts with existing slot in same group: ${overlap.groupName} (${overlap.startTime} - ${overlap.endTime})`);
      }

      // Validate dates if provided
      if (data.startDate || data.endDate) {
        const startDate = data.startDate ? new Date(data.startDate) : timeslot.startDate;
        const endDate = data.endDate ? new Date(data.endDate) : timeslot.endDate;
        if (endDate < startDate) {
          throw new Error('End date must be after start date');
        }
        if (data.startDate) timeslot.startDate = startDate;
        if (data.endDate) timeslot.endDate = endDate;
      }

      // Update fields
      if (data.groupName) timeslot.groupName = data.groupName;
      if (data.description !== undefined) timeslot.description = data.description;
      if (data.startTime) timeslot.startTime = data.startTime;
      if (data.endTime) timeslot.endTime = data.endTime;
      if (data.sessionsPerDay) timeslot.sessionsPerDay = data.sessionsPerDay;
      if (data.status) timeslot.status = data.status;

      await timeslot.save();
      return timeslot;
    } catch (error) {
      throw error;
    }
  }

  // Delete timeslot
  async deleteTimeslot(id) {
    try {
      const timeslot = await Timeslot.findById(id);
      if (!timeslot) {
        throw new Error('Timeslot not found');
      }

      await timeslot.deleteOne();
      return { message: 'Timeslot deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get timeslots by date range
  async getTimeslotsByDateRange(startDate, endDate) {
    try {
      const query = { status: 'active' };
      
      if (startDate || endDate) {
        query.startDate = {};
        if (startDate) query.startDate.$gte = new Date(startDate);
        if (endDate) query.startDate.$lte = new Date(endDate);
      }

      const timeslots = await Timeslot.find(query).sort({ startDate: 1 });
      return timeslots;
    } catch (error) {
      throw error;
    }
  }

  // Helper: Validate time format HH:MM
  isValidTimeFormat(time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  // Helper: Check if end time is after start time
  isEndTimeAfterStartTime(startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes;
  }

  // Helper: Check for time overlap with existing timeslots in the same group
  async checkTimeOverlap(startTime, endTime, excludeId = null, groupName = null) {
    try {
      const query = excludeId ? { _id: { $ne: excludeId } } : {};
      // Only check timeslots with same groupName to allow different groups to have overlapping times
      if (groupName) {
        query.groupName = groupName;
      }
      
      const existingTimeslots = await Timeslot.find(query).lean();

      const [newStartHour, newStartMin] = startTime.split(':').map(Number);
      const [newEndHour, newEndMin] = endTime.split(':').map(Number);
      const newStart = newStartHour * 60 + newStartMin;
      const newEnd = newEndHour * 60 + newEndMin;

      for (const slot of existingTimeslots) {
        const [existStartHour, existStartMin] = slot.startTime.split(':').map(Number);
        const [existEndHour, existEndMin] = slot.endTime.split(':').map(Number);
        const existStart = existStartHour * 60 + existStartMin;
        const existEnd = existEndHour * 60 + existEndMin;

        // Check for overlap: new slot overlaps if it starts before existing ends AND ends after existing starts
        if (newStart < existEnd && newEnd > existStart) {
          return slot;
        }
      }

      return null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new TimeslotService();
