import { useState, useEffect } from 'react';
import payosService from '../../services/payosService';

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    setIsLoading(true);
    try {
      const res = await payosService.getMyTransactions();
      if (res.data && res.data.data) {
        setTransactions(res.data.data);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Lịch sử giao dịch</h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem lịch sử thanh toán học phí của bạn
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl bg-white py-12 text-center shadow-sm">
            <p className="text-4xl">📋</p>
            <p className="mt-3 text-slate-500">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((txn) => (
              <div key={txn._id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{txn.note || 'Thanh toán học phí'}</p>
                    <p className="text-sm text-slate-500">{formatDate(txn.paidAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatMoney(txn.amount)}</p>
                    <p className="text-xs text-slate-400">
                      {txn.method === 'online' ? 'Online' : txn.method === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
