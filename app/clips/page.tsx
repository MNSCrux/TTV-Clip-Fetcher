'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoadingIndicator } from '@/components/loading-indicator';

interface Clip {
  id: string;
  external_id?: string;
  url: string;
  title: string;
  broadcaster_name: string;
  streamer_handle?: string;
  game_name?: string;
  category_bucket: string;
  view_count: number;
  duration?: number;
  created_at: string;
  thumbnail_url?: string;
}

interface StreamerList {
  id: number;
  name: string;
  is_active: boolean;
}

interface FetchRun {
  id: number;
  started_at: string;
  total_clips_found: number;
  failed_streamers: number;
  status: string;
}

interface FetchRunError {
  id: number;
  handle: string;
  error_message: string;
}

interface FetchRunDetails extends FetchRun {
  errors: FetchRunError[];
}

const SELECTED_LIST_STORAGE_KEY = 'selectedStreamerListId';
const STREAMER_LISTS_CACHE_KEY = 'streamerLists';
const FETCH_RUNS_CACHE_PREFIX = 'fetchRuns:list:';
const FETCH_RUN_DETAILS_CACHE_PREFIX = 'fetchRun:';
const CLIPS_CACHE_PREFIX = 'clips:';

export default function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchDays, setFetchDays] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [minViews, setMinViews] = useState('');
  const [sort, setSort] = useState('most_viewed');
  const [progress, setProgress] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [fetchError, setFetchError] = useState('');
  const [streamerLists, setStreamerLists] = useState<StreamerList[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [fetchRuns, setFetchRuns] = useState<FetchRun[]>([]);
  const [selectedFetchRunId, setSelectedFetchRunId] = useState<number | null>(null);
  const [selectedFetchRunDetails, setSelectedFetchRunDetails] = useState<FetchRunDetails | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const loadLists = useCallback(async () => {
    const cached = window.sessionStorage.getItem(STREAMER_LISTS_CACHE_KEY);
    if (cached) {
      setStreamerLists(JSON.parse(cached) as StreamerList[]);
    }
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
  }, []);

  const loadFetchRunDetails = useCallback(async (fetchRunId: number) => {
    const cacheKey = `${FETCH_RUN_DETAILS_CACHE_PREFIX}${fetchRunId}`;
    const cached = window.sessionStorage.getItem(cacheKey);
    if (cached) {
      setSelectedFetchRunDetails(JSON.parse(cached) as FetchRunDetails);
    }
    const res = await fetch(`/api/fetch-runs/${fetchRunId}`);
    const data = await res.json();
    const details = res.ok ? data : null;
    setSelectedFetchRunDetails(details);
    if (details) {
      window.sessionStorage.setItem(cacheKey, JSON.stringify(details));
    }
  }, []);

  const loadFetchRuns = useCallback(async (listId: number) => {
    const cacheKey = `${FETCH_RUNS_CACHE_PREFIX}${listId}`;
    const cached = window.sessionStorage.getItem(cacheKey);
    if (cached) {
      setFetchRuns(JSON.parse(cached) as FetchRun[]);
    }
    const res = await fetch(`/api/fetch-runs?listId=${listId}`);
    const data = await res.json();
    const runs = Array.isArray(data) ? data : [];
    setFetchRuns(runs);
    window.sessionStorage.setItem(cacheKey, JSON.stringify(runs));
    setSelectedFetchRunId((current) => {
      if (current && runs.some((run: FetchRun) => run.id === current)) {
        return current;
      }
      return runs[0]?.id ?? null;
    });
  }, []);

  const fetchClips = useCallback(async () => {
    if (!selectedFetchRunId) {
      setClips([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: 'all',
        limit: '1000',
        sort,
        game: category,
        fetchRunId: String(selectedFetchRunId),
      });
      if (minViews) params.set('minViews', minViews);
      const cacheKey = `${CLIPS_CACHE_PREFIX}${params.toString()}`;
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        setClips(Array.isArray(cachedData.clips) ? cachedData.clips : []);
        setAvailableCategories(Array.isArray(cachedData.categories) ? cachedData.categories : []);
      }
      const res = await fetch(`/api/clips?${params}`);
      const data = await res.json();
      setClips(Array.isArray(data.clips) ? data.clips : []);
      setAvailableCategories(Array.isArray(data.categories) ? data.categories : []);
      window.sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } finally {
      setLoading(false);
    }
  }, [category, minViews, sort, selectedFetchRunId]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (selectedListId) {
      window.localStorage.setItem(SELECTED_LIST_STORAGE_KEY, String(selectedListId));
      loadFetchRuns(selectedListId);
    } else {
      setFetchRuns([]);
      setSelectedFetchRunId(null);
    }
  }, [selectedListId, loadFetchRuns]);

  useEffect(() => {
    if (selectedFetchRunId) {
      loadFetchRunDetails(selectedFetchRunId);
    } else {
      setSelectedFetchRunDetails(null);
    }
  }, [selectedFetchRunId, loadFetchRunDetails]);

  useEffect(() => {
    setHasInitializedSelection(false);
    fetchClips();
  }, [fetchClips]);

  const handleFetchClips = async () => {
    if (!selectedListId) return;
    setFetching(true);
    setProgress(null);
    setSummary(null);
    setFetchError('');
    try {
      const res = await fetch('/api/twitch/fetch-clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: selectedListId,
          startedAt: new Date(Date.now() - fetchDays * 86400000),
          endedAt: new Date(),
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setFetchError(data?.error || 'Clip fetch failed');
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let newRunId: number | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.type === 'progress' || event.type === 'start') setProgress(event);
          if (event.type === 'complete') {
            setSummary(event);
            newRunId = event.fetchRunId ?? null;
          }
        }
      }
      await loadFetchRuns(selectedListId);
      window.sessionStorage.removeItem(`${FETCH_RUNS_CACHE_PREFIX}${selectedListId}`);
      if (newRunId) {
        setSelectedFetchRunId(newRunId);
      }
      setHasInitializedSelection(false);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Clip fetch failed');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!hasInitializedSelection && clips.length > 0) {
      setSelectedIds(new Set(clips.map((clip) => clip.id)));
      setHasInitializedSelection(true);
    }
  }, [clips, hasInitializedSelection]);

  const grouped = useMemo(() => {
    const map = new Map<string, Clip[]>();
    for (const clip of clips) {
      const handle = clip.streamer_handle || clip.broadcaster_name;
      const current = map.get(handle) ?? [];
      current.push(clip);
      map.set(handle, current);
    }
    return [...map.entries()];
  }, [clips]);
  const selectedClips = clips.filter((clip) => selectedIds.has(clip.id));
  const previewClip = clips.find((clip) => clip.id === previewId);
  const twitchEmbedParent =
    typeof window === 'undefined' ? 'localhost' : window.location.hostname;
  const activeList = streamerLists.find((list) => list.is_active);
  const visibleFetchRuns = showAllHistory ? fetchRuns : fetchRuns.slice(0, 5);

  const formatRunLabel = (run: FetchRun) => {
    const date = new Date(run.started_at).toLocaleString();
    return `${date} | ${run.total_clips_found} clips`;
  };

  const deleteSelectedFetchRun = async () => {
    if (!selectedFetchRunId) return;
    if (!window.confirm('Delete this fetch run and its saved clips?')) return;
    const res = await fetch(`/api/fetch-runs/${selectedFetchRunId}`, {
      method: 'DELETE',
    });
    if (!res.ok || !selectedListId) return;
    setSelectedFetchRunDetails(null);
    window.sessionStorage.removeItem(`${FETCH_RUN_DETAILS_CACHE_PREFIX}${selectedFetchRunId}`);
    window.sessionStorage.removeItem(`${FETCH_RUNS_CACHE_PREFIX}${selectedListId}`);
    await loadFetchRuns(selectedListId);
  };

  const toggleHistory = () => {
    setShowAllHistory((current) => {
      const next = !current;
      if (!next && selectedFetchRunId && !fetchRuns.slice(0, 5).some((run) => run.id === selectedFetchRunId)) {
        setSelectedFetchRunId(fetchRuns[0]?.id ?? null);
      }
      return next;
    });
  };

  const toggleClipSelection = (clipId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(clipId) ? next.delete(clipId) : next.add(clipId);
      return next;
    });
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-6">Clips</h1>

      <div className="card mb-4 flex flex-wrap gap-3 items-end">
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
        {activeList && selectedListId !== activeList.id && (
          <span className="text-sm text-slate-400 self-center pb-2">
            Active list: {activeList.name}
          </span>
        )}
      </div>

      <div className="card mb-6 flex flex-wrap gap-3 items-end">
        <div className="min-w-64 flex-1">
          <label className="label">Fetch Run</label>
          <select
            className="input"
            value={selectedFetchRunId ?? ''}
            onChange={(e) => setSelectedFetchRunId(Number(e.target.value))}
            disabled={!fetchRuns.length}
          >
            {visibleFetchRuns.map((run) => (
              <option key={run.id} value={run.id}>
                {formatRunLabel(run)}
              </option>
            ))}
          </select>
        </div>
        {fetchRuns.length > 5 && (
          <button className="btn btn-secondary" onClick={toggleHistory}>
            {showAllHistory ? 'Show Latest 5' : 'Show Older'}
          </button>
        )}
        <button
          className="btn btn-danger"
          onClick={deleteSelectedFetchRun}
          disabled={!selectedFetchRunId}
        >
          Delete Run
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end mb-6">
        <div>
          <label className="label">Fetch Range</label>
          <select className="input" value={fetchDays} onChange={(e) => setFetchDays(Number(e.target.value))}>
            <option value={1}>Last 24 hours</option>
            <option value={3}>Last 3 days</option>
            <option value={7}>Last 7 days</option>
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All</option>
            {availableCategories.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Min Views</label>
          <input className="input" value={minViews} onChange={(e) => setMinViews(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Sort</label>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="most_viewed">Most Viewed</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
        <button onClick={handleFetchClips} disabled={fetching || !selectedListId} className="btn btn-primary">
          {fetching ? 'Fetching...' : 'Fetch Clips'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setSelectedIds(new Set(clips.map((clip) => clip.id)))} className="btn btn-secondary">Select All</button>
        <button onClick={() => setSelectedIds(new Set())} className="btn btn-secondary">Clear All</button>
        <button onClick={async () => {
          const text = selectedClips.map((clip) => clip.url).join('\n');
          await fetch('/api/clip-lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `Clip list ${new Date().toLocaleString()}`,
              linksText: text,
              clipCount: selectedClips.length,
            }),
          });
          const blob = new Blob([text], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'twitch-clip-links.txt';
          a.click();
          URL.revokeObjectURL(url);
        }} disabled={!selectedClips.length} className="btn btn-secondary">Export Selected Links</button>
      </div>

      {loading && clips.length > 0 && (
        <div className="mb-4">
          <LoadingIndicator compact label="Refreshing clips" />
        </div>
      )}
      {progress && (
        <div className="card mb-4 text-sm flex flex-wrap gap-x-5 gap-y-2">
          <span>Processed <strong>{progress.processed ?? 0}</strong> / {progress.totalStreamers}</span>
          <span>Clips <strong>{progress.totalClipsFound ?? 0}</strong></span>
        </div>
      )}
      {fetchError && (
        <div className="card mb-4 border-red-800 bg-red-950/40 text-sm text-red-100">
          {fetchError}
        </div>
      )}
      {summary && (
        <div className="card mb-6 space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Completed <strong>{summary.completed}</strong></span>
            <span>Failed <strong>{summary.failed}</strong></span>
          </div>
          {(summary.noClipHandles ?? []).length > 0 && (
            <div>
              <div className="text-xs uppercase text-slate-400 mb-2">No Clips Found</div>
              <div className="flex flex-wrap gap-2">
                {summary.noClipHandles.map((handle: string) => (
                  <span key={handle} className="badge badge-unreviewed">{handle}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {(selectedFetchRunDetails?.errors.length ?? 0) > 0 && (
        <div className="card mb-6 space-y-3 border-red-800">
          <div className="text-xs uppercase text-red-300">Failed Fetches</div>
          <div className="space-y-2">
            {selectedFetchRunDetails?.errors.map((error) => (
              <div key={error.id} className="rounded bg-red-950/60 px-3 py-2 text-sm">
                <span className="font-mono text-red-200">{error.handle}</span>
                <span className="text-red-100">: {error.error_message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewClip?.external_id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setPreviewId(null)}>
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex justify-between items-center">
              <div className="font-medium">{previewClip.title}</div>
              <button className="btn btn-secondary" onClick={() => setPreviewId(null)}>Close</button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={`https://clips.twitch.tv/embed?clip=${previewClip.external_id}&parent=${encodeURIComponent(twitchEmbedParent)}&autoplay=false`}
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}

      {loading && clips.length === 0 ? (
        <div className="space-y-3 py-4">
          <LoadingIndicator label="Loading clips" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card space-y-3">
                <div className="skeleton aspect-video w-full" />
                <div className="skeleton h-4 w-5/6" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ) : !selectedFetchRunId ? (
        <div className="py-8 text-slate-400">No fetch runs for this list yet. Fetch clips to create one.</div>
      ) : (
        <div className="space-y-8 mt-2 fade-in">
          {grouped.map(([handle, entries]) => (
            <section key={handle}>
              <h2 className="text-base font-semibold mb-2">{handle}'s clips</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
                {entries.map((clip) => (
                  <article
                    key={clip.id}
                    className={`card relative flex flex-col p-2.5 cursor-pointer transition-colors ${
                      selectedIds.has(clip.id)
                        ? 'border-yellow-400 bg-yellow-950/30 ring-2 ring-yellow-400'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                    onClick={() => toggleClipSelection(clip.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleClipSelection(clip.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedIds.has(clip.id)}
                  >
                    {selectedIds.has(clip.id) && (
                      <span className="absolute right-2 top-2 z-10 rounded bg-yellow-400 px-2 py-0.5 text-[11px] font-semibold text-black">
                        Selected
                      </span>
                    )}
                    {clip.thumbnail_url && (
                      <button
                        type="button"
                        className="mb-1.5 block w-full"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPreviewId(clip.id);
                        }}
                        aria-label={`Preview ${clip.title}`}
                      >
                        <img
                          src={clip.thumbnail_url}
                          alt={clip.title}
                          className="w-full aspect-video object-cover rounded"
                        />
                      </button>
                    )}
                    <div className="mb-1.5 min-h-9">
                      <h3 className="font-medium text-xs leading-4 line-clamp-2">{clip.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="badge badge-active">{clip.game_name || 'Unknown'}</span>
                      <span className="badge badge-unreviewed">{clip.view_count.toLocaleString()} views</span>
                      <span className="badge badge-unreviewed">{clip.duration ? `${clip.duration}s` : '-'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mb-2">
                      {new Date(clip.created_at).toLocaleDateString()}
                    </div>
                    <div className="mt-auto flex justify-end">
                      <a
                        href={clip.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded bg-slate-700 text-sm text-slate-100 hover:bg-slate-600"
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Open ${clip.title} on Twitch`}
                        title="Open on Twitch"
                      >
                        &#8599;
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
