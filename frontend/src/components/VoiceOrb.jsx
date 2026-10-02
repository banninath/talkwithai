// Animated voice orb with layered rings and a glowing core.
// The `status` prop drives which CSS animation plays.
function VoiceOrb({ status }) {
  const classNames = ['voice-orb'];
  if (status) {
    classNames.push(`voice-orb--${status.toLowerCase()}`);
  }
  return (
    <div className={classNames.join(' ')} aria-hidden="true">
      <div className="voice-orb__ring voice-orb__ring--1" />
      <div className="voice-orb__ring voice-orb__ring--2" />
      <div className="voice-orb__ring voice-orb__ring--3" />
      <div className="voice-orb__core" />
    </div>
  );
}

export default VoiceOrb;