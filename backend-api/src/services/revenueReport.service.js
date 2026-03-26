const Payment = require('../models/payment.model');
const TuitionBill = require('../models/tuitionBill.model');
const Student = require('../models/student.model');

class RevenueReportService {
  
  /**
   * Lấy tổng quan doanh thu
   */
  async getSummary(dateRange, filters = {}) {
    const { startDate, endDate } = dateRange;
    const { majorCode, semesterCode } = filters;

    const paymentMatch = {
      status: 'completed',
      paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    const [payments, allBills] = await Promise.all([
      Payment.find(paymentMatch),
      TuitionBill.find(semesterCode ? { semesterCode } : {})
    ]);

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = allBills.reduce((sum, bill) => 
      sum + (bill.totalAmount - bill.paidAmount), 0
    );
    const totalBilled = allBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

    return {
      totalCollected,
      totalOutstanding,
      totalBilled,
      collectionRate: collectionRate.toFixed(2),
      totalTransactions: payments.length
    };
  }

  /**
   * Doanh thu theo thời gian (xu hướng)
   */
  async getTrend(dateRange, groupBy = 'month') {
    const { startDate, endDate } = dateRange;

    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'quarter':
        dateFormat = '%Y-Q';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    const payments = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$paidAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return payments.map(p => ({
      period: p._id,
      revenue: p.revenue,
      count: p.count
    }));
  }

  /**
   * Doanh thu theo ngành
   */
  async getRevenueByMajor(dateRange) {
    const { startDate, endDate } = dateRange;

    const result = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      { $unwind: '$studentInfo' },
      {
        $group: {
          _id: '$studentInfo.majorCode',
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    return result.map(r => ({
      major: r._id || 'Unknown',
      revenue: r.revenue,
      count: r.count
    }));
  }

  /**
   * Doanh thu theo phương thức thanh toán
   */
  async getRevenueByPaymentMethod(dateRange) {
    const { startDate, endDate } = dateRange;

    const result = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: '$method',
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    const methodLabels = {
      'online': 'Thanh toán online',
      'bank_transfer': 'Chuyển khoản',
      'cash': 'Tiền mặt',
      'wallet': 'Ví điện tử'
    };

    return result.map(r => ({
      method: methodLabels[r._id] || r._id,
      revenue: r.revenue,
      count: r.count
    }));
  }

  /**
   * Phân bổ trạng thái thanh toán
   */
  async getStatusDistribution(dateRange) {
    const { semesterCode } = dateRange;

    const bills = await TuitionBill.find(semesterCode ? { semesterCode } : {});

    const distribution = {
      paid: 0,
      pending: 0,
      overdue: 0,
      partial: 0
    };

    bills.forEach(bill => {
      const outstanding = bill.totalAmount - bill.paidAmount;
      
      if (outstanding <= 0) {
        distribution.paid += bill.totalAmount;
      } else if (bill.status === 'overdue') {
        distribution.overdue += outstanding;
      } else {
        distribution.pending += outstanding;
      }
      
      if (bill.paidAmount > 0 && outstanding > 0) {
        distribution.partial += bill.paidAmount;
      }
    });

    return [
      { status: 'Đã thanh toán', amount: distribution.paid, color: '#22c55e' },
      { status: 'Chờ thanh toán', amount: distribution.pending, color: '#f59e0b' },
      { status: 'Quá hạn', amount: distribution.overdue, color: '#ef4444' },
      { status: 'Thanh toán một phần', amount: distribution.partial, color: '#6366f1' }
    ];
  }

  /**
   * Chi tiết giao dịch
   */
  async getTransactionDetails(dateRange, pagination = {}) {
    const { startDate, endDate } = dateRange;
    const { page = 1, limit = 20 } = pagination;

    const query = {
      status: 'completed',
      paidAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    const [transactions, total] = await Promise.all([
      Payment.find(query)
        .populate('student', 'studentCode fullName majorCode cohort')
        .sort({ paidAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Payment.countDocuments(query)
    ]);

    return {
      transactions: transactions.map(t => ({
        id: t._id,
        orderCode: t.orderCode,
        student: t.student,
        amount: t.amount,
        method: t.method,
        paidAt: t.paidAt,
        description: t.description
      })),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }
}

module.exports = new RevenueReportService();
