export default function GameOverScreen({ score, highScore, isNewRecord, onRestart }) {
  return (
    <div className="overlay overlay-gameover">
      <h2 className="overlay-title title-danger">GAME OVER</h2>
      {isNewRecord && <div className="new-record">YENİ REKOR!</div>}
      <dl className="score-table">
        <dt>SKOR</dt>
        <dd>{score}</dd>
        <dt>EN YÜKSEK SKOR</dt>
        <dd>{highScore}</dd>
      </dl>
      <button className="btn-primary" onClick={onRestart}>
        Yeniden Başla
      </button>
      <p className="overlay-credit">Bir Ekrem Malik oyunu</p>
    </div>
  );
}
