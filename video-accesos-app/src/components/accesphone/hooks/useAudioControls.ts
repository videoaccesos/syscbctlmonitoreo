'use client';
import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants';

interface AudioState {
  micVolume: number;
  speakerVolume: number;
  ringtoneVolume: number;
}

const DEFAULT_AUDIO: AudioState = {
  micVolume: 50,
  speakerVolume: 75,
  ringtoneVolume: 80,
};

export function useAudioControls() {
  const [micVolume, setMicVolume] = useState(DEFAULT_AUDIO.micVolume);
  const [speakerVolume, setSpeakerVolume] = useState(DEFAULT_AUDIO.speakerVolume);
  const [ringtoneVolume, setRingtoneVolume] = useState(DEFAULT_AUDIO.ringtoneVolume);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIO);
      if (saved) {
        const parsed: AudioState = JSON.parse(saved);
        setMicVolume(parsed.micVolume ?? DEFAULT_AUDIO.micVolume);
        setSpeakerVolume(parsed.speakerVolume ?? DEFAULT_AUDIO.speakerVolume);
        setRingtoneVolume(parsed.ringtoneVolume ?? DEFAULT_AUDIO.ringtoneVolume);
      }
    } catch {}
  }, []);

  const save = useCallback((state: AudioState) => {
    localStorage.setItem(STORAGE_KEYS.AUDIO, JSON.stringify(state));
  }, []);

  const updateMicVolume = useCallback((v: number) => {
    setMicVolume(v);
    save({ micVolume: v, speakerVolume, ringtoneVolume });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakerVolume, ringtoneVolume, save]);

  const updateSpeakerVolume = useCallback((v: number) => {
    setSpeakerVolume(v);
    save({ micVolume, speakerVolume: v, ringtoneVolume });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micVolume, ringtoneVolume, save]);

  const updateRingtoneVolume = useCallback((v: number) => {
    setRingtoneVolume(v);
    save({ micVolume, speakerVolume, ringtoneVolume: v });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micVolume, speakerVolume, save]);

  return {
    micVolume,
    speakerVolume,
    ringtoneVolume,
    updateMicVolume,
    updateSpeakerVolume,
    updateRingtoneVolume,
  };
}
