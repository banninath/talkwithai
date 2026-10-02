import { GoogleGenAI, Modality } from '@google/genai';

/**
 * GeminiLiveAdapter
 *
 * Wraps the @google/genai SDK behind a clean interface so the rest of
 * the app doesn't know about Gemini specifically. To switch to OpenAI
 * later, create an OpenAIRealtimeAdapter with the same methods.
 *
 * Phase 7: connect + disconnect only (no audio).
 * Phase 8: add sendAudio(), receive audio via onmessage callback.
 */
export class GeminiLiveAdapter {
  constructor() {
    this.ai = null;
    this.session = null;
    this.connected = false;

    // Callbacks (used in Phase 8)
    this.onAudioCallback = null;
    this.onInterruptionCallback = null;
    this.onErrorCallback = null;
    this.onCloseCallback = null;
  }

  /**
   * Connect to Gemini Live API using an ephemeral token.
   * @param {string} token - The ephemeral token from POST /api/session
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async connect(token) {
    try {
      // Create client with ephemeral token (NOT the permanent API key)
      this.ai = new GoogleGenAI({ apiKey: token });

      // Connect to Live API
      this.session = await this.ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
        },
        callbacks: {
          onmessage: (message) => {
            // Phase 8: parse audio chunks and interruption events
            console.log('[GeminiLiveAdapter] Message received');
          },
          onerror: (error) => {
            console.error('[GeminiLiveAdapter] Error:', error);
            this.connected = false;
            if (this.onErrorCallback) this.onErrorCallback(error);
          },
          onclose: () => {
            console.log('[GeminiLiveAdapter] Connection closed');
            this.connected = false;
            if (this.onCloseCallback) this.onCloseCallback();
          },
        },
      });

      this.connected = true;
      console.log('[GeminiLiveAdapter] Connected to Gemini Live API');
      return { success: true };
    } catch (error) {
      console.error('[GeminiLiveAdapter] Connection failed:', error.message);
      this.connected = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect from Gemini Live API.
   */
  async disconnect() {
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {
        console.error('[GeminiLiveAdapter] Disconnect error:', e.message);
      }
      this.session = null;
    }
    this.ai = null;
    this.connected = false;
    console.log('[GeminiLiveAdapter] Disconnected');
  }

  // ===== Phase 8 methods (stubs for now) =====

  sendAudio(base64AudioData) {
    if (this.session && this.connected) {
      this.session.sendRealtimeInput({ audio: { data: base64AudioData } });
    }
  }

  onAudio(cb) { this.onAudioCallback = cb; }
  onInterruption(cb) { this.onInterruptionCallback = cb; }
  onError(cb) { this.onErrorCallback = cb; }
  onClose(cb) { this.onCloseCallback = cb; }
}