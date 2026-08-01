import { useState, useEffect } from 'react';

/**
 * Custom hook to determine visibility of a component based on real-world or overridden IST time.
 * @param {Array<{start: string, end: string}>} windows - Array of start and end times in "HH:mm" format.
 * @param {object} overrideTime - Optional override object { isTesting: boolean, simulatedTime: string } ("HH:mm").
 * @returns {boolean} - True if the current time falls inside any window, false otherwise.
 */
export function useVisibleInWindow(windows, overrideTime = null) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const checkVisibility = () => {
      if (!windows || windows.length === 0) {
        setIsVisible(true);
        return;
      }

      let currentISTStr = '';

      if (overrideTime && overrideTime.isTesting) {
        currentISTStr = overrideTime.simulatedTime;
      } else {
        try {
          // Get current real-world IST time in Asia/Kolkata timezone
          const now = new Date();
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          });
          currentISTStr = formatter.format(now);
        } catch (e) {
          // Fallback if Intl is not supported or errors out (UTC + 5:30 offset calculation)
          const now = new Date();
          const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
          const ist = new Date(utc + (3600000 * 5.5));
          const h = String(ist.getHours()).padStart(2, '0');
          const m = String(ist.getMinutes()).padStart(2, '0');
          currentISTStr = `${h}:${m}`;
        }
      }

      // Convert "HH:mm" to minutes from midnight
      const timeToMinutes = (tStr) => {
        let [hStr, mStr] = tStr.split(':');
        let h = parseInt(hStr || '0', 10);
        let m = parseInt(mStr || '0', 10);
        if (h >= 24) h = h % 24;
        return h * 60 + m;
      };

      const currentMinutes = timeToMinutes(currentISTStr);

      const inWindow = windows.some(win => {
        const startMinutes = timeToMinutes(win.start);
        const endMinutes = timeToMinutes(win.end);

        if (startMinutes <= endMinutes) {
          // Standard window, e.g. 15:00 to 17:00
          return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        } else {
          // Spans midnight, e.g. 23:00 to 02:00
          return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }
      });

      setIsVisible(inWindow);
    };

    // Run check initially
    checkVisibility();

    // Re-check every minute
    const interval = setInterval(checkVisibility, 60000);

    return () => clearInterval(interval);
  }, [windows, overrideTime]);

  return isVisible;
}
export default useVisibleInWindow;
