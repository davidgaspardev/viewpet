"use client";

import { useMemo } from "react";
import { createPetTagGeometry } from "../geometry/createPetTagGeometry";
import { createTextGeometry } from "../geometry/createTextGeometry";
import { engraveText } from "../csg/engrave";

interface PetTagProps {
  text: string;
}

export default function PetTagMesh(props: PetTagProps) {
  const { text } = props;
  const geometry = useMemo(() => {
    const base = createPetTagGeometry(300, 100, 20);
    if (!text.trim()) return base;

    try {
      return engraveText(base, createTextGeometry(text));
    } catch {
      return base;
    }
  }, [text]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#AAAAAA" metalness={1} roughness={0.5} />
    </mesh>
  );
}
