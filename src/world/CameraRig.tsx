import { useScroll } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useRef } from "react";
import { Fog, Vector2, Vector3 } from "three";
import { PARALLAX_MAX, STATION_COUNT } from "../lib/constants";
import { useStore } from "../store/useStore";
import { offsetToStation, samplePath, stationToOffset } from "./cameraPath";
import { getFocusPose, maxAllowedStation, registerScrollElement } from "./navigation";

const FOG_NEAR = 8;
const FOG_FAR = 34;
const FOG_FAR_OUTRO = 280;

interface CameraRigProps {
  reducedMotion: boolean;
}

export function CameraRig({ reducedMotion }: CameraRigProps): null {
  const scroll = useScroll();
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);

  const pathPos = useRef(new Vector3());
  const pathTarget = useRef(new Vector3());
  const desiredPos = useRef(new Vector3());
  const desiredTarget = useRef(new Vector3());
  const lookAt = useRef(new Vector3());
  const parallax = useRef(new Vector2());
  const initialised = useRef(false);

  useEffect(() => registerScrollElement(scroll.el), [scroll.el]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const store = useStore.getState();

    // Enforce scroll lock at Station 1 (Money) until profile.setupComplete is true
    const maxStation = maxAllowedStation();
    const maxOffset = stationToOffset(maxStation);
    let offset = scroll.offset;
    if (offset > maxOffset) {
      offset = maxOffset;
      const el = scroll.el;
      if (el) {
        const limitPx = maxOffset * Math.max(0, el.scrollHeight - el.clientHeight);
        if (el.scrollTop > limitPx + 1) {
          el.scrollTop = limitPx;
        }
      }
    }

    samplePath(offset, pathPos.current, pathTarget.current);
    const pose = getFocusPose(store.focus);

    if (pose) {
      desiredPos.current.copy(pose.position);
      desiredTarget.current.copy(pose.target);
    } else {
      desiredPos.current.copy(pathPos.current);
      desiredTarget.current.copy(pathTarget.current);
    }

    if (!reducedMotion) {
      easing.damp2(
        parallax.current,
        [state.pointer.x * PARALLAX_MAX, state.pointer.y * PARALLAX_MAX],
        0.35,
        dt
      );
      desiredPos.current.x += parallax.current.x;
      desiredPos.current.y += parallax.current.y;
    }

    if (!initialised.current || reducedMotion) {
      camera.position.copy(desiredPos.current);
      lookAt.current.copy(desiredTarget.current);
      initialised.current = true;
    } else {
      const smooth = pose ? 0.35 : 0.12;
      easing.damp3(camera.position, desiredPos.current, smooth, dt);
      easing.damp3(lookAt.current, desiredTarget.current, smooth, dt);
    }
    camera.lookAt(lookAt.current);

    if (scene.fog instanceof Fog) {
      const outro = Math.min(1, Math.max(0, offset * (STATION_COUNT - 1) - (STATION_COUNT - 2)));
      const k = outro * outro * (3 - 2 * outro);
      scene.fog.far = FOG_FAR + (FOG_FAR_OUTRO - FOG_FAR) * k;
      scene.fog.near = FOG_NEAR + 28 * k;
    }

    const station = Math.min(maxStation, offsetToStation(offset));
    if (station !== store.selectedStation) store.setSelectedStation(station);
  });

  return null;
}

export { FOG_NEAR, FOG_FAR };
