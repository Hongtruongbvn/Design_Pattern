import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';

interface Booking {
  _id: string;
  bookingCode: string;
  showtimeId: {
    _id: string;
    startTime: string;
    endTime: string;
    theater: string;
    room: string;
    movieId: {
      title: string;
      posterUrl: string;
    };
    basePrice: number;
  };
  seats: string[];
  totalAmount: number;
  status: string;
}

const Checkout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentQR, setPaymentQR] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    console.log('Booking ID from URL:', bookingId); // Debug log
    
    if (bookingId) {
      fetchBooking();
    } else {
      toast.error('Không tìm thấy thông tin đặt vé');
      navigate('/movies');
    }
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      console.log('Fetching booking:', bookingId); // Debug log
      const response = await api.get(`/bookings/${bookingId}`);
      console.log('Booking data:', response.data); // Debug log
      setBooking(response.data);
    } catch (error: any) {
      console.error('Fetch booking error:', error); // Debug log
      toast.error(error.response?.data?.message || 'Không thể tải thông tin đặt vé');
      navigate('/movies');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentQR = async () => {
    try {
      const response = await api.get(`/bookings/${bookingId}/qr`);
      setPaymentQR(response.data.qrCode);
      setShowQR(true);
    } catch (error) {
      toast.error('Không thể tạo mã QR thanh toán');
    }
  };

  const handlePayment = async () => {
    if (paymentMethod === 'banking' && !showQR) {
      await fetchPaymentQR();
      return;
    }

    setProcessing(true);
    try {
      const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      await api.post(`/bookings/${bookingId}/confirm`, {
        paymentId: paymentId,
        paymentMethod: paymentMethod,
      });
      
      toast.success('Thanh toán thành công!');
      navigate(`/payment-success?booking=${bookingId}`);
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Thanh toán thất bại');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Đang tải thông tin đặt vé...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy thông tin đặt vé</p>
        <Link to="/movies" className="btn-primary inline-block mt-4">
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>

      <div className="grid gap-6">
        {/* Booking Summary */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Thông tin đặt vé</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Mã đặt vé:</span>
              <span className="font-mono">{booking.bookingCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phim:</span>
              <span className="font-semibold">{booking.showtimeId?.movieId?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Suất chiếu:</span>
              <span>
                {booking.showtimeId && new Date(booking.showtimeId.startTime).toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rạp:</span>
              <span>{booking.showtimeId?.theater} - {booking.showtimeId?.room}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ghế:</span>
              <span className="font-semibold">{booking.seats.join(', ')}</span>
            </div>
            <div className="flex justify-between pt-3 border-t">
              <span className="text-lg font-bold">Tổng tiền:</span>
              <span className="text-2xl font-bold text-blue-600">
                {booking.totalAmount.toLocaleString()}đ
              </span>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Thông tin khách hàng</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Họ tên:</span>
              <span>{user?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Số điện thoại:</span>
              <span>{user?.phoneNumber}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Phương thức thanh toán</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setShowQR(false);
                }}
                className="w-4 h-4 text-blue-600"
              />
              <div className="flex-1">
                <span className="font-semibold">💵 Thanh toán khi nhận vé</span>
                <p className="text-sm text-gray-500">Thanh toán trực tiếp tại rạp khi nhận vé</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="paymentMethod"
                value="banking"
                checked={paymentMethod === 'banking'}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setShowQR(false);
                }}
                className="w-4 h-4 text-blue-600"
              />
              <div className="flex-1">
                <span className="font-semibold">🏦 Chuyển khoản ngân hàng</span>
                <p className="text-sm text-gray-500">Thanh toán qua chuyển khoản ngân hàng</p>
              </div>
            </label>
          </div>

          {/* QR Code for Banking */}
          {paymentMethod === 'banking' && showQR && paymentQR && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm font-medium mb-2">Quét mã QR để thanh toán:</p>
              <img src={paymentQR} alt="QR Code" className="mx-auto w-48 h-48" />
              <p className="text-xs text-gray-500 mt-2">
                Số tiền: <strong>{booking.totalAmount.toLocaleString()}đ</strong>
              </p>
              <p className="text-xs text-gray-500">
                Nội dung: Thanh toan ve xem phim - Ma ve: {booking.bookingCode}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 btn-secondary"
          >
            Quay lại
          </button>
          <button
            onClick={handlePayment}
            disabled={processing}
            className="flex-1 btn-primary disabled:opacity-50"
          >
            {processing ? 'Đang xử lý...' : paymentMethod === 'banking' && !showQR ? 'Tạo mã QR' : 'Xác nhận thanh toán'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;