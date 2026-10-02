"use client";

import React, { useEffect } from "react";
import { useGame } from "@/context/GameContext";

export function SituationPanel() {
  const { state, dispatch } = useGame();
  const { currentScenario, phase } = state;

  useEffect(() => {
    if (phase === "scene_intro") {
      const timer = setTimeout(() => {
        dispatch({ type: "INTRO_COMPLETE" });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, dispatch]);

  if (!currentScenario) return null;

  const text = currentScenario.situationText || currentScenario.situation || "";

  return (
    <div className="game-situation-panel">
      <p className="game-situation-text">{text}</p>
    </div>
  );
}
