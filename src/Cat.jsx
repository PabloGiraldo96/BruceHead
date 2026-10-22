import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { EDIT } from "./theatre";

export const MODEL_URL = "/models/HeadOne.glb";

const centerOf = (obj) =>
  new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());

// Carga el modelo, lo centra y lo escala para que mida ~2 unidades.
// Así las posiciones de cámara son iguales sin importar cómo se exportó.
export function Cat({ onReady }) {
  const { scene } = useGLTF(MODEL_URL);
  const root = useRef();

  useLayoutEffect(() => {
    scene.position.set(0, 0, 0);
    root.current.scale.setScalar(1);
    root.current.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    scene.position.copy(center).negate();
    root.current.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
    root.current.updateMatrixWorld(true);

    // Los objetos del .blend se llaman Eye_L y Eye_R
    const l = scene.getObjectByName("Eye_L");
    const r = scene.getObjectByName("Eye_R");
    if (!l || !r) {
      console.warn(
        "[Gato] No encontré Eye_L / Eye_R en el .glb. Uso posiciones aproximadas."
      );
    }
    const eyeL = l ? centerOf(l) : new THREE.Vector3(-0.22, 0.12, 0.45);
    const eyeR = r ? centerOf(r) : new THREE.Vector3(0.22, 0.12, 0.45);
    const mid = eyeL.clone().add(eyeR).multiplyScalar(0.5);

    if (EDIT) {
      const f = (v) => v.toArray().map((n) => +n.toFixed(3));
      console.info("[Gato] Eye_L", f(eyeL), "Eye_R", f(eyeR));
    }
    onReady({ eyeL, eyeR, mid });
  }, [scene, onReady]);

  return (
    <group ref={root}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
