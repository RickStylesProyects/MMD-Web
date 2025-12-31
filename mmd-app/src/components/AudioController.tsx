import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export function AudioController() {
  const { animationState, audioState } = useStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize/Update audio source
  useEffect(() => {
    // Cleanup old audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (audioState.url) {
      const audio = new Audio(audioState.url);
      audio.volume = audioState.volume;
      audioRef.current = audio;
      console.log("🎵 Audio Loaded:", audioState.url);
    }
  }, [audioState.url]);

  // Update Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioState.volume;
    }
  }, [audioState.volume]);

  // Sync Playback State
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const targetTime = Math.max(0, animationState.currentTime - audioState.delay);

    if (animationState.isPlaying) {
      // If delay is positive, and we haven't reached it, ensure audio is paused/at start?
      // Or just play silence? HTML Audio doesn't allow 'negative time' or 'pre-play'.
      // If animationTime < delay, we should wait.
      if (animationState.currentTime < audioState.delay) {
        if (!audio.paused) audio.pause();
        audio.currentTime = 0;
        return;
      }

      // If audio is paused but should be playing, play it
      if (audio.paused) {
        audio.currentTime = targetTime;
        audio.play().catch(e => console.warn("Audio play failed:", e));
      } else {
        // Sync time if drifted too much (> 0.2s)
        const diff = Math.abs(audio.currentTime - targetTime);
        if (diff > 0.2) {
           // Only sync if significant drift to avoid stuttering
           // But check if it's loop restart
           if (Math.abs(animationState.currentTime - audio.currentTime) > 1.0) { // Checking raw time vs calculated might be tricky on loop
             audio.currentTime = targetTime;
           }
           else {
             audio.currentTime = targetTime;
           }
        }
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
      // When paused, force sync time exactly so scrub works
      if (Math.abs(audio.currentTime - targetTime) > 0.1) {
        audio.currentTime = targetTime;
      }
    }
  }, [animationState.isPlaying, animationState.currentTime, audioState.delay]);

  // Handle seeking manually
  // We rely on the effect above: when user scrubs, isPlaying becomes false/true and currentTime updates.

  return null;
}
