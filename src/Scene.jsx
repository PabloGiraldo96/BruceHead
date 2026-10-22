import { PresentationControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { PerspectiveCamera, SheetProvider } from "@theatre/r3f";
import { Suspense, useState, useLayoutEffect } from "react";
import { Cat } from "./Cat";
import { EyeDive } from "./EyeDive";
import { EDIT, sheet, hasState } from "./theatre";

export const CAMERA_START = [0, 0.15, 5.2];

function FitCamera({ active }) {
  const camera = useThree((s) => s.camera);
  const aspect = useThree((s) => s.size.width / s.size.height);

  useLayoutEffect(() => {
    if (!active) return;
    const half = Math.tan((30 * Math.PI) / 360); // fov 30°
    const dist = Math.max(CAMERA_START[2], 1.15 / (half * aspect));
    camera.position.set(CAMERA_START[0], CAMERA_START[1], dist);
  }, [active, aspect, camera]);

  return null;
}

export default function Scene({ phase, onDiveDone }) {
  const [rig, setRig] = useState(null);

  return (
    <SheetProvider sheet={sheet}>
      <color attach="background" args={["#000000"]} />
      <PerspectiveCamera
        theatreKey="Camera"
        makeDefault
        position={CAMERA_START}
        fov={30}
        near={0.01}
        far={100}
      />
      <FitCamera active={phase === "idle" && !EDIT && !hasState} />
      <hemisphereLight args={["#ffffff", "#5a5048", 1.1]} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <directionalLight position={[-4, 1, -2]} intensity={0.6} />

      <Suspense fallback={null}>
        {/* Arrastra para girarlo; al soltar vuelve al frente */}
        <PresentationControls
          global
          snap
          speed={1.6}
          enabled={phase === "idle" && !EDIT}
          polar={[-0.35, 0.35]}
          azimuth={[-0.9, 0.9]}
        >
          <Cat onReady={setRig} />
        </PresentationControls>
      </Suspense>

      {phase === "diving" && rig && <EyeDive rig={rig} onDone={onDiveDone} />}
    </SheetProvider>
  );
}
