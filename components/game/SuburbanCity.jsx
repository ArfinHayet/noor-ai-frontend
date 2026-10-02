"use client";

import React, { useMemo } from "react";
import {
  SuburbanHouse,
  SuburbanRoadTile,
  SuburbanDriveway,
  SuburbanFence,
  SuburbanTree,
} from "./SuburbanModels";

/**
 * SuburbanCity Component
 * Dense, multi-layered 3D Suburban City & Road Boulevard spanning continuously from Z = +30 down to Z = -260.
 * Fills all empty side spaces with multiple rows of suburban homes, backyards, fences, side paths, and tree groves.
 */
export function SuburbanCity() {
  // Generate road tiles along the main boulevard (Z = +30 down to Z = -260)
  const roadTiles = useMemo(() => {
    const tiles = [];
    const step = 6.0;
    for (let z = 30; z >= -260; z -= step) {
      tiles.push(z);
    }
    return tiles;
  }, []);

  // Multi-row suburban house plots & backyard configurations
  const suburbanLots = useMemo(() => {
    const houseTypes = Array.from({ length: 21 }, (_, i) => `house_type${String(i + 1).padStart(2, "0")}`);
    const fenceTypes = ["fence_large", "fence_medium", "fence_rectangle", "fence_wide", "fence_short", "fence_open"];
    const lots = [];

    let count = 0;

    // ── ROW 1: Fronting Main Avenue (X = -8.5 & X = 8.5) ──────────────────
    for (let z = 22; z >= -255; z -= 8.5) {
      // Left house
      lots.push({
        id: `r1-left-${count}`,
        houseType: houseTypes[count % houseTypes.length],
        housePos: [-8.5, 0, z],
        houseRot: [0, Math.PI / 2, 0],
        drivewayPos: [-5.2, 0.02, z],
        drivewayRot: [0, 0, 0],
        drivewayType: count % 2 === 0 ? "driveway_long" : "driveway_short",
        fenceType: fenceTypes[count % fenceTypes.length],
        fencePos: [-11.5, 0, z],
        fenceRot: [0, Math.PI / 2, 0],
        trees: [
          { type: count % 2 === 0 ? "tree_large" : "tree_small", pos: [-10.5, 0, z - 2.8] },
        ],
      });

      // Right house
      const rIdx = (count + 7) % houseTypes.length;
      lots.push({
        id: `r1-right-${count}`,
        houseType: houseTypes[rIdx],
        housePos: [8.5, 0, z],
        houseRot: [0, -Math.PI / 2, 0],
        drivewayPos: [5.2, 0.02, z],
        drivewayRot: [0, 0, 0],
        drivewayType: count % 2 === 0 ? "driveway_short" : "driveway_long",
        fenceType: fenceTypes[(count + 3) % fenceTypes.length],
        fencePos: [11.5, 0, z],
        fenceRot: [0, -Math.PI / 2, 0],
        trees: [
          { type: count % 2 === 0 ? "tree_small" : "tree_large", pos: [10.5, 0, z + 2.8] },
        ],
      });

      count++;
    }

    // ── ROW 2: Mid-Neighborhood Suburb (X = -16.5 & X = 16.5) ─────────────
    let count2 = 0;
    for (let z = 18; z >= -255; z -= 9.5) {
      const lType = houseTypes[(count2 + 3) % houseTypes.length];
      lots.push({
        id: `r2-left-${count2}`,
        houseType: lType,
        housePos: [-16.5, 0, z],
        houseRot: [0, Math.PI / 2, 0],
        drivewayPos: [-13.2, 0.02, z],
        drivewayRot: [0, 0, 0],
        drivewayType: "driveway_short",
        fenceType: fenceTypes[count2 % fenceTypes.length],
        fencePos: [-19.5, 0, z],
        fenceRot: [0, Math.PI / 2, 0],
        trees: [
          { type: "tree_large", pos: [-18.5, 0, z - 3.2] },
          { type: "tree_small", pos: [-14.5, 0, z + 3.0] },
        ],
      });

      const rType = houseTypes[(count2 + 11) % houseTypes.length];
      lots.push({
        id: `r2-right-${count2}`,
        houseType: rType,
        housePos: [16.5, 0, z],
        houseRot: [0, -Math.PI / 2, 0],
        drivewayPos: [13.2, 0.02, z],
        drivewayRot: [0, 0, 0],
        drivewayType: "driveway_long",
        fenceType: fenceTypes[(count2 + 2) % fenceTypes.length],
        fencePos: [19.5, 0, z],
        fenceRot: [0, -Math.PI / 2, 0],
        trees: [
          { type: "tree_small", pos: [18.5, 0, z + 3.2] },
          { type: "tree_large", pos: [14.5, 0, z - 3.0] },
        ],
      });

      count2++;
    }

    // ── ROW 3: Outer Residential Neighborhood (X = -24.5 & X = 24.5) ────────
    let count3 = 0;
    for (let z = 15; z >= -255; z -= 11) {
      lots.push({
        id: `r3-left-${count3}`,
        houseType: houseTypes[(count3 + 5) % houseTypes.length],
        housePos: [-24.5, 0, z],
        houseRot: [0, Math.PI / 2, 0],
        fenceType: fenceTypes[count3 % fenceTypes.length],
        fencePos: [-27.5, 0, z],
        fenceRot: [0, Math.PI / 2, 0],
        trees: [{ type: "tree_large", pos: [-26.0, 0, z] }],
      });

      lots.push({
        id: `r3-right-${count3}`,
        houseType: houseTypes[(count3 + 14) % houseTypes.length],
        housePos: [24.5, 0, z],
        houseRot: [0, -Math.PI / 2, 0],
        fenceType: fenceTypes[(count3 + 4) % fenceTypes.length],
        fencePos: [27.5, 0, z],
        fenceRot: [0, -Math.PI / 2, 0],
        trees: [{ type: "tree_large", pos: [26.0, 0, z] }],
      });

      count3++;
    }

    return lots;
  }, []);

  // Dense outer tree groves to cover all remaining side spaces
  const outerTreeGroves = useMemo(() => {
    const groves = [];
    let id = 0;
    for (let z = 25; z >= -260; z -= 6) {
      // Far left groves (X = -31 to -42)
      groves.push({ id: `grove-l1-${id}`, pos: [-31, 0, z], type: id % 2 === 0 ? "tree_large" : "tree_small" });
      groves.push({ id: `grove-l2-${id}`, pos: [-37, 0, z - 2.5], type: id % 3 === 0 ? "tree_large" : "tree_small" });

      // Far right groves (X = 31 to 42)
      groves.push({ id: `grove-r1-${id}`, pos: [31, 0, z], type: id % 2 === 0 ? "tree_small" : "tree_large" });
      groves.push({ id: `grove-r2-${id}`, pos: [37, 0, z + 2.5], type: id % 3 === 0 ? "tree_small" : "tree_large" });

      id++;
    }
    return groves;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      {/* Dark Charcoal Asphalt Paved Street Deck */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -115]} receiveShadow>
        <planeGeometry args={[5.2, 310]} />
        <meshStandardMaterial color="#2d3748" roughness={0.75} />
      </mesh>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CENTRAL 3D ROAD NETWORK (Kenney Suburban Path Models)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <group position={[0, 0.02, 0]}>
        {roadTiles.map((z, idx) => (
          <React.Fragment key={idx}>
            {/* Center Road Paving Tiles */}
            <SuburbanRoadTile
              type="path_tilesLong"
              position={[0, 0, z]}
              rotation={[0, 0, 0]}
              scale={[1.5, 1.4, 1.5]}
            />
            {/* Left Curb / Sidewalk Edge */}
            <SuburbanRoadTile
              type="path_long"
              position={[-2.8, 0, z]}
              rotation={[0, 0, 0]}
              scale={[1.0, 1.4, 1.5]}
            />
            {/* Right Curb / Sidewalk Edge */}
            <SuburbanRoadTile
              type="path_long"
              position={[2.8, 0, z]}
              rotation={[0, 0, 0]}
              scale={[1.0, 1.4, 1.5]}
            />
          </React.Fragment>
        ))}
      </group>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DENSE MULTI-ROW SUBURBAN HOUSES, DRIVEWAYS & FENCES           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {suburbanLots.map((lot) => (
        <group key={lot.id}>
          {/* 3D Suburban House */}
          <SuburbanHouse
            type={lot.houseType}
            position={lot.housePos}
            rotation={lot.houseRot}
            scale={[1.8, 1.8, 1.8]}
          />

          {/* Driveway Connection if present */}
          {lot.drivewayPos && (
            <SuburbanDriveway
              type={lot.drivewayType}
              position={lot.drivewayPos}
              rotation={lot.drivewayRot}
              scale={[1.5, 1.5, 1.5]}
            />
          )}

          {/* Backyard / Lot Fence */}
          {lot.fencePos && (
            <SuburbanFence
              type={lot.fenceType}
              position={lot.fencePos}
              rotation={lot.fenceRot}
              scale={[1.5, 1.5, 1.5]}
            />
          )}

          {/* Yard Trees */}
          {lot.trees?.map((tree, tIdx) => (
            <SuburbanTree
              key={tIdx}
              type={tree.type}
              position={tree.pos}
              rotation={[0, tIdx * 1.2, 0]}
              scale={[2.0, 2.0, 2.0]}
            />
          ))}
        </group>
      ))}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DENSE OUTER TREE GROVES (Covering all outer green field voids) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {outerTreeGroves.map((g) => (
        <SuburbanTree
          key={g.id}
          type={g.type}
          position={g.pos}
          rotation={[0, 0.5, 0]}
          scale={[2.2, 2.2, 2.2]}
        />
      ))}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SIDE STREET INTERSECTIONS & BOULEVARD CROSSROADS               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {[-10, -50, -90, -130, -170, -210].map((z, idx) => (
        <group key={`side-street-${idx}`} position={[0, 0.02, z]}>
          {/* East-West Crossroad Tiles extending through rows */}
          {[-22, -16, -10, -5, -3.8, 3.8, 5, 10, 16, 22].map((x, xIdx) => (
            <SuburbanRoadTile
              key={xIdx}
              type="path_short"
              position={[x, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
              scale={[1.5, 1.4, 1.5]}
            />
          ))}
        </group>
      ))}
    </group>
  );
}
