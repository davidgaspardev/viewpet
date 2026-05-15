import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fontData = require("three/examples/fonts/helvetiker_bold.typeface.json");

const font = new FontLoader().parse(fontData);

const TAG_DEPTH = 5;
const ENGRAVE_DEPTH = 1.5;

export function createTextFillGeometry(text: string, size = 16): THREE.BufferGeometry {
  const geometry = new TextGeometry(text, {
    font,
    size,
    depth: ENGRAVE_DEPTH - 0.1,
    curveSegments: 4,
    bevelEnabled: false,
  });

  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox!;

  geometry.translate(
    -(min.x + (max.x - min.x) / 2),
    -(min.y + (max.y - min.y) / 2),
    TAG_DEPTH - ENGRAVE_DEPTH + 0.05,
  );

  return geometry;
}

export function createTextGeometry(text: string, size = 16): THREE.BufferGeometry {
  const geometry = new TextGeometry(text, {
    font,
    size,
    depth: ENGRAVE_DEPTH + 2,
    curveSegments: 4,
    bevelEnabled: false,
  });

  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox!;

  geometry.translate(
    -(min.x + (max.x - min.x) / 2),
    -(min.y + (max.y - min.y) / 2),
    TAG_DEPTH - ENGRAVE_DEPTH,
  );

  return geometry;
}
