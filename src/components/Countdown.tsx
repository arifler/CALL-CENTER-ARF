import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function Countdown() {
  const [daysLeft, setDaysLeft] = useState<number>(0);

  useEffect(() => {
    const calculateDays = () => {
      const targetDate = new Date('2026-05-27T00:00:00');
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
      setDaysLeft(days > 0 ? days : 0);
    };

    calculateDays();
    const timer = setInterval(calculateDays, 1000 * 60 * 60); // Update every hour
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-2 px-4 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-center space-x-3">
        <Clock className="w-4 h-4 animate-pulse" />
        <p className="text-sm md:text-base font-bold tracking-wide">
          KURBAN BAYRAMINA <span className="bg-white text-blue-700 px-2 py-0.5 rounded-lg mx-1">{daysLeft}</span> GÜN KALDI
        </p>
      </div>
    </div>
  );
}
