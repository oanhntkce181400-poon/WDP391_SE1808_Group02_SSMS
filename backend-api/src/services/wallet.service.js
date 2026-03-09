// wallet.service.js
// Service xử lý ví sinh viên: nạp tiền, thanh toán, lịch sử giao dịch
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');
const payosService = require('./payos.service');
const mongoose = require('mongoose');

/**
 * Lấy hoặc tạo ví cho user
 */
async function getOrCreateWallet(userId) {
  let wallet = await Wallet.findOne({ userId }).lean();
  if (!wallet) {
    wallet = await Wallet.create({
      userId,
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      status: 'active',
    });
  }
  return wallet;
}

/**
 * Lấy số dư ví
 */
async function getBalance(userId) {
  const wallet = await getOrCreateWallet(userId);
  return wallet.balance;
}

/**
 * Lấy thông tin đầy đủ của ví
 */
async function getWalletInfo(userId) {
  const wallet = await getOrCreateWallet(userId);
  return {
    balance: wallet.balance,
    totalEarned: wallet.totalEarned,
    totalSpent: wallet.totalSpent,
    currency: wallet.currency,
    status: wallet.status,
    lastTransactionAt: wallet.lastTransactionAt,
  };
}

/**
 * Nạp tiền vào ví
 */
async function deposit(userId, { amount, description = '', orderCode = null, paymentMethod = 'bank_transfer' }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) {
      throw new Error('Không tìm thấy ví');
    }
    if (wallet.status !== 'active') {
      throw new Error('Ví không hoạt động');
    }

    const balanceBefore = wallet.balance;
    wallet.balance += amount;
    wallet.totalEarned += amount;
    wallet.lastTransactionAt = new Date();
    await wallet.save({ session });

    // Ghi transaction
    const transaction = await WalletTransaction.create([{
      wallet: wallet._id,
      type: 'deposit',
      amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description,
      orderCode,
      paymentMethod,
      status: 'completed',
    }], { session });

    await session.commitTransaction();
    return {
      success: true,
      balance: wallet.balance,
      transaction: transaction[0],
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Trừ tiền từ ví (thanh toán học phí)
 */
async function withdraw(userId, { amount, description = '', paymentId = null, orderCode = null }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) {
      throw new Error('Không tìm thấy ví');
    }
    if (wallet.status !== 'active') {
      throw new Error('Ví không hoạt động');
    }
    if (wallet.balance < amount) {
      throw new Error('Số dư không đủ');
    }

    const balanceBefore = wallet.balance;
    wallet.balance -= amount;
    wallet.totalSpent += amount;
    wallet.lastTransactionAt = new Date();
    await wallet.save({ session });

    // Ghi transaction
    const transaction = await WalletTransaction.create([{
      wallet: wallet._id,
      type: 'payment',
      amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description,
      paymentId,
      orderCode,
      paymentMethod: 'wallet',
      status: 'completed',
    }], { session });

    await session.commitTransaction();
    return {
      success: true,
      balance: wallet.balance,
      transaction: transaction[0],
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Hoàn tiền vào ví
 */
async function refund(userId, { amount, description = '', paymentId = null, orderCode = null, semesterCode = null }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet) {
      throw new Error('Không tìm thấy ví');
    }

    const balanceBefore = wallet.balance;
    wallet.balance += amount;
    wallet.totalEarned += amount;
    wallet.lastTransactionAt = new Date();
    await wallet.save({ session });

    const transaction = await WalletTransaction.create([{
      wallet: wallet._id,
      type: 'refund',
      amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description,
      paymentId,
      orderCode,
      paymentMethod: 'wallet',
      status: 'completed',
      ...(semesterCode ? { semesterCode } : {}),
    }], { session });

    await session.commitTransaction();
    return {
      success: true,
      balance: wallet.balance,
      transaction: transaction[0],
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Chuyển tiền thừa học phí (nộp dư so với tổng học phí kỳ) vào ví
 */
async function refundTuitionExcess(userId) {
  const financeService = require('./finance.service');
  const excessInfo = await financeService.getTuitionExcess(userId);
  const { excess, semesterCode, curriculumSemesterName } = excessInfo;

  if (!excess || excess <= 0) {
    return { success: false, message: 'Không có tiền thừa học phí để chuyển vào ví', amount: 0 };
  }

  const wallet = await getOrCreateWallet(userId);
  const existingRefunds = await WalletTransaction.find({
    wallet: wallet._id,
    type: 'refund',
    semesterCode: semesterCode || '',
  }).lean();
  const alreadyRefunded = existingRefunds.reduce((sum, t) => sum + (t.amount || 0), 0);
  const refundable = Math.min(excess, Math.max(0, excess - alreadyRefunded));

  if (refundable <= 0) {
    return {
      success: true,
      message: 'Đã chuyển tiền thừa vào ví trước đó',
      amount: 0,
      balance: wallet.balance,
    };
  }

  const result = await refund(userId, {
    amount: refundable,
    description: `Hoàn tiền thừa học phí - ${curriculumSemesterName}`,
    semesterCode: semesterCode || undefined,
  });

  return {
    success: true,
    message: `Đã chuyển ${refundable.toLocaleString('vi-VN')} ₫ tiền thừa học phí vào ví`,
    amount: refundable,
    balance: result.balance,
    transaction: result.transaction,
  };
}

/**
 * Lấy lịch sử giao dịch của ví
 */
async function getTransactions(userId, { limit = 20, skip = 0, type = null } = {}) {
  const wallet = await Wallet.findOne({ userId }).lean();
  if (!wallet) {
    return [];
  }

  const query = { wallet: wallet._id };
  if (type) {
    query.type = type;
  }

  const transactions = await WalletTransaction.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await WalletTransaction.countDocuments(query);

  return {
    transactions,
    total,
    limit,
    skip,
    hasMore: skip + transactions.length < total,
  };
}

/**
 * Tạo link thanh toán PayOS để nạp tiền vào ví
 */
async function createDepositPaymentLink(userId, amount) {
  if (amount <= 0) {
    throw new Error('Số tiền phải lớn hơn 0');
  }
  if (amount < 10000) {
    throw new Error('Số tiền nạp tối thiểu là 10.000 VNĐ');
  }

  const wallet = await getOrCreateWallet(userId);
  
  // Lấy thông tin user trực tiếp từ User model
  const User = require('../models/user.model');
  const user = await User.findById(userId).lean();
  
  const description = `Nap tien vao vi - ${wallet._id.toString().slice(-6)}`;
  const productName = 'Nạp tiền vào ví';
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const payosPayload = {
    price: amount,
    description,
    productName,
    returnUrl: `${baseUrl}/student/wallet/result`,
    cancelUrl: `${baseUrl}/student/wallet`,
    buyerName: user?.fullName || 'Sinh viên',
    buyerEmail: user?.email,
  };

  const payosResult = await payosService.createPaymentLink(payosPayload);
  const payosData = payosResult?.data ?? payosResult;

  return {
    success: true,
    checkoutUrl: payosData?.checkoutUrl,
    orderCode: payosData?.orderCode ?? payosResult?.orderCode,
    amount: amount,
    description,
    qrCode: payosData?.qrCode,
    accountNumber: payosData?.accountNumber,
    accountName: payosData?.accountName,
    bin: payosData?.bin,
  };
}

/**
 * Xác nhận nạp tiền (gọi từ webhook, sau khi kiểm tra PayOS, hoặc khi user bấm "Tôi đã chuyển khoản")
 */
async function confirmDeposit(userId, orderCode, amount) {
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error('Số tiền không hợp lệ');
  }
  const code = orderCode != null ? String(orderCode).trim() : '';
  if (!code) {
    throw new Error('Mã đơn không hợp lệ');
  }

  // Kiểm tra đã xử lý chưa (idempotent)
  const existing = await WalletTransaction.findOne({ orderCode: code, type: 'deposit' }).lean();
  if (existing) {
    return { success: true, message: 'Đã xử lý trước đó', transaction: existing };
  }

  // Nạp tiền
  return await deposit(userId, {
    amount: Math.round(numAmount),
    description: 'Nạp tiền qua PayOS',
    orderCode: code,
    paymentMethod: 'payos',
  });
}

module.exports = {
  getOrCreateWallet,
  getBalance,
  getWalletInfo,
  deposit,
  withdraw,
  refund,
  getTransactions,
  createDepositPaymentLink,
  confirmDeposit,
  refundTuitionExcess,
};
