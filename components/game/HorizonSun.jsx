"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * HorizonSun Component
 * Renders the stylized 3D Sun model matching the user reference image
 * (Central sphere with 8 radial capsule ray spokes) on the right horizon (X = 45, Y = 26, Z = -260).
 */
export function HorizonSun() {
  const raysGroupRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (raysGroupRef.current) {
      raysGroupRef.current.rotation.z = t * 0.15; // Slow ambient rotation for 3D rays
    }
  });

  // Calculate 8 radial positions and rotations for the 3D ray capsules
  const rayAngleCount = 8;
  const rayDistance = 7.6;

  return (
    <group position={[45, 26, -260]}>
      {/* Central 3D Yellow Sun Sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[5.2, 32, 32]} />
        <meshStandardMaterial color="#facc15" roughness={0.25} metalness={0.1} emissive="#f59e0b" emissiveIntensity={0.6} />
      </mesh>

      {/* 8 Radial 3D Sun Ray Capsules matching User Reference Image */}
      <group ref={raysGroupRef} position={[0, 0, 0]}>
        {Array.from({ length: rayAngleCount }).map((_, idx) => {
          const angle = (idx * Math.PI * 2) / rayAngleCount;
          const x = Math.cos(angle) * rayDistance;
          const y = Math.sin(angle) * rayDistance;

          return (
            <mesh
              key={idx}
              position={[x, y, 0]}
              rotation={[0, 0, angle - Math.PI / 2]}
              scale={[0.7, 1.8, 0.7]}
            >
              <sphereGeometry args={[0.95, 16, 16]} />
              <meshStandardMaterial
                color="#fbbf24"
                roughness={0.2}
                emissive="#d97706"
                emissiveIntensity={0.5}
              />
            </mesh>
          );
        })}
      </group>

      {/* Warm Sun Illumination */}
      <directionalLight position={[0, 10, 0]} intensity={3.5} color="#fef08a" castShadow />
      <pointLight position={[0, 0, 5]} intensity={5.0} color="#fde047" distance={400} />
    </group>
  );
}
