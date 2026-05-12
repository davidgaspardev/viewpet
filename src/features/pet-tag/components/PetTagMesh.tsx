"use client";

import { useMemo } from "react";
import { createPetTagGeometry } from "../geometry/createPetTagGeometry";

export default function PetTagMesh() {
  const geometry = useMemo(() => createPetTagGeometry(300, 100, 20), []);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#AAAAAA" metalness={1} roughness={0.5} />
    </mesh>
  );
}
