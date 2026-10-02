import { useState, useCallback, useEffect } from 'react';

/**
 * useMicrophone
 * Manages microphone permission, access, and cleanup.
 *
 * Returns:
 *   stream     — MediaStream | null (null until permission granted)
 *   requestMic — async () => { success: boolean, errorType?: string }
 *   release    — () => void  (stops all tracks, clears stream)
 *
 * Error types:
 *   'unsupported' — browser lacks getUserMedia
 *   'denied'      — user blocked permission
 *   'unavailable' — no mic device found / hardware error
 *   'connection'  — unknown / fallback
 */
export function useMicrophone() {
  const [stream, setStream] = useState(null);

  const requestMic = useCallback(async () => {
    // 1. Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { success: false, errorType: 'unsupported' };
    }

    // 2. Request microphone access
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      setStream(mediaStream);
      return { success: true };
    } catch (err) {
      // Map browser error names to user-friendly types
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        return { success: false, errorType: 'denied' };
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        return { success: false, errorType: 'unavailable' };
      }
      if (
        err.name === 'NotReadableError' ||
        err.name === 'TrackStartError' ||
        err.name === 'AbortError'
      ) {
        return { success: false, errorType: 'unavailable' };
      }
      // Unknown error
      return { success: false, errorType: 'connection' };
    }
  }, []);

  const release = useCallback(() => {
    setStream((current) => {
      if (current) {
        current.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
  }, []);

  // Cleanup on unmount (page close, refresh, etc.)
  useEffect(() => {
    return () => {
      setStream((current) => {
        if (current) {
          current.getTracks().forEach((track) => track.stop());
        }
        return null;
      });
    };
  }, []);

  return { stream, requestMic, release };
}