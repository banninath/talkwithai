import VoiceOrb from './VoiceOrb.jsx';
import Timer from './Timer.jsx';

const STATUS_TEXT = {
  CONNECTING: 'Connecting...',
  LISTENING: 'Listening...',
  AI_SPEAKING: 'AI is speaking...',
  ENDING: 'Conversation ending...',
};

function Conversation({ status, stream, onEnd, onTimerExpire, onTimerWarning }) {
  const showTimer = status === 'LISTENING' || status === 'AI_SPEAKING';
  const showEndButton = status === 'LISTENING' || status === 'AI_SPEAKING';
  const micActive =
    (status === 'LISTENING' || status === 'AI_SPEAKING') && stream;

  return (
    <main className="app">
      <div className="conversation">
        <header className="conversation-header">
          <h1 className="conversation-title">TalkWithAI</h1>
        </header>

        {showTimer && (
          <div className="conversation-timer">
            <Timer onExpire={onTimerExpire} onWarning={onTimerWarning} />
          </div>
        )}

        <div className="conversation-orb">
          <VoiceOrb status={status} />
        </div>

        <div className="conversation-status">
          <p className="status-text">{STATUS_TEXT[status] || ''}</p>
          {micActive && (
            <p className="mic-indicator">
              <span className="mic-indicator__dot" />
              Microphone active
            </p>
          )}
        </div>

        <div className="conversation-controls">
          {showEndButton && (
            <button type="button" className="end-button" onClick={onEnd}>
              End conversation
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default Conversation;