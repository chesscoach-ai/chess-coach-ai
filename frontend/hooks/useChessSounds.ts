"use client";

import { useCallback } from "react";

import { useExperiencePreferences } from "@/hooks/useExperiencePreferences";

type ChessSound = {
  capture?: boolean;
  check?: boolean;
  checkmate?: boolean;
};

let audioContext:
  | AudioContext
  | null = null;

export function useChessSounds() {
  const { soundsEnabled } =
    useExperiencePreferences();

  return useCallback(
    (sound: ChessSound = {}) => {
      if (
        !soundsEnabled ||
        typeof window === "undefined"
      ) {
        return;
      }

      const AudioContextClass =
        window.AudioContext;
      audioContext ??=
        new AudioContextClass();
      if (audioContext.state === "suspended") {
        void audioContext.resume();
      }

      const now =
        audioContext.currentTime;
      playWoodImpact(
        audioContext,
        now,
        sound.capture ? 95 : 145,
        sound.capture ? 0.13 : 0.085,
      );

      if (sound.capture) {
        playWoodImpact(
          audioContext,
          now + 0.055,
          72,
          0.12,
        );
      }
      if (sound.check || sound.checkmate) {
        playTone(
          audioContext,
          now + 0.07,
          sound.checkmate ? 520 : 420,
          sound.checkmate ? 0.2 : 0.11,
        );
      }
      if (sound.checkmate) {
        playTone(
          audioContext,
          now + 0.18,
          310,
          0.28,
        );
      }
    },
    [soundsEnabled],
  );
}

function playWoodImpact(
  context: AudioContext,
  start: number,
  frequency: number,
  duration: number,
): void {
  const oscillator =
    context.createOscillator();
  const gain = context.createGain();
  const filter =
    context.createBiquadFilter();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(
    frequency,
    start,
  );
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(45, frequency * 0.55),
    start + duration,
  );
  filter.type = "lowpass";
  filter.frequency.value = 900;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(
    0.18,
    start + 0.006,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    start + duration,
  );
  oscillator
    .connect(filter)
    .connect(gain)
    .connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function playTone(
  context: AudioContext,
  start: number,
  frequency: number,
  duration: number,
): void {
  const oscillator =
    context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(
    0.075,
    start + 0.01,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    start + duration,
  );
  oscillator
    .connect(gain)
    .connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}
