// Reusable primary CTA button. Used on landing ("TALK") and
// completion ("TALK AGAIN") screens. Label is configurable.
function TalkButton({ onClick, label = 'TALK' }) {
  return (
    <button
      type="button"
      className="talk-button"
      onClick={onClick}
      aria-label={label === 'TALK' ? 'Start a voice conversation' : 'Start a new voice conversation'}
    >
      <span className="talk-button__label">{label}</span>
    </button>
  );
}

export default TalkButton;