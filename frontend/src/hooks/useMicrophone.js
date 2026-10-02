import { useState, useCallback, useEffect } from 'react';

export function useMicrophone() {
  const [stream, setStream] = useState(null);

  const requestMic = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { success: false, errorType: 'unsupported' };
    }

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
      // Return the stream directly so callers don't need to
      // read it from state (which causes re-render loops).
      return { success: true, stream: mediaStream };
    } catch (err) {
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