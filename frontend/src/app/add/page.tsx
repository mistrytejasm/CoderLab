'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { Sparkles, Link2, FileText, Loader2, ArrowLeft, X, RotateCcw } from 'lucide-react';
import Link from 'next/link';

type Tab = 'generate' | 'url' | 'manual';

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls = "w-full px-4 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all";
const labelCls = "block text-xs font-semibold mb-1.5 text-zinc-500 dark:text-zinc-400 uppercase tracking-wide";

// ── Error Banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm leading-relaxed">
      <span className="shrink-0">⚠️</span><span>{msg}</span>
    </div>
  );
}

// ── Editable Tag Chips ────────────────────────────────────────────────────────
function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = (raw: string) => { const t = raw.trim(); if (t && !tags.includes(t)) onChange([...tags, t]); setInput(''); };
  const remove = (t: string) => onChange(tags.filter(x => x !== t));
  return (
    <div className="flex flex-wrap gap-1.5 min-h-[42px] px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium">
          {tag}
          <button type="button" onClick={() => remove(tag)} className="hover:text-red-500 transition-colors"><X size={10} /></button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); } if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1]); }}
        onBlur={() => add(input)}
        placeholder={tags.length === 0 ? 'Type a tag and press Enter...' : ''}
        className="flex-1 min-w-[160px] bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
      />
    </div>
  );
}

// ── Difficulty Badge ──────────────────────────────────────────────────────────
const DIFF_CLASS: Record<string, string> = {
  Easy:   'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-600',
  Medium: 'bg-amber-100   dark:bg-amber-500/10   text-amber-700   dark:text-amber-400   border-amber-300   dark:border-amber-600',
  Hard:   'bg-red-100     dark:bg-red-500/10     text-red-700     dark:text-red-400     border-red-300     dark:border-red-600',
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AddProblem() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('generate');

  // ── AI Generate state ─────────────────────────────────────────────────────
  const [topic, setTopic]             = useState('');
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState('');

  // Preview (after LLM generates, before saving)
  type Preview = { title: string; description: string; difficulty: string };
  const [preview, setPreview]         = useState<Preview | null>(null);
  const [previewTags, setPreviewTags] = useState<string[]>([]);
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [saving, setSaving]           = useState(false);

  // ── URL Import state ──────────────────────────────────────────────────────
  const [url, setUrl]                 = useState('');
  const [importing, setImporting]     = useState(false);
  const [importError, setImportError] = useState('');

  // ── Manual Entry state ────────────────────────────────────────────────────
  const [form, setForm]               = useState({ title: '', description: '', difficulty: 'Easy' });
  const [manualTags, setManualTags]   = useState<string[]>([]);
  const [submitting, setSubmitting]   = useState(false);
  const [manualError, setManualError] = useState('');

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Step 1: Generate problem content (no tags yet) */
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setGenerating(true);
    setGenError('');
    setPreview(null);
    setPreviewTags([]);
    try {
      // We call a lightweight preview — just get title/description/difficulty back
      // without saving. We pass tags=[] so the route knows it's a preview-only call.
      // Actually we just call generate with empty tags to preview; if user likes it they save.
      // For the 2-step flow we introduce a /problems/preview endpoint that returns
      // title/description/difficulty but does NOT save to DB.
      const { data } = await api.post('/problems/preview', { topic });
      setPreview({ title: data.title, description: data.description, difficulty: data.difficulty });
    } catch (err: any) {
      setGenError(err.response?.data?.detail || err.message || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  /** Step 1b: Suggest tags via AI using the generated problem content */
  const handleSuggestTags = async () => {
    if (!preview) return;
    setSuggestingTags(true);
    try {
      const { data } = await api.post('/problems/suggest-tags', {
        title: preview.title,
        description: preview.description,
      });
      setPreviewTags(data.tags ?? []);
    } catch (err: any) {
      setGenError(err.response?.data?.detail || 'Tag suggestion failed.');
    } finally {
      setSuggestingTags(false);
    }
  };

  /** Step 2: Save the previewed problem with user-confirmed tags */
  const handleSavePreview = async () => {
    if (!preview) return;
    setSaving(true);
    setGenError('');
    try {
      const { data } = await api.post('/problems/generate', { topic, tags: previewTags });
      router.push(`/problems/${data.id}`);
    } catch (err: any) {
      setGenError(err.response?.data?.detail || err.message || 'Save failed.');
      setSaving(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true); setImportError('');
    try {
      const { data } = await api.post('/problems/import', { url });
      router.push(`/problems/${data.id}`);
    } catch (err: any) {
      setImportError(err.response?.data?.detail || err.message || 'Import failed.');
    } finally { setImporting(false); }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setManualError('');
    try {
      const { data } = await api.post('/problems', { ...form, tags: manualTags, status: 'Unsolved' });
      router.push(`/problems/${data.id}`);
    } catch (err: any) {
      setManualError(err.response?.data?.detail || err.message || 'Failed to save.');
    } finally { setSubmitting(false); }
  };

  // ── Tab Config ────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'generate', label: 'AI Generate', icon: '✨' },
    { id: 'url',      label: 'Import URL',  icon: '🔗' },
    { id: 'manual',   label: 'Manual',      icon: '✏️'  },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Navbar showAdd={false} />
      <main className="max-w-xl mx-auto px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8 transition-colors">
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold mb-8 tracking-tight">Add a Problem</h1>

        {/* Tabs */}
        <div className="flex rounded-xl p-1 mb-8 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          {tabs.map(({ id, label, icon }) => (
            <button key={id} onClick={() => { setActiveTab(id); setPreview(null); setGenError(''); }}
              className={`flex-1 flex justify-center items-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === id
                  ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              <span>{icon}</span>{label}
            </button>
          ))}
        </div>

        {/* ── AI GENERATE TAB ── */}
        {activeTab === 'generate' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-7 space-y-6">

            {/* Step 1: Topic input */}
            {!preview && (
              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <label className={labelCls}>Problem Topic</label>
                  <input type="text" value={topic} onChange={e => { setTopic(e.target.value); setGenError(''); }}
                    placeholder="e.g. Find sum of elements in a List — Python"
                    required className={inputCls}
                  />
                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
                    💡 Be specific — mention the data structure, operation, and a language hint.<br />
                    <em>"reverse a string using a stack"</em> or <em>"find max subarray — Dynamic Programming"</em>
                  </p>
                </div>
                {genError && <ErrorBanner msg={genError} />}
                <button type="submit" disabled={generating || !topic.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 text-sm">
                  {generating ? <><Loader2 size={15} className="animate-spin" /> Generating...</> : '✨ Generate Problem'}
                </button>
              </form>
            )}

            {/* Step 2: Preview + Tag editing before save */}
            {preview && (
              <div className="space-y-5">
                {/* Preview header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Generated Problem</p>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{preview.title}</h2>
                  </div>
                  <span className={`shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${DIFF_CLASS[preview.difficulty] ?? ''}`}>
                    {preview.difficulty}
                  </span>
                </div>

                {/* Tags section */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelCls}>Tags</label>
                    <button type="button" onClick={handleSuggestTags} disabled={suggestingTags}
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-500/25 disabled:opacity-50 transition-colors">
                      {suggestingTags ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                      {suggestingTags ? 'Suggesting...' : 'AI Suggest Tags'}
                    </button>
                  </div>
                  <TagEditor tags={previewTags} onChange={setPreviewTags} />
                  <p className="mt-1.5 text-[11px] text-zinc-400">
                    Add tags manually, or click <strong>AI Suggest Tags</strong> to auto-fill. You can edit before saving.
                  </p>
                </div>

                {genError && <ErrorBanner msg={genError} />}

                <div className="flex gap-3">
                  {/* Regenerate */}
                  <button type="button" onClick={() => { setPreview(null); setPreviewTags([]); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <RotateCcw size={14} /> Regenerate
                  </button>
                  {/* Save */}
                  <button type="button" onClick={handleSavePreview} disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 text-sm">
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : '💾 Save Problem'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── IMPORT URL TAB ── */}
        {activeTab === 'url' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-7">
            <form onSubmit={handleImport} className="space-y-5">
              <div>
                <label className={labelCls}>Problem URL</label>
                <input type="url" value={url} onChange={e => { setUrl(e.target.value); setImportError(''); }}
                  placeholder="https://leetcode.com/problems/two-sum/" required className={inputCls} />
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
                Works with LeetCode, GeeksforGeeks, HackerRank, and more. AI will scrape and format it.
              </p>
              {importError && <ErrorBanner msg={importError} />}
              <button type="submit" disabled={importing || !url}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 text-sm">
                {importing ? <><Loader2 size={15} className="animate-spin" /> Importing...</> : '🔗 Import Problem'}
              </button>
            </form>
          </div>
        )}

        {/* ── MANUAL TAB ── */}
        {activeTab === 'manual' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-7">
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div>
                <label className={labelCls}>Title</label>
                <input type="text" required value={form.title}
                  onChange={e => { setForm({ ...form, title: e.target.value }); setManualError(''); }}
                  placeholder="Two Sum" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className={inputCls}>
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tags</label>
                  <TagEditor tags={manualTags} onChange={setManualTags} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Description (Markdown)</label>
                <textarea required value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={9} placeholder={"Given a list `nums`...\n\n**Example 1:**\n```\nInput: nums = [1,2,3]\nOutput: 6\n```\n\n**Constraints:**\n- `1 <= n <= 10^5`"}
                  className={`${inputCls} resize-none font-mono text-xs leading-relaxed`} />
              </div>
              {manualError && <ErrorBanner msg={manualError} />}
              <button type="submit" disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 text-sm">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : 'Save Problem'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
