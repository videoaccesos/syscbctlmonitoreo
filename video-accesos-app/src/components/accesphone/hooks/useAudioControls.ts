"use client";

import { useState, useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Params & Return types
// ---------------------------------------------------------------------------

export interface UseAudioControlsParams {
  remoteAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  ringtoneRef: React.MutableRefObject<HTMLAudioElement | null>;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
}

export interface UseAudioControlsReturn {
  speakerOn: boolean;
  toggleSpeaker: () => void;
  micVolume: number;
  updateMicVolume: (val: number) => void;
  speakerVolume: number;
  updateSpeakerVolume: (val: number) => void;
  ringtoneVolume: number;
  updateRingtoneVolume: (val: number) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAudioControls({
  remoteAudioRef,
  ringtoneRef,
  localStreamRef,
}: UseAudioControlsParams): UseAudioControlsReturn {
  const [speakerOn, setSpeakerOn] = useState(true);
  const [micVolume, setMicVolume] = useState(50);
  const [speakerVolume, setSpeakerVolume] = useState(75);
  const [ringtoneVolume, setRingtoneVolume] = useState(80);

  /** Toggle speaker */
  const toggleSpeaker = useCallback(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = speakerOn;
    }
    setSpeakerOn(!speakerOn);
  }, [speakerOn, remoteAudioRef]);

  /** Update mic volume */
  const updateMicVolume = useCallback((val: number) => {
    setMicVolume(val);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        // Apply gain via track enabled (0 = mute)
        t.enabled = val > 0;
      });
    }
  }, [localStreamRef]);

  /** Update speaker volume */
  const updateSpeakerVolume = useCallback((val: number) => {
    setSpeakerVolume(val);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = val / 100;
    }
  }, [remoteAudioRef]);

  /** Update ringtone volume */
  const updateRingtoneVolume = useCallback((val: number) => {
    setRingtoneVolume(val);
    if (ringtoneRef.current) {
      ringtoneRef.current.volume = val / 100;
    }
  }, [ringtoneRef]);

  // Apply initial ringtone volume
  useEffect(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.volume = ringtoneVolume / 100;
    }
  }, [ringtoneRef, ringtoneVolume]);

  return {
    speakerOn,
    toggleSpeaker,
    micVolume,
    updateMicVolume,
    speakerVolume,
    updateSpeakerVolume,
    ringtoneVolume,
    updateRingtoneVolume,
  };
}
