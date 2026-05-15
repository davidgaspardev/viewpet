"use client";

import { useRef, useEffect } from "react";
import { useThree, useFrame, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import PetTagMesh from "./PetTagMesh";

interface TagCarouselProps {
  text: string;
  activeIndex: number;
}

export default function TagCarousel({ text, activeIndex }: TagCarouselProps) {
  const { viewport, gl } = useThree();

  // Slide
  const sliderRef = useRef<THREE.Group>(null!);
  const posX = useRef(0);
  const viewportWidthRef = useRef(viewport.width);
  viewportWidthRef.current = viewport.width;

  // Per-tag rotation (index 0 = rectangle, 1 = circle)
  const rectRef = useRef<THREE.Group>(null!);
  const circleRef = useRef<THREE.Group>(null!);
  const rotations = useRef([0, 0]);

  // Drag state
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Drag starts only when the pointer hits a tag mesh
  const onTagPointerDown = (e: ThreeEvent<PointerEvent>) => {
    isDragging.current = true;
    lastX.current = e.clientX;
    gl.domElement.setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    const canvas = gl.domElement;

    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      rotations.current[activeIndexRef.current] += dx * 0.008;
    };

    const onUp = () => {
      isDragging.current = false;
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [gl.domElement]);

  useFrame(() => {
    // Slide animation
    const target = -activeIndexRef.current * viewportWidthRef.current;
    posX.current += (target - posX.current) * 0.1;
    if (sliderRef.current) sliderRef.current.position.x = posX.current;

    // Apply individual rotations
    if (rectRef.current) rectRef.current.rotation.y = rotations.current[0];
    if (circleRef.current) circleRef.current.rotation.y = rotations.current[1];
  });

  return (
    <group ref={sliderRef}>
      <group ref={rectRef} onPointerDown={onTagPointerDown}>
        <PetTagMesh text={text} shape="rectangle" />
      </group>
      <group position={[viewport.width, 0, 0]}>
        <group ref={circleRef} onPointerDown={onTagPointerDown}>
          <PetTagMesh text={text} shape="circle" />
        </group>
      </group>
    </group>
  );
}
