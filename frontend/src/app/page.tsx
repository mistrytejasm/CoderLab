'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { BadgeCheck, XCircle, Search, PlusCircle, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Problem {
  id: str;
  title: string;
  difficulty: string;
  tags: string[];
  status: string;
  created_at: string;
}

export default function Home() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const response = await api.get('/problems');
      setProblems(response.data);
    } catch (error) {
      console.error("Failed to fetch problems", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = problems.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesDifficulty = difficultyFilter === 'All' || p.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">CoderLab</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Your personal Python practice platform.</p>
          </div>
          <Link href="/add">
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm">
              <PlusCircle size={20} />
              Add Problem
            </button>
          </Link>
        </div>

        {/* Filters Panel */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by title or tag..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            />
          </div>
          
          <div className="flex items-center gap-2 relative">
            <Filter className="text-zinc-400" size={18} />
            <select 
               value={difficultyFilter}
               onChange={(e) => setDifficultyFilter(e.target.value)}
               className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 font-medium cursor-pointer"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Problems Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {loading ? (
             <div className="p-12 text-center text-zinc-500 animate-pulse font-medium">Loading problems...</div>
          ) : filteredProblems.length === 0 ? (
             <div className="p-12 text-center text-zinc-500 font-medium space-y-3">
               <p>No problems found.</p>
               <Link href="/add" className="text-blue-500 hover:underline">Add your first problem</Link>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-4 font-semibold text-zinc-500 dark:text-zinc-400">Status</th>
                    <th className="p-4 font-semibold text-zinc-500 dark:text-zinc-400">Title</th>
                    <th className="p-4 font-semibold text-zinc-500 dark:text-zinc-400">Difficulty</th>
                    <th className="p-4 font-semibold text-zinc-500 dark:text-zinc-400">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredProblems.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                      <td className="p-4 w-20">
                        <div className="flex justify-center">
                           {p.status === 'Solved' 
                             ? <BadgeCheck className="text-green-500" size={24} /> 
                             : <XCircle className="text-zinc-300 dark:text-zinc-700 group-hover:text-red-400 transition-colors" size={24} />}
                        </div>
                      </td>
                      <td className="p-4">
                        <Link href={`/problems/${p.id}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline text-lg">
                          {p.title}
                        </Link>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                          p.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
                          p.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                          {p.difficulty}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {p.tags.map(t => (
                            <span key={t} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium text-zinc-600 dark:text-zinc-300">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
