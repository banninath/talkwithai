import TalkButton from './TalkButton.jsx';

function Landing({ onStart, onError }) {
  // Hidden in production builds (Vite tree-shakes this out when DEV is false).
  const isDev = import.meta.env.DEV;

  return (
    <main className="app">
      <div className="landing">
        <header className="landing-header">
          <h1 className="app-title">TalkWithAI</h1>
          <p className="app-subtitle">Have a conversation. Just talk.</p>
        </header>

        <div className="landing-cta">
          <TalkButton onClick={onStart} />
        </div>

        {isDev && (
          <button type="button" className="dev-test-button" onClick={onError}>
            (dev: test error state)
          </button>
        )}

        <footer className="landing-footer">
          <p className="privacy-note">
            Your microphone is used only during a conversation. Audio is sent to the AI
            provider to generate responses and is not intentionally stored by this app.
            No account required.
          </p>
        </footer>
      </div>
    </main>
  );
}

export default Landing;