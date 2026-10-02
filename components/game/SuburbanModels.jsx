"use client";

import React, { useMemo } from "react";
import { useGLTF } from "@react-three/drei";

const BASE_PATH = "/models/cityKitSuburban";

const MODEL_NAMES = [
  "driveway_long",
  "driveway_short",
  "fence_large",
  "fence_medium",
  "fence_open",
  "fence_rectangle",
  "fence_short",
  "fence_small",
  "fence_wide",
  "house_type01",
  "house_type02",
  "house_type03",
  "house_type04",
  "house_type05",
  "house_type06",
  "house_type07",
  "house_type08",
  "house_type09",
  "house_type10",
  "house_type11",
  "house_type12",
  "house_type13",
  "house_type14",
  "house_type15",
  "house_type16",
  "house_type17",
  "house_type18",
  "house_type19",
  "house_type20",
  "house_type21",
  "path_long",
  "path_short",
  "path_tilesLong",
  "path_tilesShort",
  "tree_large",
  "tree_small",
];

// Preload all 36 Kenney Suburban models
MODEL_NAMES.forEach((name) => {
  useGLTF.preload(`${BASE_PATH}/${name}.glb`);
});

/**
 * Generic Kenney Model Component
 */
function KenneyModel({ name, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }) {
  const { scene } = useGLTF(`${BASE_PATH}/${name}.glb`);
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const cloned = scene.clone(true);
    // Ensure materials & shadows are properly setup
    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  if (!clonedScene) return null;

  return (
    <primitive
      object={clonedScene}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

export function SuburbanHouse({ type = "house_type01", position, rotation, scale = [1.8, 1.8, 1.8] }) {
  const modelName = typeof type === "number" ? `house_type${String(type).padStart(2, "0")}` : type;
  return <KenneyModel name={modelName} position={position} rotation={rotation} scale={scale} />;
}

export function SuburbanRoadTile({ type = "path_long", position, rotation, scale = [2, 2, 2] }) {
  return <KenneyModel name={type} position={position} rotation={rotation} scale={scale} />;
}

export function SuburbanDriveway({ type = "driveway_long", position, rotation, scale = [1.8, 1.8, 1.8] }) {
  return <KenneyModel name={type} position={position} rotation={rotation} scale={scale} />;
}

export function SuburbanFence({ type = "fence_large", position, rotation, scale = [1.8, 1.8, 1.8] }) {
  return <KenneyModel name={type} position={position} rotation={rotation} scale={scale} />;
}

export function SuburbanTree({ type = "tree_large", position, rotation, scale = [2.2, 2.2, 2.2] }) {
  return <KenneyModel name={type} position={position} rotation={rotation} scale={scale} />;
}
