import { useState, useEffect, useRef } from 'react';

// Reads duration from Vite env vars.
// Dev (.env.development): 30s for fast testing.
// Prod (.env.production): 480s (8 minutes).
const DEFAULT_DURATION = Number(import.meta.env.VITE_SESSION_DURATION_SECONDS) || 480;
const DEFAULT_WARNING = Number(import.meta.env.VITE_SESSION_WARNING_SECONDS) || 5;

function Timer({
  durationSeconds = DEFAULT_DURATION,
  warningThresholdSeconds = DEFAULT_WARNING,
  onExpire,
  onWarning,
}) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [isWarning, setIsWarning] = useState(false);

  // Refs so we can call latest callbacks without re-running the timer effect.
  const onExpireRef = useRef(onExpire);
  const onWarningRef = useRef(onWarning);
  const warnedRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  // The countdown effect — runs once when Timer mounts.
  useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + durationSeconds * 1000;
    let intervalId;

    const tick = () => {
      const now = Date.now();
      const remainingMs = Math.max(0, endTime - now);
      const remainingSec = Math.ceil(remainingMs / 1000);
      setRemaining(remainingSec);

      // Fire the 15-second warning exactly once.
      if (
        !warnedRef.current &&
        remainingSec <= warningThresholdSeconds &&
        remainingSec > 0
      ) {
        warnedRef.current = true;
        setIsWarning(true);
        if (onWarningRef.current) onWarningRef.current();
      }

      // Fire expiry exactly once.
      if (remainingMs <= 0) {
        clearInterval(intervalId);
        if (onExpireRef.current) onExpireRef.current();
      }
    };

    tick(); // run immediately so we don't show full duration for 250ms
    intervalId = setInterval(tick, 250);

    return () => clearInterval(intervalId);
  }, [durationSeconds, warningThresholdSeconds]);

  // Format as MM:SS
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className={`timer ${isWarning ? 'timer--warning' : ''}`}>
      <span className="timer__display">{display}</span>
      {isWarning && (
  <span className="timer__warning-label">{warningThresholdSeconds} seconds remaining</span>
)}
    </div>
  );
}

export default Timer;