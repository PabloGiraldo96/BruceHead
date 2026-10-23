import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import FloatingMedia from "./FloatingMedia";
import Scene from "./Scene";
import { EDIT } from "./theatre";

const FADE_MS = 700; // oscurecer la pantalla
const HOLD_MS = 1000; // pantalla negra antes de que aparezca el contenido
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// idle -> diving -> black -> media
export default function App() {
  const [phase, setPhase] = useState("idle");
  const [run, setRun] = useState(0);
  const timer = useRef(null);

  const toBlack = useCallback(() => {
    setPhase("black");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase("media"), FADE_MS + HOLD_MS);
  }, []);

const start = () => setPhase("diving");

  const restart = () => {
    clearTimeout(timer.current);
    setPhase("idle");
    setRun((r) => r + 1);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const dark = phase === "black" || phase === "media";

  return (
    <>
      <div className="stage">
        <Canvas
          key={run}
          dpr={[1, 2]}
          frameloop={phase === "media" ? "never" : "always"}
        >
          <Scene phase={phase} onDiveDone={toBlack} />
        </Canvas>
      </div>

      <div
        className={`shade ${dark ? "on" : ""}`}
        style={{ "--fade": `${FADE_MS}ms` }}
      />

      {phase === "media" && <FloatingMedia />}

      {!EDIT && phase === "idle" && (
        <div className="ui bottom">
          <p className="hint">Lo puedes arrastrar</p>
          <button className="btn" onClick={start}>
            COMENZAR
          </button>
        </div>
      )}

      {!EDIT && phase === "media" && (
        <button className="btn replay" onClick={restart}>
          Reiniciar
        </button>
      )}
    </>
  );
}
