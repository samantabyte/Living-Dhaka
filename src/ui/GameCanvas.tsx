import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../core/GameEngine';

export function GameCanvas() {
  const ref = useRef<HTMLCanvasElement>(null); const [error, setError] = useState('');
  useEffect(() => {
    if (!ref.current) return; const engine = new GameEngine(ref.current); engine.start().catch(reason => { console.error(reason); setError(String(reason)); });
    return () => engine.dispose();
  }, []);
  return <div className="game-canvas">{error && <div className="fatal">Unable to start 3D game: {error}</div>}<canvas ref={ref} aria-label="Living Dhaka 3D game" /></div>;
}
