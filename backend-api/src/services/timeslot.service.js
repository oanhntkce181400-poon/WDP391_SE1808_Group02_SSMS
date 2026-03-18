const Timeslot = require('../models/timeslot.model');
const ClassSection = require('../models/classSection.model');

class TimeslotService {
  async getTimeslots({ page = 1, limit = 10, keyword = '' }) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;

    const query = {};
    if (keyword) {
      query.$or = [
        { groupName: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      Timeslot.find(query)
        .sort({ startPeriod: 1, startTime: 1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Timeslot.countDocuments(query),
    ]);

    return {
      data,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getTimeslot(id) {
    const timeslot = await Timeslot.findById(id).lean();
    if (!timeslot) {
      const err = new Error('Timeslot not found');
      err.statusCode = 404;
      throw err;
    }
    return timeslot;
  }

  async createTimeslot(data) {
    this.validateTimeslotInput(data, false);
    const normalized = this.normalizePayload(data);

    await this.ensureUniqueTimeRange(normalized.startTime, normalized.endTime);
    await this.ensureNoTimeOverlap(normalized.startTime, normalized.endTime);

    const created = await Timeslot.create(normalized);
    return created.toObject();
  }

  async updateTimeslot(id, data) {
    const current = await Timeslot.findById(id);
    if (!current) {
      const err = new Error('Timeslot not found');
      err.statusCode = 404;
      throw err;
    }

    this.validateTimeslotInput(data, true);

    const merged = {
      groupName: data.groupName ?? current.groupName,
      description: data.description ?? current.description,
      startTime: data.startTime ?? current.startTime,
      endTime: data.endTime ?? current.endTime,
      startPeriod: data.startPeriod ?? current.startPeriod,
      endPeriod: data.endPeriod ?? current.endPeriod,
      status: data.status ?? current.status,
    };

    const normalized = this.normalizePayload(merged);

    await this.ensureUniqueTimeRange(normalized.startTime, normalized.endTime, id);
    await this.ensureNoTimeOverlap(normalized.startTime, normalized.endTime, id);

    const periodChanged =
      Number(current.startPeriod) !== Number(normalized.startPeriod) ||
      Number(current.endPeriod) !== Number(normalized.endPeriod);

    if (periodChanged) {
      const usedCount = await this.countTimeslotDependencies(id);
      if (usedCount > 0) {
        const err = new Error('Timeslot đang được sử dụng trong lớp học phần, không thể đổi tiết bắt đầu/kết thúc');
        err.statusCode = 409;
        throw err;
      }
    }

    current.groupName = normalized.groupName;
    current.description = normalized.description;
    current.startTime = normalized.startTime;
    current.endTime = normalized.endTime;
    current.startPeriod = normalized.startPeriod;
    current.endPeriod = normalized.endPeriod;
    current.status = normalized.status;

    await current.save();
    return current.toObject();
  }

  async deleteTimeslot(id) {
    const timeslot = await Timeslot.findById(id);
    if (!timeslot) {
      const err = new Error('Timeslot not found');
      err.statusCode = 404;
      throw err;
    }

    const usedCount = await this.countTimeslotDependencies(id);
    if (usedCount > 0) {
      const err = new Error('Timeslot đang được sử dụng bởi lớp học phần, không thể xóa');
      err.statusCode = 409;
      throw err;
    }

    await timeslot.deleteOne();
    return { message: 'Timeslot deleted successfully' };
  }

  async countTimeslotDependencies(timeslotId) {
    return ClassSection.countDocuments({
      timeslot: timeslotId,
      status: { $in: ['draft', 'scheduled', 'published', 'locked'] },
    });
  }

  validateTimeslotInput(data, isPartial = false) {
    const requiredFields = ['groupName', 'startTime', 'endTime', 'startPeriod', 'endPeriod'];
    if (!isPartial) {
      for (const field of requiredFields) {
        if (data[field] == null || data[field] === '') {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    }

    if (data.startTime != null && !this.isValidTimeFormat(data.startTime)) {
      throw new Error('Invalid start time format. Use HH:MM format');
    }
    if (data.endTime != null && !this.isValidTimeFormat(data.endTime)) {
      throw new Error('Invalid end time format. Use HH:MM format');
    }

    const startTime = data.startTime;
    const endTime = data.endTime;
    if (startTime && endTime && !this.isEndTimeAfterStartTime(startTime, endTime)) {
      throw new Error('End time must be after start time');
    }

    if (data.startPeriod != null && data.endPeriod != null) {
      const startPeriod = Number(data.startPeriod);
      const endPeriod = Number(data.endPeriod);
      if (!Number.isInteger(startPeriod) || !Number.isInteger(endPeriod)) {
        throw new Error('startPeriod and endPeriod must be integer');
      }
      if (startPeriod < 1 || endPeriod < 1 || startPeriod > 10 || endPeriod > 10) {
        throw new Error('startPeriod and endPeriod must be between 1 and 10');
      }
      if (endPeriod < startPeriod) {
        throw new Error('endPeriod must be greater than or equal to startPeriod');
      }
    }
  }

  normalizePayload(data) {
    return {
      groupName: String(data.groupName || '').trim(),
      description: String(data.description || '').trim(),
      startTime: String(data.startTime || '').trim(),
      endTime: String(data.endTime || '').trim(),
      startPeriod: Number(data.startPeriod),
      endPeriod: Number(data.endPeriod),
      status: data.status || 'active',
    };
  }

  async ensureUniqueTimeRange(startTime, endTime, excludeId = null) {
    const query = {
      startTime,
      endTime,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    };

    const existing = await Timeslot.findOne(query).lean();
    if (existing) {
      const err = new Error('Time slot with same start and end time already exists');
      err.statusCode = 409;
      throw err;
    }
  }

  async ensureNoTimeOverlap(startTime, endTime, excludeId = null) {
    const all = await Timeslot.find(excludeId ? { _id: { $ne: excludeId } } : {})
      .select('groupName startTime endTime')
      .lean();

    const newStart = this.toMinutes(startTime);
    const newEnd = this.toMinutes(endTime);

    const conflict = all.find((slot) => {
      const existStart = this.toMinutes(slot.startTime);
      const existEnd = this.toMinutes(slot.endTime);
      return newStart < existEnd && newEnd > existStart;
    });

    if (conflict) {
      const err = new Error(
        `Time slot overlaps with existing slot: ${conflict.groupName} (${conflict.startTime}-${conflict.endTime})`,
      );
      err.statusCode = 409;
      throw err;
    }
  }

  isValidTimeFormat(time) {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  }

  toMinutes(time) {
    const [h, m] = String(time).split(':').map(Number);
    return h * 60 + m;
  }

  isEndTimeAfterStartTime(startTime, endTime) {
    return this.toMinutes(endTime) > this.toMinutes(startTime);
  }
}

module.exports = new TimeslotService();
