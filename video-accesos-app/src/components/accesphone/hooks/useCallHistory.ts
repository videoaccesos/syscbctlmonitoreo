'use client';
import { useState, useEffect, useCallback } from 'react';
import type { CallHistoryEntry } from '../types';
import { STORAGE_KEYS, MAX_HISTORY_ENTRIES } from '../constants';

export function useCallHistory() {
  const [history, setHistory] = useState<CallHistoryEntry[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const save = useCallback((entries: CallHistoryEntry[]) => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(entries));
  }, []);

  const addEntry = useCallback((entry: Omit<CallHistoryEntry, 'id'>) => {
    setHistory(prev => {
      const newEntry: CallHistoryEntry = { ...entry, id: Date.now() };
      const updated = [newEntry, ...prev].slice(0, MAX_HISTORY_ENTRIES);
      save(updated);
      return updated;
    });
  }, [save]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  }, []);

  return { history, addEntry, clearHistory };
}
