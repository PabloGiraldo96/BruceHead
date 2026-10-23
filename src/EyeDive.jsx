import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { hasState, sheet } from "./theatre";

// ----- Ajustes -----
const FRONT = new THREE.Vector3(1, 0, 2); // hacia dónde mira la cara. Si el gato
                                          // aparece de espaldas, usa (0, 0, -1).
const DIVE_EYE = "eyeR";                  // "eyeL" o "eyeR"
const DIVE_SECONDS = 3.3;
const END_DISTANCE = 0.6;                // qué tan cerca termina del ojo

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Dos modos:
//  - Con src/theatre-state.json: reproduce la secuencia hecha en Theatre.js.
//  - Sin él: hace el acercamiento al ojo por código.
export function EyeDive({ rig, onDone }) {
  const camera = useThree((s) => s.camera);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  // --- Modo Theatre.js ---
  useEffect(() => {
    if (!hasState) return;
    let cancelled = false;
    sheet.project.ready
      .then(() => {
        if (cancelled) return;
        sheet.sequence.position = 0;
        return sheet.sequence.play({ iterationCount: 1 });
      })
      .then(() => {
        if (!cancelled) finish();
      });
    return () => {
      cancelled = true;
      sheet.sequence.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Modo por código ---
  const t = useRef(0);
  const from = useRef(null);
  const target = rig[DIVE_EYE];
  const endPos = useMemo(
    () => target.clone().addScaledVector(FRONT, END_DISTANCE),
    [target]
  );
  const look = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (hasState || finished.current) return;
    if (!from.current) from.current = camera.position.clone();

    t.current = Math.min(1, t.current + delta / DIVE_SECONDS);
    const e = ease(t.current);

    camera.position.lerpVectors(from.current, endPos, e);
    look.current.lerpVectors(rig.mid, target, e);
    camera.lookAt(look.current);

    if (t.current >= 1) finish();
  });

  return null;
}
