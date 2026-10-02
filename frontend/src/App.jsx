import { useReducer, useEffect, useRef } from 'react';
import Landing from './components/Landing.jsx';
import Conversation from './components/Conversation.jsx';
import CompletedView from './components/CompletedView.jsx';
import ErrorView from './components/ErrorView.jsx';
import { useMicrophone } from './hooks/useMicrophone.js';
import { GeminiLiveAdapter } from './services/GeminiLiveAdapter.js';
import './index.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const initialState = { status: 'IDLE', errorType: null };

function conversationReducer(state, action) {
  switch (action.type) {
    case 'START':
      return state.status === 'IDLE'
        ? { status: 'CONNECTING', errorType: null }
        : state;
    case 'CONNECTED':
      return state.status === 'CONNECTING' ? { status: 'LISTENING' } : state;
    case 'AI_START_SPEAKING':
      return state.status === 'LISTENING' ? { status: 'AI_SPEAKING' } : state;
    case 'AI_STOP_SPEAKING':
      return state.status === 'AI_SPEAKING' ? { status: 'LISTENING' } : state;
    case 'END':
      return ['CONNECTING', 'LISTENING', 'AI_SPEAKING'].includes(state.status)
        ? { status: 'ENDING' }
        : state;
    case 'ENDED':
      return state.status === 'ENDING' ? { status: 'COMPLETED' } : state;
    case 'ERROR':
      return ['IDLE', 'CONNECTING', 'LISTENING', 'AI_SPEAKING'].includes(state.status)
        ? { status: 'ERROR', errorType: action.errorType || 'connection' }
        : state;
    case 'RESET':
      return ['COMPLETED', 'ERROR'].includes(state.status)
        ? { status: 'IDLE', errorType: null }
        : state;
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(conversationReducer, initialState);
  const { stream, requestMic, release } = useMicrophone();
  const voiceServiceRef = useRef(null);

  // CONNECTING: request mic → request token → connect to Gemini
  useEffect(() => {
    if (state.status !== 'CONNECTING') return;

    let cancelled = false;

    async function setupSession() {
      // Step 1: Request microphone permission
      const micResult = await requestMic();
      if (cancelled) return;
      if (!micResult.success) {
        dispatch({ type: 'ERROR', errorType: micResult.errorType });
        return;
      }

      // Step 2: Request ephemeral token from backend
      let token;
      try {
        const response = await fetch(`${BACKEND_URL}/api/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (cancelled) return;

        if (!response.ok) {
          console.error('[TalkWithAI] Backend returned:', response.status);
          dispatch({ type: 'ERROR', errorType: 'connection' });
          return;
        }

        const data = await response.json();
        token = data.token;

        if (!token) {
          console.error('[TalkWithAI] No token in response');
          dispatch({ type: 'ERROR', errorType: 'connection' });
          return;
        }
      } catch (error) {
        if (cancelled) return;
        console.error('[TalkWithAI] Backend request failed:', error.message);
        dispatch({ type: 'ERROR', errorType: 'connection' });
        return;
      }

      // Step 3: Connect to Gemini Live API using the ephemeral token
      const adapter = new GeminiLiveAdapter();
      voiceServiceRef.current = adapter;

      const connectResult = await adapter.connect(token);
      if (cancelled) return;

      if (!connectResult.success) {
        console.error('[TalkWithAI] Gemini connection failed:', connectResult.error);
        dispatch({ type: 'ERROR', errorType: 'connection' });
        return;
      }

      // All steps succeeded — conversation is live
      dispatch({ type: 'CONNECTED' });
    }

    setupSession();

    return () => {
      cancelled = true;
    };
  }, [state.status, requestMic]);

  // ENDING: disconnect from Gemini → release mic → complete
  useEffect(() => {
    if (state.status !== 'ENDING') return;

    // Disconnect from Gemini
    if (voiceServiceRef.current) {
      voiceServiceRef.current.disconnect();
      voiceServiceRef.current = null;
    }

    // Notify backend (best-effort, don't wait)
    fetch(`${BACKEND_URL}/api/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {});

    // Release microphone
    release();

    const timer = setTimeout(() => dispatch({ type: 'ENDED' }), 800);
    return () => clearTimeout(timer);
  }, [state.status, release]);

  // Simulated LISTENING ↔ AI_SPEAKING cycling (Phase 2-7 only).
  // Phase 8 will replace these with real Gemini audio events.
  useEffect(() => {
    let timer;
    switch (state.status) {
      case 'LISTENING':
        timer = setTimeout(() => dispatch({ type: 'AI_START_SPEAKING' }), 3000);
        break;
      case 'AI_SPEAKING':
        timer = setTimeout(() => dispatch({ type: 'AI_STOP_SPEAKING' }), 3000);
        break;
      default:
        break;
    }
    return () => clearTimeout(timer);
  }, [state.status]);

  switch (state.status) {
    case 'IDLE':
      return (
        <Landing
          onStart={() => dispatch({ type: 'START' })}
          onError={() => dispatch({ type: 'ERROR', errorType: 'connection' })}
        />
      );
    case 'CONNECTING':
    case 'LISTENING':
    case 'AI_SPEAKING':
    case 'ENDING':
      return (
        <Conversation
          status={state.status}
          stream={stream}
          onEnd={() => dispatch({ type: 'END' })}
          onTimerExpire={() => dispatch({ type: 'END' })}
          onTimerWarning={() => {
            console.log('[TalkWithAI] 15-second warning triggered');
          }}
        />
      );
    case 'COMPLETED':
      return <CompletedView onRestart={() => dispatch({ type: 'RESET' })} />;
    case 'ERROR':
      return (
        <ErrorView
          errorType={state.errorType}
          onRetry={() => dispatch({ type: 'RESET' })}
        />
      );
    default:
      return (
        <Landing
          onStart={() => dispatch({ type: 'START' })}
          onError={() => dispatch({ type: 'ERROR', errorType: 'connection' })}
        />
      );
  }
}

export default App;