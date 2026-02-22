import React, { useEffect, useState } from 'react';

/**
 * Countdown Timer Component
 * Shows remaining time to edit feedback
 * Formats display based on time remaining (days, hours, minutes)
 */
const CountdownTimer = ({ remainingMs, onExpired }) => {
  const [displayTime, setDisplayTime] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!remainingMs || remainingMs <= 0) {
      setExpired(true);
      setDisplayTime('Hết hạn');
      if (onExpired) onExpired();
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = remainingMs - (Date.now() - now);

      if (remaining <= 0) {
        setExpired(true);
        setDisplayTime('Hết hạn');
        if (onExpired) onExpired();
        return;
      }

      // Calculate time units
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      // Format display
      if (days > 0) {
        setDisplayTime(`${days} ngày ${hours} giờ còn lại`);
      } else if (hours > 0) {
        setDisplayTime(`${hours} giờ ${minutes} phút còn lại`);
      } else if (minutes > 0) {
        setDisplayTime(`${minutes} phút ${seconds} giây còn lại`);
      } else {
        setDisplayTime(`${seconds} giây còn lại`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [remainingMs, onExpired]);

  if (expired) {
    return (
      <div className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
        ⏰ {displayTime}
      </div>
    );
  }

  return (
    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
      remainingMs < 24 * 60 * 60 * 1000 
        ? 'bg-orange-100 text-orange-700' 
        : 'bg-green-100 text-green-700'
    }`}>
      ⏱️ {displayTime}
    </div>
  );
};

export default CountdownTimer;
