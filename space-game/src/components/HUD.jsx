import { PLAYER } from '../game/config';

export default function HUD({ score, lives, level }) {
  return (
    <div className="hud">
      <div className="hud-item">
        <span className="hud-label">SKOR:</span>
        <span className="hud-value">{score}</span>
      </div>
      <div className="hud-item hud-level">SEVİYE {level}</div>
      <div className="hud-item">
        <span className="hud-label">CAN:</span>
        <span className="hud-lives" aria-label={`${lives} can`}>
          {Array.from({ length: PLAYER.lives }, (_, i) => (
            <span key={i} className={i < lives ? 'heart' : 'heart heart-lost'}>
              ❤️
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
