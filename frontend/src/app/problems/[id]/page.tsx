'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { ArrowLeft, Play, CheckCircle2, Code2, ChevronRight, Minus, Plus, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Editor from '@monaco-editor/react';

export default function ProblemView() {
  const { id } = useParams();

  const [problem, setProblem] = useState<any>(null);
  const [code, setCode] = useState<string>(
    '# Write your Python code here...\n\n\ndef solution():\n    pass\n\n\nprint(solution())\n'
  );
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const { data } = await api.get(`/problems/${id}`);
        setProblem(data);
      } catch (err) {
        console.error('Failed to load problem', err);
      }
    };
    if (id) fetchProblem();
  }, [id]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('⏳ Running your code...');
    try {
      const { data } = await api.post('/execute', { code });
      if (data.stderr) {
        setOutput('❌ Error:\n' + data.stderr);
      } else {
        setOutput(data.stdout || '✅ Execution complete — no output produced.');
      }
    } catch (err: any) {
      setOutput('⚠️ ' + (err.response?.data?.detail || 'An error occurred during execution.'));
    } finally {
      setIsRunning(false);
    }
  };

  const toggleStatus = async () => {
    if (!problem) return;
    setIsUpdatingStatus(true);
    const newStatus = problem.status === 'Solved' ? 'Unsolved' : 'Solved';
    try {
      await api.put(`/problems/${id}/status`, { status: newStatus });
      setProblem({ ...problem, status: newStatus });
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const difficultyColor = {
    Easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Hard: 'text-red-400 bg-red-500/10 border-red-500/20',
  }[problem?.difficulty] ?? 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';

  const cleanDescription = (raw: string) =>
    raw
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      // Remove artifact double-asterisks from broken LLM formatting
      .replace(/^\*\*\s*$/gm, '')
      .replace(/\*{4,}/g, '**');

  if (!problem) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-500 text-sm animate-pulse">
        Loading problem...
      </div>
    );
  }

  return (
    <div className="dark h-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">

      {/* ── Top Navigation Bar ── */}
      <Navbar
        showAdd={false}
        rightSlot={
          <>
            <div className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              <Link href="/" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                <ArrowLeft size={16} />
              </Link>
              <ChevronRight size={13} className="text-zinc-300 dark:text-zinc-600" />
              <span className="truncate max-w-[260px]">{problem.title}</span>
              <span className={`hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${difficultyColor}`}>
                {problem.difficulty}
              </span>
            </div>
            <button
              onClick={toggleStatus}
              disabled={isUpdatingStatus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                problem.status === 'Solved'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <CheckCircle2 size={14} />
              {problem.status === 'Solved' ? 'Solved ✓' : 'Mark Solved'}
            </button>
          </>
        }
      />

      {/* ── Main Split Pane ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL: Problem Description ── */}
        <div className="w-[46%] flex flex-col bg-zinc-900 border-r border-zinc-800 overflow-y-auto">
          <div className="p-6" style={{ fontSize: `${fontSize}px` }}>

            {/* Problem heading */}
            <div className="mb-5 pb-4 border-b border-zinc-800">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider border ${difficultyColor}`}>
                  {problem.difficulty}
                </span>
                {problem.tags.map((t: string) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="text-lg font-bold text-zinc-100 leading-snug">{problem.title}</h2>
            </div>

            {/* Markdown body */}
            <div
              className="problem-markdown"
              style={{ fontSize: `${fontSize}px` }}
            >
              <ReactMarkdown>
                {cleanDescription(String(problem.description))}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Editor + Terminal ── */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">

          {/* Editor Toolbar */}
          <div className="h-11 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/80 shrink-0">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <Code2 size={13} />
              <span>Python 3.10</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Font size control */}
              <div className="flex items-center gap-1.5 text-zinc-500">
                <button
                  onClick={() => setFontSize(f => Math.max(11, f - 1))}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                ><Minus size={10} /></button>
                <span className="text-[11px] w-6 text-center tabular-nums text-zinc-400">{fontSize}</span>
                <button
                  onClick={() => setFontSize(f => Math.min(26, f + 1))}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                ><Plus size={10} /></button>
              </div>

              <button
                onClick={handleRunCode}
                disabled={isRunning}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
              >
                <Play size={11} fill="currentColor" />
                {isRunning ? 'Running...' : 'Run Code'}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: fontSize,
                fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
                fontLigatures: true,
                scrollBeyondLastLine: false,
                lineHeight: Math.round(fontSize * 1.75),
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: 'gutter',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {/* Terminal Output */}
          <div className="h-52 border-t border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
            <div className="h-8 border-b border-zinc-800 flex items-center gap-2 px-4 bg-zinc-900/60 shrink-0">
              <Terminal size={12} className="text-zinc-500" />
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Output</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <pre
                className="font-mono whitespace-pre-wrap leading-6 text-zinc-300"
                style={{ fontSize: `${Math.max(11, fontSize - 1)}px` }}
              >
                {output || (
                  <span className="text-zinc-600 italic">Run your code to see the output here.</span>
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
