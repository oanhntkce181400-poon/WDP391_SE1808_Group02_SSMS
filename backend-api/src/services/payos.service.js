const axios = require('axios');

// PayOS API configuration
const PAYOS_CONFIG = {
  // Sandbox API (sử dụng cho môi trường dev)
  // BASE_URL: 'https://api-sandbox.payos.vn',
  // Production API
  BASE_URL: 'https://api-merchant.payos.vn',
  // Client ID và API Key từ PayOS Dashboard
  CLIENT_ID: process.env.PAYC_CLIENT_ID || process.env.PAYOS_CLIENT_ID || '',
  API_KEY: process.env.PAYC_API_KEY || process.env.PAYOS_API_KEY || '',
  CHECKSUM_KEY: process.env.PAYC_CHECKSUM_KEY || process.env.PAYOS_CHECKSUM_KEY || '',
};

class PayOSService {
  constructor() {
    this.clientId = PAYOS_CONFIG.CLIENT_ID;
    this.apiKey = PAYOS_CONFIG.API_KEY;
    this.checksumKey = PAYOS_CONFIG.CHECKSUM_KEY;
    this.baseUrl = PAYOS_CONFIG.BASE_URL;
  }

  // Tạo link thanh toán
  async createPaymentLink(data) {
    const { description, productName, price, amount, returnUrl, cancelUrl } = data;
    const amountValue = price ?? amount;

    // Tạo orderCode unique
    const orderCode = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);

    // PayOS yêu cầu description tối đa 25 ký tự
    const shortDescription = (description || '').length > 25 ? (description || '').substring(0, 25) : (description || '');

    // Build request body
    const requestBody = {
      orderCode: parseInt(orderCode),
      amount: amountValue,
      description: shortDescription,
      buyerAddress: '',
      buyerEmail: '',
      buyerName: '',
      buyerPhone: '',
      cancelUrl: cancelUrl,
      returnUrl: returnUrl,
      items: [
        {
          name: productName || shortDescription,
          quantity: 1,
          price: amountValue,
        },
      ],
    };

    // Tạo chữ ký
    const signature = this.createSignature(requestBody);
    requestBody.signature = signature;

    console.log('🔍 PayOS Request:', JSON.stringify(requestBody, null, 2));

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/payment-requests`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CLIENT-ID': this.clientId,
            'X-API-KEY': this.apiKey,
          },
          timeout: 30000, // 30 seconds timeout
        }
      );
      console.log('✅ PayOS Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error('❌ PayOS API Error: Request timeout');
      } else if (error.code === 'ENOTFOUND') {
        console.error('❌ PayOS API Error: DNS lookup failed -', error.message);
      } else if (error.code === 'ECONNREFUSED') {
        console.error('❌ PayOS API Error: Connection refused');
      } else {
        console.error('❌ PayOS API Error:', error.response?.data || error.message);
      }
      console.error('❌ PayOS Error Details:', {
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      throw error;
    }
  }

  // Lấy thông tin đơn hàng
  async getOrder(orderCode) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v2/payment-requests/${orderCode}`,
        {
          headers: {
            'X-CLIENT-ID': this.clientId,
            'X-API-KEY': this.apiKey,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('PayOS API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Hủy đơn hàng
  async cancelOrder(orderCode, reason = '') {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/payment-requests/${orderCode}/cancel`,
        { reason },
        {
          headers: {
            'X-CLIENT-ID': this.clientId,
            'X-API-KEY': this.apiKey,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('PayOS API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Tạo chữ ký (HMAC SHA256) - Theo format của PayOS
  createSignature(data) {
    const crypto = require('crypto');
    
    // Format: key=value&key=value (phải có key trước giá trị)
    const dataString = [
      `amount=${data.amount}`,
      `cancelUrl=${data.cancelUrl}`,
      `description=${data.description}`,
      `orderCode=${data.orderCode}`,
      `returnUrl=${data.returnUrl}`,
    ].join('&');
    
    console.log('🔐 Signature Data String:', dataString);
    
    const signature = crypto
      .createHmac('sha256', this.checksumKey)
      .update(dataString)
      .digest('hex');
    
    console.log('🔐 Generated Signature:', signature);
    console.log('🔐 Checksum Key:', this.checksumKey);
    
    return signature;
  }

  // Xác thực webhook signature
  verifyWebhookSignature(signature, data) {
    const crypto = require('crypto');
    const dataString = [
      data.orderCode,
      data.amount,
      data.description,
    ]
      .map((value) => String(value))
      .join('&');
    const expectedSignature = crypto
      .createHmac('sha256', this.checksumKey)
      .update(dataString)
      .digest('hex');
    return signature === expectedSignature;
  }
}

module.exports = new PayOSService();
