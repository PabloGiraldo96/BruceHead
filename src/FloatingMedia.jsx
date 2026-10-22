import { useEffect, useMemo, useRef, useState } from "react";
import { MEDIA } from "./media";
import "./FloatingMedia.css";

// ----- Ajustes -----
const COUNT_DESKTOP = 30; // cuántas piezas flotan en total
const COUNT_MOBILE = 16;
const MAX_VIDEOS_PLAYING = 4; // videos que se reproducen a la vez
const PERSPECTIVE = 900; // px; debe coincidir con el CSS
const Z_MIN = -650; // lo más lejano
const Z_MAX = 180; // lo más cercano
const PAN = 0.22; // cuánto se desplaza el campo con el cursor
const TILT = 7; // grados de inclinación del campo
const FOLLOW = 3.5; // suavizado: más alto = sigue el cursor más rápido

// Si el sistema pide "reducir movimiento" no lo apagamos: lo suavizamos a la mitad.
const MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.5 : 1;

// Se actualiza si cambias el tamaño de la ventana (o rotas el celular)
function useSmallScreen() {
  const [small, setSmall] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setSmall(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return small;
}

function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function FloatingMedia() {
  const layerRef = useRef(null);
  const worldRef = useRef(null);
  const small = useSmallScreen();

  // --- Reparto de las piezas en 3D ---
  const items = useMemo(() => {
    const rnd = rng(23);
    const count = small ? COUNT_MOBILE : COUNT_DESKTOP;

    // Repite los archivos hasta llenar y los mezcla (los videos no quedan juntos)
    const pool = shuffle(
      Array.from({ length: count }, (_, i) => MEDIA[i % MEDIA.length]),
      rnd
    );

    // Celdas en pantalla (con un margen extra para que el cursor "descubra" bordes)
    const cols = small ? 3 : 6;
    const rows = Math.ceil(count / cols);
    const span = 124; // de -62 a +62 (vw / vh)
    const cells = shuffle(
      Array.from({ length: cols * rows }, (_, i) => i),
      rnd
    );
    const order = shuffle(
      Array.from({ length: count }, (_, i) => i),
      rnd
    );

    return pool.map((m, i) => {
      const col = cells[i] % cols;
      const row = Math.floor(cells[i] / cols);
      const sx = -62 + (col + rnd()) * (span / cols);
      const sy = -62 + (row + rnd()) * (span / rows);

      const z = Z_MIN + rnd() * (Z_MAX - Z_MIN);
      const depth = (z - Z_MIN) / (Z_MAX - Z_MIN); // 0 lejos, 1 cerca
      // Compensa la perspectiva: así cada pieza cae donde se eligió en pantalla
      const k = (PERSPECTIVE - z) / PERSPECTIVE;

      return {
        ...m,
        isVideo: m.type === "video",
        style: {
          "--x": `${(sx * k).toFixed(1)}vw`,
          "--y": `${(sy * k).toFixed(1)}vh`,
          "--z": `${z.toFixed(0)}px`,
          "--o": (0.45 + 0.55 * depth).toFixed(2),
          "--w": small ? "34vw" : "18vw",
          "--r": `${(rnd() * 10 - 5).toFixed(1)}deg`,
          "--dx": `${Math.round(rnd() * 24 - 12)}px`,
          "--dy": `${Math.round(rnd() * 32 - 16)}px`,
          "--dur": `${(7 + rnd() * 6).toFixed(1)}s`,
          "--delay": `${(order[i] * 0.12).toFixed(2)}s`,
        },
      };
    });
  }, [small]);

  // --- El campo sigue al cursor (un solo bucle, sin re-render de React) ---
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let hasPointer = false;

    const onMove = (e) => {
      hasPointer = true;
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onLeave = () => {
      hasPointer = false;
    };
    // Al levantar el dedo el campo vuelve a mecerse solo
    const onUp = (e) => {
      if (e.pointerType !== "mouse") hasPointer = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Sin cursor (o en móvil sin tocar) el campo se mece solo
      // En pantallas pequeñas el vaivén es más amplio para que se note
      const amp = small ? 0.7 : 0.35;
      const tx = hasPointer ? target.x : Math.sin(now / 4200) * amp;
      const ty = hasPointer ? target.y : Math.cos(now / 5300) * amp * 0.7;

      const k = 1 - Math.exp(-FOLLOW * dt);
      cur.x += (tx - cur.x) * k;
      cur.y += (ty - cur.y) * k;

      const pan = Math.min(window.innerWidth, window.innerHeight) * PAN * MOTION;
      const tilt = TILT * MOTION;
      world.style.transform =
        `translate3d(${-cur.x * pan}px, ${-cur.y * pan}px, 0) ` +
        `rotateX(${-cur.y * tilt}deg) rotateY(${cur.x * tilt}deg)`;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [small]);

  // --- Solo se reproducen unos pocos videos a la vez ---
  useEffect(() => {
    const vids = layerRef.current?.querySelectorAll("video");
    if (!vids || !vids.length) return;

    const visible = new Set(); // en pantalla
    const playing = new Set(); // reproduciéndose

    const sync = () => {
      for (const v of [...playing]) {
        if (!visible.has(v)) {
          v.pause();
          playing.delete(v);
        }
      }
      for (const v of visible) {
        if (playing.size >= MAX_VIDEOS_PLAYING) break;
        if (!playing.has(v)) {
          v.play().catch(() => {});
          playing.add(v);
        }
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) visible.add(en.target);
          else visible.delete(en.target);
        }
        sync();
      },
      { threshold: 0.2 }
    );
    vids.forEach((v) => io.observe(v));

    // Cada 2,5 s rota cuál se reproduce, para que todos tengan su turno
    const rotate = setInterval(() => {
      if (visible.size <= MAX_VIDEOS_PLAYING) return;
      const oldest = playing.values().next().value;
      if (!oldest) return;
      visible.delete(oldest);
      visible.add(oldest); // pasa al final de la cola
      oldest.pause();
      playing.delete(oldest);
      sync();
    }, 2500);

    return () => {
      io.disconnect();
      clearInterval(rotate);
      vids.forEach((v) => v.pause());
    };
  }, [items]);

  return (
    <div className="fm-layer" ref={layerRef}>
      <div className="fm-world" ref={worldRef}>
        {items.map((m, i) => (
          <div className="fm-item" style={m.style} key={i}>
            <div className="fm-bob">
              {m.isVideo ? (
                <video
                  src={`${m.src}#t=0.1`}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img src={m.src} alt={m.alt || ""} decoding="async" draggable="false" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}