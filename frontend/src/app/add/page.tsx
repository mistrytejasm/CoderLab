'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Link2, FileText, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AddProblem() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'url' | 'manual'>('url');

  // URL Import State
  const [url, setUrl]             = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Manual Entry State
  const [form, setForm]           = useState({ title: '', description: '', difficulty: 'Easy', tags: '' });
  const [submitting, setSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setImporting(true);
    setImportError('');
    try {
      const { data } = await api.post('/problems/import', { url });
      router.push(`/problems/${data.id}`);
    } catch (err: any) {
      setImportError(err.response?.data?.detail || err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setManualError('');
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: 'Unsolved',
      };
      const { data } = await api.post('/problems', payload);
      router.push(`/problems/${data.id}`);
    } catch (err: any) {
      setManualError(err.response?.data?.detail || err.message || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  // shared input style
  const inputCls = "w-full px-4 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";
  const labelCls = "block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Navbar showAdd={false} />

      <main className="max-w-xl mx-auto px-6 py-10">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8 transition-colors">
          <ArrowLeft size={15} />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-8 tracking-tight">Add a Problem</h1>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-8 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          {(['url', 'manual'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {tab === 'url' ? <Link2 size={16} /> : <FileText size={16} />}
              {tab === 'url' ? 'Import by URL' : 'Manual Entry'}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 space-y-6">

          {activeTab === 'url' ? (
            <form onSubmit={handleImport} className="space-y-5">
              <div>
                <label className={labelCls}>Problem URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setImportError(''); }}
                  placeholder="https://leetcode.com/problems/two-sum/"
                  required
                  className={inputCls}
                />
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
                Works with LeetCode, GeeksforGeeks, HackerRank, and more. Our AI will extract the title, description, examples, and tags automatically.
              </p>
              {importError && <ErrorBanner msg={importError} />}
              <button
                type="submit"
                disabled={importing || !url}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 text-sm"
              >
                {importing ? <><Loader2 size={16} className="animate-spin" /> Scanning &amp; Importing...</> : '✨ Import Problem'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div>
                <label className={labelCls}>Title</label>
                <input
                  type="text" required
                  value={form.title}
                  onChange={e => { setForm({ ...form, title: e.target.value }); setManualError(''); }}
                  placeholder="Two Sum"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={e => setForm({ ...form, difficulty: e.target.value })}
                    className={inputCls}
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={e => setForm({ ...form, tags: e.target.value })}
                    placeholder="Array, Hash Table"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Description (Markdown supported)</label>
                <textarea
                  required
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={9}
                  placeholder="## Problem Statement&#10;&#10;Given an array of integers..."
                  className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
                />
              </div>
              {manualError && <ErrorBanner msg={manualError} />}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 text-sm"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Save Problem'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm leading-relaxed">
      <span className="shrink-0 mt-0.5">⚠️</span>
      <span>{msg}</span>
    </div>
  );
}
