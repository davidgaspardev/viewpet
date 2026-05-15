"use client";

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { createPetTagGeometry } from "../geometry/createPetTagGeometry";
import {
  createTextGeometry,
  createTextFillGeometry,
} from "../geometry/createTextGeometry";
import { engraveText } from "../csg/engrave";

interface PetTagProps {
  text: string;
}

const TAG_WIDTH = 300;
const TAG_HEIGHT = 100;
const TAG_RADIUS = 20;

export default function PetTagMesh({ text }: PetTagProps) {
  const { viewport, size } = useThree();

  const scale = useMemo(() => {
    const maxPx = Math.min(size.width - 32, 400);
    const worldPerPx = viewport.width / size.width;
    return (maxPx * worldPerPx) / TAG_WIDTH;
  }, [viewport.width, size.width]);

  const geometry = useMemo(() => {
    const base = createPetTagGeometry(TAG_WIDTH, TAG_HEIGHT, TAG_RADIUS);
    if (!text.trim()) return base;
    try {
      return engraveText(base, createTextGeometry(text));
    } catch {
      return base;
    }
  }, [text]);

  const fillGeometry = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return createTextFillGeometry(text);
    } catch {
      return null;
    }
  }, [text]);

  return (
    <group scale={scale}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#AAAAAA" metalness={1} roughness={0.5} />
      </mesh>
      {fillGeometry && (
        <mesh geometry={fillGeometry}>
          <meshStandardMaterial color="#1a1a1a" metalness={0} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}
