import { memo } from "react";
import { MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, TorusGeometry } from "three";
import { COLORS, STATIONS, STATION_COUNT } from "../lib/constants";
import { STATION_CENTERS } from "./cameraPath";

export const FLOOR_Y = -2.85;

// Reduced radius and subtle 0.22 opacity so floor halos sit beneath stations and never cross the dock.
const ringGeometry = new TorusGeometry(2.55, 0.014, 8, 96);
const innerRingGeometry = new TorusGeometry(1.75, 0.008, 6, 72);
const ringMaterial = new MeshBasicMaterial({
  color: COLORS.emerald,
  toneMapped: false,
  transparent: true,
  opacity: 0.22,
  depthWrite: false
});
const innerRingMaterial = new MeshBasicMaterial({
  color: COLORS.cyan,
  toneMapped: false,
  transparent: true,
  opacity: 0.16,
  depthWrite: false
});
const floorGeometry = new PlaneGeometry(520, 520);
const floorMaterial = new MeshStandardMaterial({ color: "#05080f", roughness: 0.42, metalness: 0.7 });

export const Floor = memo(function Floor(): JSX.Element {
  return (
    <mesh
      geometry={floorGeometry}
      material={floorMaterial}
      rotation-x={-Math.PI / 2}
      position={[0, FLOOR_Y, -96]}
      receiveShadow={false}
    />
  );
});

export const StationBeacons = memo(function StationBeacons(): JSX.Element {
  return (
    <group>
      {STATION_CENTERS.slice(0, STATION_COUNT - 1).map((c, i) => (
        <group key={STATIONS[i].id} position={[c[0], FLOOR_Y + 0.01, c[2]]}>
          <mesh geometry={ringGeometry} material={ringMaterial} rotation-x={-Math.PI / 2} />
          <mesh geometry={innerRingGeometry} material={innerRingMaterial} rotation-x={-Math.PI / 2} />
        </group>
      ))}
    </group>
  );
});
