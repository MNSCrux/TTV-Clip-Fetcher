'use client';

import { useCallback, useEffect, useState } from 'react';

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

export default function StreamersPage() {
  const [streamerLists, setStreamerLists] = useState<StreamerList[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [message, setMessage] = useState('');

  const loadLists = useCallback(async () => {
    const res = await fetch('/api/streamer-lists');
    const data = await res.json();
    const lists = Array.isArray(data) ? data : [];
    setStreamerLists(lists);
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
  }, []);

  const load = useCallback(async () => {
    if (!selectedListId) {
      setStreamers([]);
      return;
    }
    const res = await fetch(`/api/streamers?listId=${selectedListId}`);
    const data = await res.json();
    setStreamers(Array.isArray(data) ? data : []);
  }, [selectedListId]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedListId) {
      window.localStorage.setItem(SELECTED_LIST_STORAGE_KEY, String(selectedListId));
    }
  }, [selectedListId]);

  const addStreamer = async () => {
    if (!selectedListId) return;
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
  };

  const importCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedListId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('mode', mode);
    form.append('listId', String(selectedListId));
    const res = await fetch('/api/streamers', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.errors?.join('; ') || data.error || 'Import failed');
    } else {
      setMessage(`${mode === 'replace' ? 'Replaced with' : 'Imported'} ${data.imported} handles`);
      load();
    }
    e.target.value = '';
  };

  const toggleActive = async (streamer: Streamer) => {
    if (!selectedListId) return;
    await fetch(`/api/streamers/${streamer.id}?listId=${selectedListId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !streamer.active, listId: selectedListId }),
    });
    setStreamers((current) =>
      current.map((item) =>
        item.id === streamer.id ? { ...item, active: !item.active } : item
      )
    );
  };

  const deleteSelected = async () => {
    if (!selectedListId || !selectedIds.size) return;
    if (!window.confirm(`Delete ${selectedIds.size} streamer(s) from this list?`)) return;
    await Promise.all(
      [...selectedIds].map((id) =>
        fetch(`/api/streamers/${id}?listId=${selectedListId}`, { method: 'DELETE' })
      )
    );
    setSelectedIds(new Set());
    load();
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

      <div className="card mb-6 flex flex-wrap gap-3 items-end">
        <div className="min-w-48">
          <label className="label">Streamer List</label>
          <select
            className="input min-w-48"
            value={selectedListId ?? ''}
            onChange={(e) => setSelectedListId(Number(e.target.value))}
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
        <button className="btn btn-primary" onClick={addStreamer} disabled={!selectedListId}>
          Add Streamer
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">CSV Import Mode</label>
          <select className="input min-w-40" value={mode} onChange={(e) => setMode(e.target.value as 'append' | 'replace')}>
            <option value="append">Add / merge</option>
            <option value="replace">Replace list</option>
          </select>
        </div>
        <div className="max-w-md">
          <label className="label">Import CSV</label>
          <input type="file" accept=".csv" onChange={importCsv} className="input" disabled={!selectedListId} />
        </div>
        <button className="btn btn-danger" onClick={deleteSelected} disabled={!selectedIds.size}>
          Delete Selected
        </button>
      </div>

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
