import * as THREE from "three";
import { SUBTRACTION, Evaluator, Brush } from "three-bvh-csg";

const evaluator = new Evaluator();
evaluator.useGroups = false;

export function engraveText(
  baseGeometry: THREE.BufferGeometry,
  cutterGeometry: THREE.BufferGeometry,
): THREE.BufferGeometry {
  const base = new Brush(baseGeometry);
  const cutter = new Brush(cutterGeometry);

  base.updateMatrixWorld();
  cutter.updateMatrixWorld();

  const result = evaluator.evaluate(base, cutter, SUBTRACTION);
  return result.geometry;
}
