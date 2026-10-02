import { useReducer, useEffect } from 'react';
import Landing from './components/Landing.jsx';
import Conversation from './components/Conversation.jsx';
import CompletedView from './components/CompletedView.jsx';
import ErrorView from './components/ErrorView.jsx';
import { useMicrophone } from './hooks/useMicrophone.js';
import './index.css';

const initialState = { status: 'IDLE', errorType: null };

// Defensive reducer: each transition only valid from its expected source state.
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

  // CONNECTING: request microphone permission.
  // Replaces the simulated 1.5s delay from Phase 2.
  // Phase 8 will also request a backend session here.
  useEffect(() => {
    if (state.status !== 'CONNECTING') return;

    let cancelled = false;

    requestMic().then((result) => {
      if (cancelled) return;
      if (result.success) {
        dispatch({ type: 'CONNECTED' });
      } else {
        dispatch({ type: 'ERROR', errorType: result.errorType });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state.status, requestMic]);

  // ENDING: release microphone, then transition to COMPLETED.
  useEffect(() => {
    if (state.status !== 'ENDING') return;

    release();
    const timer = setTimeout(() => dispatch({ type: 'ENDED' }), 800);
    return () => clearTimeout(timer);
  }, [state.status, release]);

  // Simulated LISTENING ↔ AI_SPEAKING cycling (Phase 2-3 only).
  // Phase 8+ will replace these with real Gemini Live events.
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