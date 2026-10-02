// Animated voice orb. The `status` prop drives the animation.
// Phase 2: pure CSS animations per state.
// Phase 8+: we may drive animation intensity from real audio amplitude.
function VoiceOrb({ status }) {
  const classNames = ['voice-orb'];
  if (status) {
    classNames.push(`voice-orb--${status.toLowerCase()}`);
  }
  return (
    <div className={classNames.join(' ')} aria-hidden="true">
      <div className="voice-orb__core" />
    </div>
  );
}

export default VoiceOrb;