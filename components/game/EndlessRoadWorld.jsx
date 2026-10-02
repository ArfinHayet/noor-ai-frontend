"use client";

import React from "react";
import { LowPolyClouds } from "./LowPolyClouds";
import { OrganicTreesAndHills } from "./OrganicTreesAndHills";
import { FullMosquePavilion } from "./FullMosquePavilion";
import { SuburbanCity } from "./SuburbanCity";
import { HorizonHills } from "./HorizonHills";

/**
 * EndlessRoadWorld Component
 * Clean 3D Suburban City environment featuring continuous 3D Kenney model streets,
 * dense multi-row suburban neighborhoods, landmark pavilions, and distant horizon hills.
 */
export function EndlessRoadWorld() {
  return (
    <group position={[0, 0, 0]}>
      {/* Sunlight & Atmospheric Ambient Light */}
      <directionalLight position={[30, 50, 30]} intensity={2.8} color="#fffbe6" castShadow />
      <ambientLight intensity={1.35} color="#e0f2fe" />

      {/* Fluffy Low-Poly White Clouds Visible Directly in Sky */}
      <LowPolyClouds />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DISTANT SKY HORIZON HILLS & MOUNTAINS                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <HorizonHills />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DENSE MULTI-ROW SUBURBAN 3D CITY & ROAD NETWORK               */}
      {/* Spans continuously from Z = +30 down to Z = -260              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <SuburbanCity />

      {/* Ground-Anchored 3D Kenney Suburban Trees & Stepping Paths */}
      <OrganicTreesAndHills />

      {/* Lawn Green Meadow Terrain Ground under Suburban City (Seamless coverage) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -150]}>
        <planeGeometry args={[140, 360]} />
        <meshStandardMaterial color="#558b2f" roughness={0.85} />
      </mesh>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FULL MOSQUE PAVILION & LANDMARKS ALONG THE SUBURBAN AVENUE     */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* LEVEL 1 MILESTONE (Z = -35): Grand Mosque Pavilion */}
      <FullMosquePavilion position={[-28, 0, -35]} />

      {/* LEVEL 2 MILESTONE (Z = -115): Second Mosque Pavilion */}
      <FullMosquePavilion position={[28, 0, -115]} />

      {/* LEVEL 3 MILESTONE (Z = -195): Third Grand Mosque Pavilion */}
      <FullMosquePavilion position={[-28, 0, -195]} />

      {/* Elegant Warm Roadside Lantern Lights every 28m */}
      {Array.from({ length: 10 }).map((_, idx) => {
        const z = -idx * 28;
        return (
          <group key={idx} position={[0, 0, z]}>
            {/* Left Street Lamp */}
            <group position={[-3.8, 0, 0]}>
              <mesh position={[0, 1.4, 0]}>
                <cylinderGeometry args={[0.06, 0.08, 2.8, 8]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
              <mesh position={[0, 2.9, 0]}>
                <sphereGeometry args={[0.22, 12, 12]} />
                <meshStandardMaterial color="#fef08a" roughness={0.1} />
              </mesh>
              <pointLight position={[0, 2.9, 0]} intensity={1.2} color="#fef08a" distance={8} />
            </group>

            {/* Right Street Lamp */}
            <group position={[3.8, 0, 0]}>
              <mesh position={[0, 1.4, 0]}>
                <cylinderGeometry args={[0.06, 0.08, 2.8, 8]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
              <mesh position={[0, 2.9, 0]}>
                <sphereGeometry args={[0.22, 12, 12]} />
                <meshStandardMaterial color="#fef08a" roughness={0.1} />
              </mesh>
              <pointLight position={[0, 2.9, 0]} intensity={1.2} color="#fef08a" distance={8} />
            </group>
          </group>
        );
      })}
    </group>
  );
}
