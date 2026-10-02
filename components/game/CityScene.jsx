"use client";

import React, { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { EndlessRoadWorld } from "./EndlessRoadWorld";
import { HorizonSun } from "./HorizonSun";
import { useGame } from "@/context/GameContext";

/**
 * Calculates continuous Z position along the road based on cumulative global scenario index across all levels.
 * Level 1: 0-4  => Z: -10 to -70
 * Level 2: 5-9  => Z: -85 to -145
 * Level 3: 10-14=> Z: -160 to -220
 */
export function getRoadZForScenario(scenarioIndex = 0, level = 1) {
  const globalIndex = Math.max(0, (level - 1) * 5 + scenarioIndex);
  return -10 - globalIndex * 15;
}

function ContinuousWalkingCamera() {
  const { state } = useGame();
  const cameraZRef = useRef(10);

  useFrame((rState, delta) => {
    const t = rState.clock.getElapsedTime();
    const scenarioIdx = state.currentScenarioIndex || 0;
    const level = state.currentLevel || 1;
    const isWalking = state.phase === "loading_scenario" || state.phase === "scene_intro";

    // Dynamic FOV scaling for vertical Reel / mobile 9:16 aspect ratios
    const { width, height } = rState.size;
    const aspect = width / height;
    if (aspect < 1.0) {
      rState.camera.fov = Math.min(68, Math.max(52, 50 / aspect));
    } else {
      rState.camera.fov = 50;
    }
    rState.camera.updateProjectionMatrix();

    const targetZ = state.phase === "idle" ? 10 : getRoadZForScenario(scenarioIdx, level);
    const walkSpeed = isWalking ? 2.5 : 4.0;
    cameraZRef.current += (targetZ - cameraZRef.current) * Math.min(1, delta * walkSpeed);

    const currentZ = cameraZRef.current;
    const distanceToTarget = Math.abs(currentZ - targetZ);

    const isMoving = distanceToTarget > 0.1;
    const bob = isMoving ? Math.sin(t * 7) * 0.06 : Math.sin(t * 1.5) * 0.02;

    rState.camera.position.x = 0;
    rState.camera.position.y = 2.4 + bob;
    rState.camera.position.z = currentZ + 6.0;

    rState.camera.lookAt(0, 1.5, currentZ - 4.0);
  });

  return null;
}

export function CityScene() {
  const { state } = useGame();
  const scenarioIdx = state.currentScenarioIndex || 0;
  const level = state.currentLevel || 1;
  const milestoneZ = getRoadZForScenario(scenarioIdx, level);

  return (
    <div className="game-canvas">
      <Canvas
        camera={{ position: [0, 2.4, 15], fov: 50 }}
        dpr={typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio) : 1}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        {/* Physical Atmospheric Sky Model Aligned with Right-Side Horizon Sun */}
        <Sky
          distance={450000}
          sunPosition={[80, 32, -350]}
          inclination={0.5}
          azimuth={0.25}
          turbidity={4}
          rayleigh={1.6}
          mieCoefficient={0.005}
          mieDirectionalG={0.85}
        />

        {/* 3D Horizon Sun Disk on Right Side */}
        <HorizonSun />

        <ContinuousWalkingCamera />
        <Suspense fallback={null}>
          <EndlessRoadWorld />
        </Suspense>

        {/* Golden Ring on Road at Active Milestone */}
        {state.phase !== "idle" && (
          <group position={[0, 0, milestoneZ]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry args={[1.5, 1.8, 32]} />
              <meshBasicMaterial color="#fceabb" transparent opacity={0.85} />
            </mesh>
            <pointLight position={[0, 1, 0]} intensity={3} color="#fceabb" distance={10} />
          </group>
        )}
      </Canvas>
    </div>
  );
}
