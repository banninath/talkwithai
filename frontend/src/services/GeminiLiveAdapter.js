import { GoogleGenAI, Modality } from '@google/genai';

// ===== Audio conversion helpers =====

// Convert Float32 samples (browser audio) to Int16 PCM (Gemini format)
function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

// Convert Int16 ArrayBuffer to base64 string (for sending to Gemini)
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 string to Int16Array (for receiving from Gemini)
function base64ToInt16Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

// Convert Int16 to Float32 (for browser AudioBuffer playback)
function int16ToFloat32(int16Array) {
  const float32 = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32[i] = int16Array[i] / 0x8000;
  }
  return float32;
}

// ===== GeminiLiveAdapter =====

export class GeminiLiveAdapter {
  constructor() {
    this.ai = null;
    this.session = null;
    this.connected = false;

    // Audio contexts
    this.inputContext = null;   // 16kHz for mic capture
    this.outputContext = null;  // 24kHz for AI audio playback
    this.processor = null;      // ScriptProcessorNode for mic
    this.nextPlayTime = 0;      // For scheduling seamless audio playback

    // Callbacks
    this.onAudioCallback = null;
    this.onInterruptionCallback = null;
    this.onErrorCallback = null;
    this.onCloseCallback = null;
    this.onAIStartSpeakingCallback = null;
    this.onAIStopSpeakingCallback = null;
  }

  /**
   * Connect to Gemini Live API and set up audio pipelines.
   * @param {string} token - Ephemeral token from POST /api/session
   * @param {MediaStream} micStream - Microphone stream from getUserMedia
   */
  async connect(token, micStream) {
    try {
      this.ai = new GoogleGenAI({ apiKey: token });

      this.session = await this.ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
        },
        callbacks: {
          onmessage: (message) => this.handleMessage(message),
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

      // Set up audio pipelines
      if (micStream) {
        this.setupAudioCapture(micStream);
      }
      this.setupAudioPlayback();

      // Trigger AI greeting
      this.sendGreeting();

      return { success: true };
    } catch (error) {
      console.error('[GeminiLiveAdapter] Connection failed:', error.message);
      this.connected = false;
      return { success: false, error: error.message };
    }
  }

  // ===== Audio capture: microphone → Gemini =====

  setupAudioCapture(micStream) {
    // Create AudioContext at 16kHz (Gemini's required input rate)
    this.inputContext = new AudioContext({ sampleRate: 16000 });
        if (this.inputContext.state === 'suspended') {
      this.inputContext.resume().catch(() => {});
    }

    const source = this.inputContext.createMediaStreamSource(micStream);

    // ScriptProcessorNode: 4096 samples per callback, mono
    this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);

    // Mute output to prevent feedback (mic → speakers)
    const muteGain = this.inputContext.createGain();
    muteGain.gain.value = 0;

    source.connect(this.processor);
    this.processor.connect(muteGain);
    muteGain.connect(this.inputContext.destination);

    // Process each chunk of audio
    this.processor.onaudioprocess = (event) => {
      if (!this.connected || !this.session) return;

      // Get raw Float32 audio data
      const float32 = event.inputBuffer.getChannelData(0);

      // Convert to Int16 PCM
      const int16 = float32ToInt16(float32);

      // Base64-encode
      const base64 = arrayBufferToBase64(int16.buffer);

      // Send to Gemini
      try {
        this.session.sendRealtimeInput({
          audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
        });
      } catch (e) {
        // Ignore send errors during shutdown
      }
    };

    console.log('[GeminiLiveAdapter] Audio capture started (16kHz PCM)');
  }

  // ===== Audio playback: Gemini → speakers =====

  setupAudioPlayback() {
    // Create AudioContext at 24kHz (Gemini's output rate)
    this.outputContext = new AudioContext({ sampleRate: 24000 });
        if (this.outputContext.state === 'suspended') {
      this.outputContext.resume().catch(() => {});
    }
    this.nextPlayTime = 0;
    console.log('[GeminiLiveAdapter] Audio playback ready (24kHz PCM)');
  }

  playAudio(base64AudioData) {
    if (!this.outputContext) return;

    // Decode base64 → Int16 → Float32
    const int16 = base64ToInt16Array(base64AudioData);
    const float32 = int16ToFloat32(int16);

    // Create AudioBuffer at 24kHz
    const audioBuffer = this.outputContext.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    // Create and schedule playback
    const source = this.outputContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputContext.destination);

    // Schedule seamlessly after any previously queued audio
    const now = this.outputContext.currentTime;
    if (this.nextPlayTime < now) {
      this.nextPlayTime = now;
    }
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }

  // ===== AI greeting =====

  sendGreeting() {
    if (!this.session) return;

    try {
      // Send a text message to trigger the AI's first response.
      // The system instruction (locked in the token) tells the AI to greet naturally.
      this.session.sendClientContent({
        turns: [{
          role: 'user',
          parts: [{ text: "Hi" }]
        }]
      });
      console.log('[GeminiLiveAdapter] Greeting trigger sent');
    } catch (e) {
      console.error('[GeminiLiveAdapter] Greeting failed:', e.message);
    }
  }

  // ===== Time warning (called when ~15 seconds remain) =====

  sendTimeWarning() {
    if (!this.session || !this.connected) return;

    try {
      // Send a system notification to the AI.
      // The system instruction (locked in the token) tells the AI:
      // "When the application indicates that approximately 15 seconds remain,
      //  naturally acknowledge that the conversation is ending."
      this.session.sendClientContent({
        turns: [{
          role: 'user',
          parts: [{ text: "[System: Approximately 5 seconds remain in this conversation. Please wrap up naturally and say goodbye.]" }]
        }]
      });
      console.log('[GeminiLiveAdapter] Time warning sent to AI');
    } catch (e) {
      console.error('[GeminiLiveAdapter] Time warning failed:', e.message);
    }
  }


  // ===== Message handler: parse Gemini messages =====

  handleMessage(message) {
    // Log the raw message structure for debugging
    console.log('[GeminiLiveAdapter] Message:', JSON.stringify(message).substring(0, 200));

    // The message structure may vary. We handle the known formats.
    // If the structure is different, the logs will tell us what to adjust.

    if (message.serverContent) {
      const content = message.serverContent;

      // Audio chunks (AI speaking)
      if (content.audioChunks) {
        for (const chunk of content.audioChunks) {
          if (chunk.data) {
            this.playAudio(chunk.data);
          }
        }
        if (this.onAIStartSpeakingCallback) {
          this.onAIStartSpeakingCallback();
        }
      }

      // Alternative audio format (modelTurn with inlineData)
      if (content.modelTurn && content.modelTurn.parts) {
        for (const part of content.modelTurn.parts) {
          if (part.inlineData && part.inlineData.data) {
            this.playAudio(part.inlineData.data);
          }
        }
        if (this.onAIStartSpeakingCallback) {
          this.onAIStartSpeakingCallback();
        }
      }

      // Interruption (user spoke while AI was talking)
      if (content.interruption) {
        console.log('[GeminiLiveAdapter] Interruption detected');
        // Stop all scheduled audio
        this.nextPlayTime = 0;
        if (this.onInterruptionCallback) {
          this.onInterruptionCallback();
        }
      }

      // Turn complete (AI finished speaking)
      if (content.turnComplete) {
        console.log('[GeminiLiveAdapter] Turn complete');
        if (this.onAIStopSpeakingCallback) {
          this.onAIStopSpeakingCallback();
        }
      }
    }
  }

  // ===== Disconnect and cleanup =====

  async disconnect() {
    // Stop audio capture
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
      this.processor = null;
    }

    // Close input AudioContext
    if (this.inputContext) {
      try { await this.inputContext.close(); } catch (e) {}
      this.inputContext = null;
    }

    // Close output AudioContext
    if (this.outputContext) {
      try { await this.outputContext.close(); } catch (e) {}
      this.outputContext = null;
    }

    // Close Gemini session
    if (this.session) {
      try { this.session.close(); } catch (e) {
        console.error('[GeminiLiveAdapter] Disconnect error:', e.message);
      }
      this.session = null;
    }

    this.ai = null;
    this.connected = false;
    console.log('[GeminiLiveAdapter] Disconnected');
  }

  // ===== Callback setters =====

  onAudio(cb) { this.onAudioCallback = cb; }
  onInterruption(cb) { this.onInterruptionCallback = cb; }
  onError(cb) { this.onErrorCallback = cb; }
  onClose(cb) { this.onCloseCallback = cb; }
  onAIStartSpeaking(cb) { this.onAIStartSpeakingCallback = cb; }
  onAIStopSpeaking(cb) { this.onAIStopSpeakingCallback = cb; }
}