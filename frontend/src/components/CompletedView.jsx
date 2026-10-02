import TalkButton from './TalkButton.jsx';

function CompletedView({ onRestart }) {
  return (
    <main className="app">
      <div className="completed">
        <header className="completed-header">
          <h1 className="completed-title">Conversation complete</h1>
        </header>

        <p className="completed-message">
          Looks like our time is up. I really enjoyed talking with you. See you in our
          next conversation!
        </p>

        <div className="completed-cta">
          <TalkButton onClick={onRestart} label="TALK AGAIN" />
        </div>
      </div>
    </main>
  );
}

export default CompletedView;