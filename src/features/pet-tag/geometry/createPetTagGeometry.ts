import * as THREE from "three";
import { createRoundedRectShape } from "./createRoundedRectShape";

export function createPetTagGeometry(
  width: number,
  height: number,
  radius: number = 5,
): THREE.ExtrudeGeometry {
  const shape = createRoundedRectShape(width, height, radius);

  return new THREE.ExtrudeGeometry(shape, {
    depth: 5,
    bevelEnabled: false,
  });
}
