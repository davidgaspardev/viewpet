"use client";

import { useMemo } from "react";
import { createPetTagGeometry } from "../geometry/createPetTagGeometry";
import { createTextGeometry, createTextFillGeometry } from "../geometry/createTextGeometry";
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

  const fillGeometry = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return createTextFillGeometry(text);
    } catch {
      return null;
    }
  }, [text]);

  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#AAAAAA" metalness={1} roughness={0.5} />
      </mesh>
      {fillGeometry && (
        <mesh geometry={fillGeometry}>
          <meshStandardMaterial color="#1a1a1a" metalness={0} roughness={0.9} />
        </mesh>
      )}
    </>
  );
}
