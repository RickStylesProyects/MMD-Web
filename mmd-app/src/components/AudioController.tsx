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

    if (animationState.isPlaying) {
      // If audio is paused but should be playing, play it
      if (audio.paused) {
        audio.currentTime = animationState.currentTime;
        audio.play().catch(e => console.warn("Audio play failed (interaction needed?):", e));
      } else {
        // Sync time if drifted too much (> 0.2s)
        const diff = Math.abs(audio.currentTime - animationState.currentTime);
        if (diff > 0.2) {
           // Only sync if significant drift to avoid stuttering
           // But check if it's loop restart (time ~ 0)
           if (Math.abs(animationState.currentTime - audio.currentTime) > 1.0) {
             audio.currentTime = animationState.currentTime;
           }
        }
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
      // When paused, force sync time exactly so scrub works
      if (Math.abs(audio.currentTime - animationState.currentTime) > 0.1) {
        audio.currentTime = animationState.currentTime;
      }
    }
  }, [animationState.isPlaying, animationState.currentTime]);

  // Handle seeking manually
  // We rely on the effect above: when user scrubs, isPlaying becomes false/true and currentTime updates.

  return null;
}
