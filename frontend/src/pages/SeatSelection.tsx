import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';

interface Showtime {
  _id: string;
  movieId: {
    _id: string;
    title: string;
    posterUrl: string;
    duration: number;
  };
  roomId: {
    _id: string;
    name: string;
    theater: string;
  };
  startTime: string;
  endTime: string;
  basePrice: number;
  seats: Record<string, string>;
}

const SeatSelection: React.FC = () => {
  const [searchParams] = useSearchParams();
  const showtimeId = searchParams.get('showtime');
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đặt vé');
      navigate('/login');
      return;
    }
    if (showtimeId) {
      fetchShowtime();
    } else {
      toast.error('Không tìm thấy suất chiếu');
      navigate('/movies');
    }
  }, [showtimeId]);

  const fetchShowtime = async () => {
    try {
      const response = await api.get(`/showtimes/${showtimeId}`);
      setShowtime(response.data);
    } catch (error) {
      toast.error('Không thể tải thông tin suất chiếu');
      navigate('/movies');
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = (seat: string) => {
    if (showtime?.seats[seat] !== 'available') return;
    
    setSelectedSeats(prev => 
      prev.includes(seat) 
        ? prev.filter(s => s !== seat)
        : [...prev, seat]
    );
  };

  const getSeatStatus = (seat: string) => {
    if (selectedSeats.includes(seat)) return 'selected';
    if (showtime?.seats[seat] === 'booked') return 'booked';
    if (showtime?.seats[seat] === 'pending') return 'pending';
    return 'available';
  };

  const getSeatClass = (seat: string) => {
    const status = getSeatStatus(seat);
    switch (status) {
      case 'selected':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'booked':
        return 'bg-red-500 text-white cursor-not-allowed opacity-50';
      case 'pending':
        return 'bg-yellow-500 text-white cursor-not-allowed opacity-50';
      default:
        return 'bg-gray-200 hover:bg-blue-200 cursor-pointer';
    }
  };

const handleBooking = async () => {
  if (selectedSeats.length === 0) {
    toast.error('Vui lòng chọn ghế');
    return;
  }

  setSubmitting(true);
  try {
    const bookingData = {
      showtimeId: showtimeId,
      seats: selectedSeats,
    };
    
    console.log('Sending booking data:', bookingData); // Debug log
    
    const response = await api.post('/bookings', bookingData);

    console.log('Booking response:', response.data); // Debug log
    const booking = response.data;
    toast.success('Đã tạo đơn đặt vé!');
    
    // Chuyển đến trang checkout với booking ID
    navigate(`/checkout?booking=${booking._id}`);
  } catch (error: any) {
    console.error('Booking error:', error);
    console.error('Error response:', error.response?.data); // Debug log chi tiết
    toast.error(error.response?.data?.message || 'Đặt vé thất bại');
  } finally {
    setSubmitting(false);
  }
};

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (!showtime) {
    return null;
  }

  const totalAmount = selectedSeats.length * showtime.basePrice;
  
  // Lấy danh sách các hàng ghế từ seat keys
  const seatKeys = Object.keys(showtime.seats);
  
  // Lấy các hàng ghế duy nhất và sắp xếp
  const rows = [...new Set(seatKeys.map(seat => seat.charAt(0)))].sort();
  
  // Lấy số ghế tối đa trong mỗi hàng
  const maxCol = Math.max(...seatKeys.map(seat => parseInt(seat.substring(1))), 0);

  return (
    <div>
      {/* Movie Info */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h1 className="text-xl font-bold">{showtime.movieId.title}</h1>
        <div className="text-gray-600 mt-2">
          <p>{showtime.roomId.theater} - {showtime.roomId.name}</p>
          <p>{new Date(showtime.startTime).toLocaleString('vi-VN')}</p>
          <p>Giá vé: {showtime.basePrice.toLocaleString()}đ</p>
        </div>
      </div>

      {/* Screen */}
      <div className="mb-8">
        <div className="bg-gray-300 h-4 w-full rounded-t-lg"></div>
        <div className="text-center text-gray-500 text-sm mt-2">MÀN HÌNH</div>
      </div>

      {/* Seats */}
      <div className="flex justify-center mb-8 overflow-x-auto">
        <div className="inline-block">
          {rows.map(row => (
            <div key={row} className="flex mb-2">
              <div className="w-8 text-center font-bold">{row}</div>
              {Array.from({ length: maxCol }, (_, i) => i + 1).map(col => {
                const seatNumber = `${row}${col}`;
                // Kiểm tra ghế có tồn tại không
                if (!showtime.seats[seatNumber]) return null;
                return (
                  <button
                    key={seatNumber}
                    onClick={() => toggleSeat(seatNumber)}
                    disabled={showtime.seats[seatNumber] !== 'available'}
                    className={`w-8 h-8 m-1 rounded text-xs font-medium transition ${getSeatClass(seatNumber)}`}
                  >
                    {col}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mb-8 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
          <span className="text-sm">Ghế trống</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded"></div>
          <span className="text-sm">Đang chọn</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-500 rounded"></div>
          <span className="text-sm">Đã đặt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-yellow-500 rounded"></div>
          <span className="text-sm">Đang giữ</span>
        </div>
      </div>

      {/* Booking Summary */}
      <div className="card bg-gray-50 sticky bottom-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-gray-600">Ghế đã chọn:</p>
            <p className="font-bold text-lg">
              {selectedSeats.length === 0 ? 'Chưa có' : selectedSeats.join(', ')}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Tổng tiền:</p>
            <p className="text-2xl font-bold text-blue-600">
              {totalAmount.toLocaleString()}đ
            </p>
          </div>
          <button
            onClick={handleBooking}
            disabled={selectedSeats.length === 0 || submitting}
            className="btn-primary px-8 py-3 disabled:opacity-50"
          >
            {submitting ? 'Đang xử lý...' : 'Tiến hành đặt vé'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;