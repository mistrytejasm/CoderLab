'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Link2, FileText, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AddProblem() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'url' | 'manual'>('url');
  
  // URL Import State
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  
  // Manual Entry State
  const [form, setForm] = useState({ title: '', description: '', difficulty: 'Easy', tags: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setImporting(true);
    try {
      const { data } = await api.post('/problems/import', { url });
      router.push(`/problems/${data.id}`);
    } catch (err: any) {
      alert("Failed to import: " + (err.response?.data?.detail || err.message));
    } finally {
      setImporting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: 'Unsolved'
      };
      const { data } = await api.post('/problems', payload);
      router.push(`/problems/${data.id}`);
    } catch (err: any) {
      alert("Failed to add problem: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 p-8 flex items-center justify-center">
      <div className="max-w-xl w-full">
        
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 mb-8 transition-colors">
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
        
        <h1 className="text-3xl font-bold mb-8">Add a New Problem</h1>
        
        {/* Tabs */}
        <div className="flex rounded-xl bg-zinc-200/50 dark:bg-zinc-900/50 p-1 mb-8">
          <button 
            onClick={() => setActiveTab('url')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-lg font-medium transition-all ${activeTab === 'url' ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'}`}
          >
            <Link2 size={18} />
            Import by URL
          </button>
          <button 
            onClick={() => setActiveTab('manual')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-lg font-medium transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'}`}
          >
            <FileText size={18} />
            Manual Entry
          </button>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
          
          {activeTab === 'url' ? (
            <form onSubmit={handleImport} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">Problem URL (LeetCode, GfG, HackerRank)</label>
                <input 
                  type="url" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://leetcode.com/problems/two-sum/"
                  required
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <p className="text-sm text-zinc-500">
                Our AI will automatically extract the title, description, constraints, and tags from the page content.
              </p>
              <button 
                type="submit" 
                disabled={importing || !url}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all flex justify-center items-center disabled:opacity-50"
              >
                {importing ? <><Loader2 className="animate-spin mr-2" size={20} /> Scanning & Importing...</> : "Import Magic ✨"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-6">
               <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input 
                  type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Two Sum"
                />
              </div>
              
              <div className="flex gap-4">
                 <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <select 
                    value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Tags (comma separated)</label>
                  <input 
                    type="text" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})}
                    placeholder="Array, Hash Table"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>

               <div>
                <label className="block text-sm font-medium mb-2">Description (Markdown Supported)</label>
                <textarea 
                  required value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  rows={8}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                  placeholder="Write the problem statement here..."
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-all flex justify-center items-center disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : "Save Problem"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
