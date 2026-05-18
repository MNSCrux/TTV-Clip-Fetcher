'use client';

import { useCallback, useEffect, useState } from 'react';
import { LoadingIndicator } from '@/components/loading-indicator';

interface Streamer {
  id: number;
  handle: string;
  active: boolean;
}

interface StreamerList {
  id: number;
  name: string;
  is_active: boolean;
}

const SELECTED_LIST_STORAGE_KEY = 'selectedStreamerListId';
const STREAMER_LISTS_CACHE_KEY = 'streamerLists';
const STREAMERS_CACHE_PREFIX = 'streamers:list:';

export default function StreamersPage() {
  const [streamerLists, setStreamerLists] = useState<StreamerList[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [message, setMessage] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isLoadingStreamers, setIsLoadingStreamers] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const cacheStreamers = useCallback((listId: number, rows: Streamer[]) => {
    window.sessionStorage.setItem(`${STREAMERS_CACHE_PREFIX}${listId}`, JSON.stringify(rows));
  }, []);

  const loadLists = useCallback(async () => {
    setIsLoadingLists(true);
    try {
      const res = await fetch('/api/streamer-lists');
      const data = await res.json();
      const lists = Array.isArray(data) ? data : [];
      setStreamerLists(lists);
      window.sessionStorage.setItem(STREAMER_LISTS_CACHE_KEY, JSON.stringify(lists));
      setSelectedListId((current) => {
        if (current && lists.some((list: StreamerList) => list.id === current)) {
          return current;
        }
        const stored = Number(window.localStorage.getItem(SELECTED_LIST_STORAGE_KEY));
        if (stored && lists.some((list: StreamerList) => list.id === stored)) {
          return stored;
        }
        const active = lists.find((list: StreamerList) => list.is_active);
        return active?.id ?? lists[0]?.id ?? null;
      });
    } finally {
      setIsLoadingLists(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!selectedListId) {
      setStreamers([]);
      return;
    }
    setIsLoadingStreamers(true);
    try {
      const res = await fetch(`/api/streamers?listId=${selectedListId}`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      setStreamers(rows);
      cacheStreamers(selectedListId, rows);
    } finally {
      setIsLoadingStreamers(false);
    }
  }, [cacheStreamers, selectedListId]);

  useEffect(() => {
    const cachedLists = window.sessionStorage.getItem(STREAMER_LISTS_CACHE_KEY);
    if (cachedLists) {
      const lists = JSON.parse(cachedLists) as StreamerList[];
      setStreamerLists(lists);
      const stored = Number(window.localStorage.getItem(SELECTED_LIST_STORAGE_KEY));
      const active = lists.find((list) => list.is_active);
      setSelectedListId(
        stored && lists.some((list) => list.id === stored)
          ? stored
          : active?.id ?? lists[0]?.id ?? null
      );
      setIsLoadingLists(false);
    }
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (selectedListId) {
      const cachedRows = window.sessionStorage.getItem(`${STREAMERS_CACHE_PREFIX}${selectedListId}`);
      if (cachedRows) {
        setStreamers(JSON.parse(cachedRows) as Streamer[]);
      }
    }
    load();
  }, [load]);

  useEffect(() => {
    if (selectedListId) {
      window.localStorage.setItem(SELECTED_LIST_STORAGE_KEY, String(selectedListId));
    }
  }, [selectedListId]);

  const addStreamer = async () => {
    if (!selectedListId) return;
    setIsMutating(true);
    try {
      const res = await fetch('/api/streamers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: draft, listId: selectedListId }),
      });
      const data = await res.json();
      if (!res.ok) return setMessage(data.error || 'Failed to add streamer');
      setDraft('');
      setMessage(`Saved ${data.handle}`);
      load();
    } finally {
      setIsMutating(false);
    }
  };

  const importCsv = async () => {
    if (!selectedListId || !csvFile || isImporting) return;
    const form = new FormData();
    form.append('file', csvFile);
    form.append('mode', mode);
    form.append('listId', String(selectedListId));
    setIsImporting(true);
    setMessage(`Importing ${csvFile.name}...`);
    try {
      const res = await fetch('/api/streamers', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.errors?.join('; ') || data.error || 'Import failed');
      } else {
        setMessage(`${mode === 'replace' ? 'Replaced with' : 'Imported'} ${data.imported} handles`);
        setCsvFile(null);
        load();
      }
    } finally {
      setIsImporting(false);
    }
  };

  const toggleActive = async (streamer: Streamer) => {
    if (!selectedListId) return;
    await fetch(`/api/streamers/${streamer.id}?listId=${selectedListId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !streamer.active, listId: selectedListId }),
    });
    setStreamers((current) => {
      const next = current.map((item) =>
        item.id === streamer.id ? { ...item, active: !item.active } : item
      );
      cacheStreamers(selectedListId, next);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (!selectedListId || !selectedIds.size) return;
    if (!window.confirm(`Delete ${selectedIds.size} streamer(s) from this list?`)) return;
    setIsMutating(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/streamers/${id}?listId=${selectedListId}`, { method: 'DELETE' })
        )
      );
      setSelectedIds(new Set());
      load();
    } finally {
      setIsMutating(false);
    }
  };

  const createList = async () => {
    const name = window.prompt('New list name');
    if (!name?.trim()) return;
    const res = await fetch('/api/streamer-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Failed to create list');
      return;
    }
    setSelectedListId(data.id);
    await loadLists();
    setMessage(`Created list "${data.name}"`);
  };

  const setActiveList = async () => {
    if (!selectedListId) return;
    const res = await fetch(`/api/streamer-lists/${selectedListId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || 'Failed to set active list');
      return;
    }
    await loadLists();
    setMessage('Active list updated');
  };

  const deleteList = async () => {
    if (!selectedListId || !selectedList) return;
    if (!window.confirm(`Delete list "${selectedList.name}"?`)) return;
    const res = await fetch(`/api/streamer-lists/${selectedListId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Failed to delete list');
      return;
    }
    window.localStorage.removeItem(SELECTED_LIST_STORAGE_KEY);
    setSelectedListId(null);
    await loadLists();
    setMessage(`Deleted list "${selectedList.name}"`);
  };

  const selectedList = streamerLists.find((list) => list.id === selectedListId);
  const activeList = streamerLists.find((list) => list.is_active);

  return (
    <div>
      <h1 className="text-4xl font-bold mb-6">Streamers</h1>
      {message && <div className="card mb-4 bg-blue-900 text-blue-100">{message}</div>}
      {(isLoadingLists || isLoadingStreamers || isMutating) && (
        <div className="mb-4">
          <LoadingIndicator
            compact
            label={
              isLoadingLists
                ? 'Loading lists'
                : isLoadingStreamers
                  ? 'Refreshing streamers'
                  : 'Saving changes'
            }
          />
        </div>
      )}

      <div className="card mb-6 flex flex-wrap gap-3 items-end">
        <div className="min-w-48">
          <label className="label">Streamer List</label>
          <select
            className="input min-w-48"
            value={selectedListId ?? ''}
            onChange={(e) => setSelectedListId(Number(e.target.value))}
            disabled={isLoadingLists || isMutating}
          >
            {streamerLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
                {list.is_active ? ' (active)' : ''}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" onClick={createList}>New List</button>
        <button
          className="btn btn-secondary"
          onClick={setActiveList}
          disabled={!selectedListId || selectedList?.is_active}
        >
          Set as Active
        </button>
        <button
          className="btn btn-danger"
          onClick={deleteList}
          disabled={!selectedListId || streamerLists.length <= 1}
        >
          Delete List
        </button>
        {activeList && (
          <span className="text-sm text-green-400 self-center">
            Active: {activeList.name}
          </span>
        )}
        {selectedList && !selectedList.is_active && (
          <span className="text-sm text-slate-400 self-center">
            Viewing: {selectedList.name}
          </span>
        )}
      </div>

      <div className="card mb-6 flex flex-wrap gap-3 items-end">
        <div className="min-w-64 flex-1">
          <label className="label">Handle</label>
          <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="zizaran" />
        </div>
        <button className="btn btn-primary" onClick={addStreamer} disabled={!selectedListId || isMutating}>
          Add Streamer
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">CSV Import Mode</label>
          <select
            className="input min-w-40"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'append' | 'replace')}
            disabled={isImporting}
          >
            <option value="append">Add / merge</option>
            <option value="replace">Replace list</option>
          </select>
        </div>
        <div className="max-w-md">
          <label className="label">Import CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            className="input"
            disabled={!selectedListId || isImporting}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={importCsv}
          disabled={!selectedListId || !csvFile || isImporting}
        >
          {isImporting ? 'Importing...' : 'Import CSV'}
        </button>
        <button className="btn btn-danger" onClick={deleteSelected} disabled={!selectedIds.size || isMutating}>
          Delete Selected
        </button>
      </div>
      {csvFile && !isImporting && (
        <div className="mb-4 text-sm text-slate-400">
          Ready: {csvFile.name}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-700">
            <tr>
              <th className="w-10 px-4 py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.size === streamers.length && streamers.length > 0}
                  onChange={(e) =>
                    setSelectedIds(e.target.checked ? new Set(streamers.map((s) => s.id)) : new Set())
                  }
                />
              </th>
              <th className="px-4 py-2 text-left">Handle</th>
              <th className="px-4 py-2 text-left">Fetch</th>
            </tr>
          </thead>
          <tbody>
            {streamers.length === 0 && isLoadingStreamers && (
              <tr>
                <td colSpan={3} className="px-4 py-6">
                  <LoadingIndicator label="Loading streamers" />
                </td>
              </tr>
            )}
            {streamers.map((streamer) => (
              <tr key={streamer.id} className="border-b border-slate-700">
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(streamer.id)}
                    onChange={(e) => {
                      const next = new Set(selectedIds);
                      e.target.checked ? next.add(streamer.id) : next.delete(streamer.id);
                      setSelectedIds(next);
                    }}
                  />
                </td>
                <td className="px-4 py-2 font-mono text-yellow-400">{streamer.handle}</td>
                <td className="px-4 py-2">
                  <input type="checkbox" checked={streamer.active} onChange={() => toggleActive(streamer)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
