"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import TagCarousel from "./TagCarousel";
import { useDebounce } from "../hooks/useDebounce";

// Design tokens — keep in sync with tailwind.config.ts
const COLOR_INK = "#1F2D3D";
const COLOR_MUTED = "#6B7A8F";
const COLOR_SURFACE = "#F3F4F2";

const TAGS = [
  { label: "Retangular", index: 0 },
  { label: "Circular", index: 1 },
];

export default function PetTagScene() {
  const [text, setText] = useState("REX");
  const [activeTag, setActiveTag] = useState(0);
  const debouncedText = useDebounce(text, 400);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        background: COLOR_SURFACE,
      }}
    >
      <Canvas camera={{ position: [0, 0, 300] }}>
        <color attach="background" args={[COLOR_SURFACE]} />
        <Environment preset="studio" environmentIntensity={1} />
        {/* Four-point rig — covers full 360° rotation */}
        <directionalLight position={[0, 150, 300]} intensity={0.2} />
        <directionalLight position={[0, 150, -300]} intensity={0.15} />
        <directionalLight position={[-300, 50, 0]} intensity={0.1} />
        <directionalLight position={[300, 50, 0]} intensity={0.1} />

        <TagCarousel text={debouncedText} activeIndex={activeTag} />
      </Canvas>

      {/* Tag type selector */}
      <div
        style={{
          position: "absolute",
          bottom: 96,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
        }}
      >
        {TAGS.map(({ label, index }) => (
          <button
            key={label}
            type="button"
            aria-pressed={activeTag === index}
            onClick={() => setActiveTag(index)}
            style={{
              padding: "6px 18px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "monospace",
              letterSpacing: 1,
              transition: "background 0.2s, color 0.2s",
              background:
                activeTag === index ? COLOR_INK : `${COLOR_INK}14`,
              color: activeTag === index ? "#ffffff" : COLOR_MUTED,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Pet name input */}
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
            border: `1px solid ${COLOR_INK}1F`,
            background: "rgba(255,255,255,0.85)",
            color: COLOR_INK,
            outline: "none",
            textAlign: "center",
            width: 280,
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          }}
        />
      </div>
    </div>
  );
}
