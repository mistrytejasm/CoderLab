'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { BadgeCheck, XCircle, Search, Filter, ChevronRight } from 'lucide-react';

interface Problem {
  id: string;
  title: string;
  difficulty: string;
  tags: string[];
  status: string;
  created_at: string;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  Medium: 'bg-amber-100   text-amber-700   dark:bg-amber-500/10   dark:text-amber-400',
  Hard:   'bg-red-100     text-red-700     dark:bg-red-500/10     dark:text-red-400',
};

export default function Home() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [diff, setDiff]         = useState('All');

  useEffect(() => { fetchProblems(); }, []);

  const fetchProblems = async () => {
    try {
      const { data } = await api.get('/problems');
      setProblems(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const filtered = problems.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
                        p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchDiff   = diff === 'All' || p.difficulty === diff;
    return matchSearch && matchDiff;
  });

  const solved   = problems.filter(p => p.status === 'Solved').length;
  const total    = problems.length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Problems</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            {total > 0
              ? <>{solved} / {total} solved — keep going 🚀</>
              : 'No problems yet. Add your first one!'}
          </p>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${(solved / total) * 100}%` }}
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by title or tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-zinc-400" />
            <select
              value={diff}
              onChange={e => setDiff(e.target.value)}
              className="text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 text-center text-zinc-400 animate-pulse text-sm">Loading problems...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <p className="text-zinc-400 text-sm">No problems found.</p>
              <Link href="/add" className="text-blue-500 hover:underline text-sm font-medium">
                Add your first problem →
              </Link>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/50">
                  <th className="px-5 py-3 font-semibold text-zinc-400 dark:text-zinc-500 text-xs uppercase tracking-wider w-16">Status</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400 dark:text-zinc-500 text-xs uppercase tracking-wider">Title</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400 dark:text-zinc-500 text-xs uppercase tracking-wider w-28">Difficulty</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400 dark:text-zinc-500 text-xs uppercase tracking-wider">Tags</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      {p.status === 'Solved'
                        ? <BadgeCheck size={20} className="text-emerald-500" />
                        : <XCircle size={20} className="text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-400 dark:group-hover:text-zinc-500 transition-colors" />}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/problems/${p.id}`}
                        className="font-semibold text-zinc-800 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${DIFFICULTY_STYLES[p.difficulty] ?? 'bg-zinc-100 text-zinc-500'}`}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {p.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-400 dark:group-hover:text-zinc-500 transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
