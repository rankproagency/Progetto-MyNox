import { useState, useEffect } from 'react';

interface CountdownResult {
  label: string;
  isExpired: boolean;
}

export function useCountdown(rawDate: string, startTime: string): CountdownResult {
  function calculate(): CountdownResult {
    const [year, month, day] = rawDate.split('-').map(Number);
    const [hours, minutes] = startTime.split(':').map(Number);
    const target = new Date(year, month - 1, day, hours, minutes, 0).getTime();
    const diff = target - Date.now();

    if (diff <= 0) return { label: 'In corso', isExpired: true };

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hrs = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (days > 0) return { label: `${days}g ${hrs}h ${mins}m`, isExpired: false };
    if (hrs > 0) return { label: `${hrs}h ${mins}m ${secs}s`, isExpired: false };
    return { label: `${mins}m ${secs}s`, isExpired: false };
  }

  const [result, setResult] = useState<CountdownResult>(calculate);

  useEffect(() => {
    const interval = setInterval(() => setResult(calculate()), 1000);
    return () => clearInterval(interval);
  }, [rawDate, startTime]);

  return result;
}
