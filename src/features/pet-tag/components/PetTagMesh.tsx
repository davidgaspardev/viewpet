"use client";

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { createPetTagGeometry } from "../geometry/createPetTagGeometry";
import { createCircleTagGeometry } from "../geometry/createCircleTagGeometry";
import {
  createTextGeometry,
  createTextFillGeometry,
} from "../geometry/createTextGeometry";
import { engraveText } from "../csg/engrave";

interface PetTagProps {
  text: string;
  shape?: "rectangle" | "circle";
}

const RECT_WIDTH = 300;
const RECT_HEIGHT = 100;
const RECT_RADIUS = 20;
const CIRCLE_RADIUS = 60;

export default function PetTagMesh({ text, shape = "rectangle" }: PetTagProps) {
  const { viewport, size } = useThree();

  const scale = useMemo(() => {
    const isCircle = shape === "circle";
    const refWidth = isCircle ? CIRCLE_RADIUS * 2 : RECT_WIDTH;
    const maxPx = Math.min(size.width - 32, isCircle ? 240 : 400);
    const worldPerPx = viewport.width / size.width;
    return (maxPx * worldPerPx) / refWidth;
  }, [viewport.width, size.width, shape]);

  const geometry = useMemo(() => {
    const base =
      shape === "circle"
        ? createCircleTagGeometry(CIRCLE_RADIUS)
        : createPetTagGeometry(RECT_WIDTH, RECT_HEIGHT, RECT_RADIUS);

    if (!text.trim()) return base;

    const textSize = shape === "circle" ? 14 : 16;
    try {
      return engraveText(base, createTextGeometry(text, textSize));
    } catch {
      return base;
    }
  }, [text, shape]);

  const fillGeometry = useMemo(() => {
    if (!text.trim()) return null;
    const textSize = shape === "circle" ? 14 : 16;
    try {
      return createTextFillGeometry(text, textSize);
    } catch {
      return null;
    }
  }, [text, shape]);

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
