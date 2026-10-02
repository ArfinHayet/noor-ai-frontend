"use client";

import React, { useMemo } from "react";
import { SuburbanTree, SuburbanRoadTile } from "./SuburbanModels";

/**
 * OrganicTreesAndHills Component
 * Places real 3D GLTF trees and stepping tiles along the entire length of the suburban city (Z = +25 down to Z = -260).
 */
export function OrganicTreesAndHills() {
  // Real 3D Tree positions along left and right nature borders
  const treePositions = useMemo(() => {
    const trees = [];

    // Left nature tree line (X approx -18 to -24)
    for (let z = 25; z >= -260; z -= 7) {
      trees.push({
        id: `left-tree-${z}`,
        type: z % 2 === 0 ? "tree_large" : "tree_small",
        pos: [-18 - (Math.abs(z) % 4) * 0.8, 0, z],
        rot: [0, (z % 6) * 0.5, 0],
        scale: z % 2 === 0 ? [2.4, 2.4, 2.4] : [2.0, 2.0, 2.0],
      });
    }

    // Right nature tree line (X approx 18 to 24)
    for (let z = 22; z >= -260; z -= 6.5) {
      trees.push({
        id: `right-tree-${z}`,
        type: z % 3 === 0 ? "tree_large" : "tree_small",
        pos: [18 + (Math.abs(z) % 4) * 0.8, 0, z],
        rot: [0, (z % 5) * 0.7, 0],
        scale: z % 3 === 0 ? [2.6, 2.6, 2.6] : [2.1, 2.1, 2.1],
      });
    }

    return trees;
  }, []);

  // Stepping stones path built with real 3D Kenney tile models
  const steppingStonesZ = useMemo(() => {
    const stones = [];
    for (let z = -8; z >= -250; z -= 10) {
      stones.push(z);
    }
    return stones;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* Real 3D Stepping Stone Path Tile Models along Meadow */}
      {steppingStonesZ.map((z, i) => (
        <SuburbanRoadTile
          key={`stone-${i}`}
          type="path_tilesShort"
          position={[-6.2 - Math.sin(i) * 0.4, 0.02, z]}
          rotation={[0, i * 0.3, 0]}
          scale={[0.8, 1.0, 0.8]}
        />
      ))}

      {/* Real 3D Kenney Suburban Trees */}
      {treePositions.map((t) => (
        <SuburbanTree
          key={t.id}
          type={t.type}
          position={t.pos}
          rotation={t.rot}
          scale={t.scale}
        />
      ))}
    </group>
  );
}
