export function CreditsOverlay({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <div className="credits-overlay">
      <h2>Credits</h2>
      <p>
        Escape the Elites: The Broadcast is a fictional investigative thriller.
        <br /><br />
        Design, Engineering, and Direction by the development team.
        <br /><br />
        Built with PlayCanvas, React, TypeScript, and Vite.
      </p>
      <button className="ui-button credits-close-btn" onClick={onClose}>Close</button>
    </div>
  );
}
