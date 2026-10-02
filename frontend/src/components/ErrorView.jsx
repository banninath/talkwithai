// User-friendly error messages per error type.
// Never expose: API keys, stack traces, internal server errors, provider credentials.
const ERROR_MESSAGES = {
  denied: {
    title: 'Microphone access denied',
    message:
      'Please allow microphone access in your browser settings and try again.',
  },
  unavailable: {
    title: 'No microphone found',
    message: 'Please connect a microphone and try again.',
  },
  unsupported: {
    title: 'Browser not supported',
    message:
      "Your browser doesn't support voice conversations. Please try the latest Chrome or Edge.",
  },
  connection: {
    title: 'Something went wrong',
    message:
      "Sorry, we couldn't start the conversation. Please try again.",
  },
};

function ErrorView({ errorType = 'connection', onRetry }) {
  const error = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.connection;

  return (
    <main className="app">
      <div className="error-screen">
        <h1 className="error-title">{error.title}</h1>
        <p className="error-message">{error.message}</p>
        <button type="button" className="retry-button" onClick={onRetry}>
          Try again
        </button>
      </div>
    </main>
  );
}

export default ErrorView;