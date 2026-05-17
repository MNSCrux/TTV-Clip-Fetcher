'use client';

import { useEffect, useState } from 'react';

interface DashboardStats {
  totalStreamers: number;
  activeStreamers: number;
  resolvedStreamers: number;
  unresolvedStreamers: number;
  totalClips: number;
  activeListName: string | null;
  latestRun: {
    started_at: string;
    total_clips_found: number;
    failed_streamers: number;
    status: string;
  } | null;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [streamersRes, clipsRes, listsRes] = await Promise.all([
          fetch('/api/streamers?limit=1000'),
          fetch('/api/clips?limit=1&status=all'),
          fetch('/api/streamer-lists'),
        ]);

        const streamers = await streamersRes.json();
        const clips = await clipsRes.json();
        const lists = await listsRes.json();
        const safeStreamers = Array.isArray(streamers) ? streamers : [];
        const safeClips = Array.isArray(clips.clips) ? clips.clips : [];
        const safeLists = Array.isArray(lists) ? lists : [];
        const activeList = safeLists.find((list: any) => list.is_active);
        const runsRes = activeList
          ? await fetch(`/api/fetch-runs?listId=${activeList.id}`)
          : null;
        const runs = runsRes ? await runsRes.json() : [];
        const latestRun = Array.isArray(runs) ? runs[0] ?? null : null;

        const active = safeStreamers.filter((s: any) => s.active).length;
        const resolved = safeStreamers.filter(
          (s: any) => s.twitch_user_id
        ).length;
        const unresolved = safeStreamers.filter(
          (s: any) => !s.twitch_user_id
        ).length;

        setStats({
          totalStreamers: safeStreamers.length,
          activeStreamers: active,
          resolvedStreamers: resolved,
          unresolvedStreamers: unresolved,
          totalClips: typeof clips.total === 'number' ? clips.total : 0,
          activeListName: activeList?.name ?? null,
          latestRun,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  if (!stats) {
    return <div>Error loading stats</div>;
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="text-slate-400 text-sm">Total Streamers</div>
          <div className="text-3xl font-bold text-yellow-400">
            {stats.totalStreamers}
          </div>
        </div>

        <div className="card">
          <div className="text-slate-400 text-sm">Active Streamers</div>
          <div className="text-3xl font-bold text-blue-400">
            {stats.activeStreamers}
          </div>
        </div>

        <div className="card">
          <div className="text-slate-400 text-sm">Resolved IDs</div>
          <div className="text-3xl font-bold text-green-400">
            {stats.resolvedStreamers}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Unresolved: {stats.unresolvedStreamers}
          </div>
        </div>

        <div className="card">
          <div className="text-slate-400 text-sm">Total Clips</div>
          <div className="text-3xl font-bold text-purple-400">
            {stats.totalClips}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Quick Start</h2>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start">
              <span className="font-bold text-yellow-400 mr-3">1.</span>
              <span>
                Go to <a href="/streamers" className="text-yellow-400 hover:underline">Streamers</a>, choose or create a list, then import CSV
              </span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-yellow-400 mr-3">2.</span>
              <span>
                Mark that list active if it should be default
              </span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-yellow-400 mr-3">3.</span>
              <span>
                Go to <a href="/clips" className="text-yellow-400 hover:underline">Clips</a>, select list, fetch clips. Missing Twitch IDs resolve and cache automatically
              </span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-yellow-400 mr-3">4.</span>
              <span>Export clip links from Clips</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-yellow-400 mr-3">5.</span>
              <span>Use fetch history to reopen, inspect, or delete older runs</span>
            </li>
          </ol>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Current Workflow</h2>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-slate-400">Active List</div>
              <div className="font-medium">{stats.activeListName ?? 'None'}</div>
            </div>
            <div>
              <div className="text-slate-400">Latest Fetch</div>
              {stats.latestRun ? (
                <div className="space-y-1">
                  <div>{new Date(stats.latestRun.started_at).toLocaleString()}</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-active">{stats.latestRun.total_clips_found} clips</span>
                    <span className={stats.latestRun.failed_streamers ? 'badge badge-rejected' : 'badge badge-approved'}>
                      {stats.latestRun.failed_streamers} failed
                    </span>
                    <span className="badge badge-unreviewed">{stats.latestRun.status}</span>
                  </div>
                </div>
              ) : (
                <div>No fetch runs yet</div>
              )}
            </div>
            <a href="/clips" className="btn btn-secondary inline-block">Open Clips</a>
          </div>
        </div>
      </div>
    </div>
  );
}
