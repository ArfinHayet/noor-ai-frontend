"use client";

import React, { useMemo } from "react";

/**
 * HorizonHills Component
 * Renders small, distant rolling green hills and subtle mountain ridges strictly along the sky horizon (Z = -380 to -430).
 * Removed from side fields as requested by the user.
 */
export function HorizonHills() {
  // Small, distant rolling green hills positioned far at the sky horizon line (Z = -380 to -400)
  const distantGreenHills = useMemo(
    () => [
      { pos: [-100, 0.5, -390], scale: [45, 4.5, 20], color: "#84cc16" },
      { pos: [-60, 1.0, -395], scale: [40, 5.0, 22], color: "#65a30d" },
      { pos: [-20, 0.8, -400], scale: [38, 4.2, 18], color: "#4d7c0f" },
      { pos: [20, 1.2, -398], scale: [42, 5.5, 24], color: "#84cc16" },
      { pos: [60, 0.9, -392], scale: [40, 4.8, 20], color: "#65a30d" },
      { pos: [100, 0.6, -388], scale: [46, 4.0, 18], color: "#4d7c0f" },
    ],
    []
  );

  // Small, subtle background mountain ridges far in the distance near the sky horizon line (Z = -420)
  const distantMountainRanges = useMemo(
    () => [
      { pos: [-90, 4.5, -420], radius: 22, height: 10, color: "#06b6d4" },
      { pos: [-45, 5.5, -425], radius: 26, height: 12, color: "#0891b2" },
      { pos: [0, 6.5, -430], radius: 28, height: 14, color: "#155e75" },
      { pos: [45, 5.0, -422], radius: 24, height: 11, color: "#06b6d4" },
      { pos: [90, 4.0, -418], radius: 20, height: 9, color: "#0e7490" },
    ],
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Small, distant rolling green hills at horizon sky base */}
      {distantGreenHills.map((hill, idx) => (
        <mesh
          key={`distant-hill-${idx}`}
          position={hill.pos}
          scale={hill.scale}
          receiveShadow
        >
          <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color={hill.color}
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>
      ))}

      {/* Small, subtle background mountain ridges near horizon skyline */}
      {distantMountainRanges.map((mtn, idx) => (
        <mesh key={`distant-mtn-${idx}`} position={mtn.pos}>
          <coneGeometry args={[mtn.radius, mtn.height, 7]} />
          <meshStandardMaterial
            color={mtn.color}
            roughness={0.9}
            metalness={0.1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}
