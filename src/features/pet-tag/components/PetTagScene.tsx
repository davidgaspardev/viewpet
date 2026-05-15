"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import PetTagMesh from "./PetTagMesh";
import { useDebounce } from "../hooks/useDebounce";

export default function PetTagScene() {
  const [text, setText] = useState("REX");
  const debouncedText = useDebounce(text, 400);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Canvas camera={{ position: [0, 0, 300] }}>
        <Environment preset="studio" environmentIntensity={0} />
        <ambientLight intensity={1} />
        <directionalLight position={[100, 200, 200]} intensity={2} />

        <PetTagMesh text={debouncedText} />

        <OrbitControls
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.toUpperCase())}
          maxLength={12}
          placeholder="NOME DO PET"
          style={{
            padding: "12px 24px",
            fontSize: 20,
            fontFamily: "monospace",
            letterSpacing: 4,
            borderRadius: 8,
            border: "none",
            background: "rgba(0,0,0,0.65)",
            color: "white",
            outline: "none",
            textAlign: "center",
            width: 280,
          }}
        />
      </div>
    </div>
  );
}
