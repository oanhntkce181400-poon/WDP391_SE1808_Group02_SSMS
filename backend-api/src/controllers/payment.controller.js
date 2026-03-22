const payosService = require('../services/payos.service');
const PaymentOrder = require('../models/paymentOrder.model');
const Payment = require('../models/payment.model');
const Student = require('../models/student.model');

// [POST] /api/payment/create - Tạo link thanh toán
exports.createPaymentLink = async (req, res) => {
  try {
    const { description, productName, price, returnUrl, cancelUrl } = req.body;
    
    // Lấy thông tin sinh viên từ token (dùng sub thay vì _id)
    const studentId = req.auth.sub;
    
    // Gọi PayOS API để tạo link thanh toán
    const payosResponse = await payosService.createPaymentLink({
      description,
      productName,
      price,
      returnUrl,
      cancelUrl,
    });
    
    if (payosResponse.code === '00') {
      // Lưu thông tin đơn hàng vào database
      const paymentOrder = new PaymentOrder({
        orderCode: parseInt(payosResponse.data.orderCode),
        studentId: studentId,
        semesterCode: description.split('-')[1] || '', // Lấy semesterCode từ description
        amount: price,
        description: description,
        productName: productName,
        status: 'PENDING',
        checkoutUrl: payosResponse.data.checkoutUrl,
        qrCode: payosResponse.data.qrCode,
        accountName: payosResponse.data.accountName,
        accountNumber: payosResponse.data.accountNumber,
        bin: payosResponse.data.bin,
      });
      
      await paymentOrder.save();
      
      return res.status(200).json({
        error: 0,
        message: 'Tạo link thanh toán thành công',
        data: payosResponse.data,
      });
    } else {
      return res.status(400).json({
        error: -1,
        message: payosResponse.desc || 'Có lỗi xảy ra',
        data: null,
      });
    }
  } catch (error) {
    console.error('Error creating payment link:', error);
    return res.status(500).json({
      error: -1,
      message: 'Có lỗi xảy ra',
    });
  }
};

// [GET] /api/payment/order/:orderCode - Lấy thông tin đơn hàng
exports.getOrder = async (req, res) => {
  try {
    const { orderCode } = req.params;
    
    // Luôn gọi PayOS API để lấy trạng thái mới nhất
    const payosResponse = await payosService.getOrder(orderCode);
    
    if (payosResponse.code === '00') {
      const payosData = payosResponse.data;
      
      // Cập nhật database nếu có thay đổi
      let paymentOrder = await PaymentOrder.findOne({ orderCode: parseInt(orderCode) });
      
      if (paymentOrder && paymentOrder.status !== payosData.status) {
        paymentOrder.status = payosData.status;
        if (payosData.status === 'PAID') {
          paymentOrder.paidAt = new Date();
        }
        await paymentOrder.save();
      }
      
      return res.status(200).json({
        error: 0,
        message: 'Lấy thông tin đơn hàng thành công',
        data: payosData,
      });
    } else {
      // Nếu PayOS lỗi, thử lấy từ database
      let paymentOrder = await PaymentOrder.findOne({ orderCode: parseInt(orderCode) });
      
      if (paymentOrder) {
        return res.status(200).json({
          error: 0,
          message: 'Lấy thông tin đơn hàng thành công',
          data: paymentOrder,
        });
      }
      
      return res.status(404).json({
        error: -1,
        message: 'Không tìm thấy đơn hàng',
      });
    }
  } catch (error) {
    console.error('Error getting order:', error);
    return res.status(500).json({
      error: -1,
      message: 'Có lỗi xảy ra',
    });
  }
};

// [POST] /api/payment/order/:orderCode/cancel - Hủy đơn hàng
exports.cancelOrder = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const { reason } = req.body;
    
    // Gọi PayOS API để hủy đơn hàng
    const payosResponse = await payosService.cancelOrder(orderCode, reason || 'Hủy bởi người dùng');
    
    if (payosResponse.code === '00') {
      // Cập nhật trạng thái trong database
      await PaymentOrder.findOneAndUpdate(
        { orderCode: parseInt(orderCode) },
        { status: 'CANCELLED' }
      );
      
      return res.status(200).json({
        error: 0,
        message: 'Hủy đơn hàng thành công',
        data: payosResponse.data,
      });
    } else {
      return res.status(400).json({
        error: -1,
        message: payosResponse.desc || 'Có lỗi xảy ra',
        data: null,
      });
    }
  } catch (error) {
    console.error('Error canceling order:', error);
    return res.status(500).json({
      error: -1,
      message: 'Có lỗi xảy ra',
    });
  }
};

// [POST] /api/payment/webhook - Webhook từ PayOS
// Cải thiện: Thêm xử lý auto-enrollment, chống duplicate, logging chi tiết
exports.webhook = async (req, res) => {
  const webhookData = req.body;
  const orderCode = webhookData.orderCode;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📥 PayOS Webhook nhận được:', {
    orderCode,
    amount: webhookData.amount,
    code: webhookData.code,
    desc: webhookData.desc,
    transactionDateTime: webhookData.transactionDateTime,
  });
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Bước 1: Xác thực webhook signature
    const isValidSignature = payosService.verifyWebhookSignature(
      webhookData.signature,
      webhookData
    );

    if (!isValidSignature) {
      console.error(`❌ Webhook rejected: Invalid signature for orderCode ${orderCode}`);
      return res.status(400).json({
        error: -1,
        message: 'Invalid signature',
      });
    }
    console.log(`✅ Webhook signature verified for orderCode ${orderCode}`);

    // Bước 2: Tìm PaymentOrder
    const paymentOrder = await PaymentOrder.findOne({ orderCode: parseInt(orderCode) });

    if (!paymentOrder) {
      console.error(`❌ Webhook: PaymentOrder not found for orderCode ${orderCode}`);
      return res.status(404).json({
        error: -1,
        message: 'Payment order not found',
      });
    }

    // Bước 3: Kiểm tra trạng thái hiện tại - tránh xử lý trùng lặp
    if (paymentOrder.status === 'PAID') {
      console.log(`⚠️ Webhook: Order ${orderCode} đã được xử lý trước đó, bỏ qua`);
      return res.status(200).json({
        error: 0,
        message: 'Payment already processed',
        data: { orderCode, status: 'PAID' },
      });
    }

    // Bước 4: Xử lý thanh toán thành công
    if (webhookData.code === '00') {
      console.log(`💰 Processing PAID webhook for orderCode ${orderCode}`);

      // Cập nhật PaymentOrder
      paymentOrder.status = 'PAID';
      paymentOrder.paidAt = new Date(webhookData.transactionDateTime || Date.now());
      await paymentOrder.save();

      // Kiểm tra duplicate Payment (bảo mật)
      const existingPayment = await Payment.findOne({ orderCode: String(orderCode) });
      if (existingPayment) {
        console.log(`⚠️ Payment đã tồn tại cho orderCode ${orderCode}, bỏ qua tạo mới`);
      } else {
        // Tạo Payment record
        const payment = new Payment({
          student: paymentOrder.studentId,
          semesterCode: paymentOrder.semesterCode,
          amount: webhookData.amount,
          paidAt: paymentOrder.paidAt,
          note: `PayOS - OrderCode: ${orderCode} - ${paymentOrder.description}`,
          method: 'online',
          status: 'completed',
          orderCode: String(orderCode),
        });
        await payment.save();
        console.log(`✅ Payment created for orderCode ${orderCode}, amount: ${webhookData.amount}`);

        // Bước 5: Auto-enrollment sau thanh toán thành công
        try {
          const autoEnrollment = require('../services/autoEnrollment.service');
          const paymentValidation = require('../services/paymentValidation.service');

          const paymentStatus = await paymentValidation.checkSemesterPaymentRequirement(
            paymentOrder.studentId
          );

          if (paymentStatus.mustPay && !paymentStatus.hasPaid) {
            console.log(`📚 Bắt đầu auto-enrollment cho student ${paymentOrder.studentId}`);
            const enrollmentResult = await autoEnrollment.autoEnrollAfterPayment(
              paymentOrder.studentId,
              paymentStatus.currentCurriculumSemester
            );
            console.log(`✅ Auto-enrollment completed:`, enrollmentResult);
          } else {
            console.log(`ℹ️ Auto-enrollment skipped: hasPaid = ${paymentStatus.hasPaid}`);
          }
        } catch (enrollmentError) {
          // Ghi log lỗi nhưng không block webhook response
          console.error(`❌ Auto-enrollment error for orderCode ${orderCode}:`, enrollmentError.message);
        }
      }
    } else {
      // Xử lý thanh toán thất bại
      console.log(`❌ Processing FAILED webhook for orderCode ${orderCode}, code: ${webhookData.code}`);
      paymentOrder.status = 'FAILED';
      await paymentOrder.save();
    }

    console.log(`✅ Webhook processed successfully for orderCode ${orderCode}`);
    return res.status(200).json({
      error: 0,
      message: 'Webhook received and processed',
      data: {
        orderCode,
        status: webhookData.code === '00' ? 'PAID' : 'FAILED',
        amount: webhookData.amount,
      },
    });

  } catch (error) {
    console.error(`❌ Webhook error for orderCode ${orderCode}:`, error);
    return res.status(500).json({
      error: -1,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// [GET] /api/payment/transactions/me - Lấy lịch sử giao dịch của sinh viên
exports.getMyTransactions = async (req, res) => {
  try {
    const studentId = req.auth._id;
    
    const transactions = await Payment.find({ student: studentId })
      .sort({ paidAt: -1 })
      .populate('student', 'studentId user');
    
    return res.status(200).json({
      error: 0,
      message: 'Lấy lịch sử giao dịch thành công',
      data: transactions,
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    return res.status(500).json({
      error: -1,
      message: 'Có lỗi xảy ra',
    });
  }
};

// [GET] /api/payment/transactions - Lấy tất cả giao dịch (admin)
exports.getAllTransactions = async (req, res) => {
  try {
    const { semesterCode, studentId, startDate, endDate } = req.query;
    
    let query = {};
    
    if (semesterCode) {
      query.semesterCode = semesterCode;
    }
    if (studentId) {
      query.student = studentId;
    }
    if (startDate || endDate) {
      query.paidAt = {};
      if (startDate) {
        query.paidAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.paidAt.$lte = new Date(endDate);
      }
    }
    
    const transactions = await Payment.find(query)
      .sort({ paidAt: -1 })
      .populate('student', 'studentId user')
      .populate('student.user', 'fullname email');
    
    return res.status(200).json({
      error: 0,
      message: 'Lấy lịch sử giao dịch thành công',
      data: transactions,
    });
  } catch (error) {
    console.error('Error getting all transactions:', error);
    return res.status(500).json({
      error: -1,
      message: 'Có lỗi xảy ra',
    });
  }
};

// [GET] /api/payment/banks - Lấy danh sách ngân hàng (proxy để tránh CORS)
exports.getBanks = async (req, res) => {
  try {
    const axios = require('axios');
    const response = await axios.get('https://api.vietqr.io/v2/banks');
    return res.status(200).json({
      error: 0,
      message: 'Lấy danh sách ngân hàng thành công',
      data: response.data.data,
    });
  } catch (error) {
    console.error('Error getting banks:', error);
    return res.status(500).json({
      error: -1,
      message: 'Có lỗi xảy ra khi lấy danh sách ngân hàng',
    });
  }
};