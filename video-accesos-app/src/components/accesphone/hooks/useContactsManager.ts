'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Contact } from '../types';
import { STORAGE_KEYS } from '../constants';

const DEFAULT_CONTACTS: Contact[] = [
  { id: 1, name: 'Soporte Tecnico', number: '101', type: 'normal' },
  { id: 2, name: 'Recepcion', number: '100', type: 'normal' },
];

export function useContactsManager() {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        setContacts(parsed.length > 0 ? parsed : DEFAULT_CONTACTS);
      } else {
        setContacts(DEFAULT_CONTACTS);
      }
    } catch {
      setContacts(DEFAULT_CONTACTS);
    }
  }, []);

  const save = useCallback((list: Contact[]) => {
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(list));
  }, []);

  const addContact = useCallback((contact: Omit<Contact, 'id'>) => {
    setContacts(prev => {
      const updated = [...prev, { ...contact, id: Date.now() }];
      save(updated);
      return updated;
    });
  }, [save]);

  const updateContact = useCallback((id: number, data: Partial<Contact>) => {
    setContacts(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...data } : c);
      save(updated);
      return updated;
    });
  }, [save]);

  const deleteContact = useCallback((id: number) => {
    setContacts(prev => {
      const updated = prev.filter(c => c.id !== id);
      save(updated);
      return updated;
    });
  }, [save]);

  const searchContacts = useCallback((query: string) => {
    const q = query.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) || c.number.includes(q)
    );
  }, [contacts]);

  const getContactByNumber = useCallback((number: string) => {
    return contacts.find(c => c.number === number);
  }, [contacts]);

  return {
    contacts,
    addContact,
    updateContact,
    deleteContact,
    searchContacts,
    getContactByNumber,
  };
}
