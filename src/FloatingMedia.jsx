import { useEffect, useMemo, useRef, useState } from "react";
import { MEDIA } from "./media";
import "./FloatingMedia.css";

// ----- Ajustes -----
const COUNT_DESKTOP = 90; // cuántas piezas flotan en total
const COUNT_MOBILE = 40;
const MAX_VIDEOS_PLAYING = 50; // videos que se reproducen a la vez
const PERSPECTIVE = 900; // px; debe coincidir con el CSS
const Z_MIN = -650; // lo más lejano
const Z_MAX = 480; // lo más cercano
const PAN = 0.22; // cuánto se desplaza el campo con el cursor
const TILT = 7; // grados de inclinación del campo
const FOLLOW = 3.5; // suavizado: más alto = sigue el cursor más rápido

// --- Aparición aleatoria ---
const REVEAL_WINDOW = 10; // segundos en los que van apareciendo todas (cada una en un momento al azar)
const RECYCLE = false; // true = después de un rato se desvanecen y vuelven a salir, sin parar
const ON_MIN = 10; // segundos que permanece visible cada pieza (solo con RECYCLE)
const ON_MAX = 24;
const OFF_MIN = 3; // segundos que permanece oculta antes de volver (solo con RECYCLE)
const OFF_MAX = 10;

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

  // --- Reparto de las piezas en 3D (fijo: la posición no cambia entre visitas) ---
  const items = useMemo(() => {
    const rnd = rng(32);
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
          // Retraso negativo: cada pieza arranca su flote en un punto distinto del ciclo
          "--delay": `-${(rnd() * 12).toFixed(1)}s`,
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

  // --- Aparición aleatoria + videos (comparten estado: solo suena lo que se ve) ---
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const randIn = (a, b) => a + Math.random() * (b - a);

    // Videos: se reproducen solo los que están en pantalla Y ya aparecieron
    const vids = [...layer.querySelectorAll("video")];
    const inView = new Set();
    const playing = new Set();
    const isOn = (v) => v.closest(".fm-item")?.classList.contains("on");

    const sync = () => {
      const want = [...inView].filter(isOn);
      for (const v of [...playing]) {
        if (!want.includes(v)) {
          v.pause();
          playing.delete(v);
        }
      }
      for (const v of want) {
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
          if (en.isIntersecting) inView.add(en.target);
          else inView.delete(en.target);
        }
        sync();
      },
      { threshold: 0.2 }
    );
    vids.forEach((v) => io.observe(v));

    // Cada 2,5 s rota cuál se reproduce, para que todos tengan su turno
    const rotate = setInterval(() => {
      const want = [...inView].filter(isOn);
      if (want.length <= MAX_VIDEOS_PLAYING) return;
      const oldest = playing.values().next().value;
      if (!oldest) return;
      inView.delete(oldest);
      inView.add(oldest); // pasa al final de la cola
      oldest.pause();
      playing.delete(oldest);
      sync();
    }, 250);

    // Aparición: cada pieza se enciende (clase "on") en un momento al azar
    const els = [...layer.querySelectorAll(".fm-item")];
    const show = (el) => {
      el.classList.add("on");
      sync();
    };
    const hide = (el) => {
      el.classList.remove("on");
      sync();
    };
    const cycle = (el) => {
      show(el);
      if (!RECYCLE) return;
      later(() => {
        hide(el);
        later(() => cycle(el), randIn(OFF_MIN, OFF_MAX) * 1000);
      }, randIn(ON_MIN, ON_MAX) * 1000);
    };

    // La primera sale al instante; el resto, repartidas al azar en REVEAL_WINDOW
    const starts = els.map(() => Math.random() * REVEAL_WINDOW);
    const first = starts.length ? Math.min(...starts) : 0;
    els.forEach((el, i) => later(() => cycle(el), (starts[i] - first) * 1000));

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(rotate);
      io.disconnect();
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