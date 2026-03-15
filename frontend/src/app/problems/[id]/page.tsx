'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, Play, CheckCircle, Code2, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Editor from '@monaco-editor/react';

export default function ProblemView() {
  const { id } = useParams();
  const router = useRouter();
  
  const [problem, setProblem] = useState<any>(null);
  const [code, setCode] = useState<string>('# Write your Python code here...\n\ndef main():\n    print("Hello from CoderLab! Write your solution here.")\n\nif __name__ == "__main__":\n    main()\n');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const { data } = await api.get(`/problems/${id}`);
        setProblem(data);
      } catch (err) {
        console.error("Failed to load problem", err);
      }
    };
    if (id) fetchProblem();
  }, [id]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('Executing...');
    try {
      const { data } = await api.post('/execute', { code });
      setOutput(data.stderr ? data.stderr : data.stdout || 'Execution finished with no output.');
    } catch (err: any) {
      setOutput(err.response?.data?.detail || "An error occurred during execution.");
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
      console.error("Failed to update status", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (!problem) return <div className="min-h-screen flex items-center justify-center animate-pulse text-zinc-500">Loading problem...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden">
      
      {/* Navbar */}
      <nav className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-bold truncate max-w-[300px]">{problem.title}</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
              problem.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
              problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' :
              'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
            }`}>
              {problem.difficulty}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleStatus}
            disabled={isUpdatingStatus}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md font-medium text-sm transition-all ${
              problem.status === 'Solved' 
              ? 'bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200/50 dark:hover:bg-green-900/50'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <CheckCircle size={16} />
            {problem.status === 'Solved' ? 'Solved' : 'Mark as Solved'}
          </button>
        </div>
      </nav>

      {/* Main Content Resizable Layout (Simulated with Flexbox for MVP) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel - Description */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
          <div className="p-6 prose dark:prose-invert max-w-none">
             <div className="flex flex-wrap gap-2 mb-6">
                {problem.tags.map((t: string) => (
                  <span key={t} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {t}
                  </span>
                ))}
              </div>
              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                <ReactMarkdown>
                  {String(problem.description).replace(/\\n/g, '\n').replace(/\\t/g, '\t')}
                </ReactMarkdown>
              </div>
          </div>
        </div>

        {/* Right Panel - Code & Output */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-[#1e1e1e]">
          
          {/* Editor Header */}
          <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 bg-zinc-50 dark:bg-zinc-900 shrink-0">
             <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
                <Code2 size={14} />
                Python 3.10
             </div>
             <button 
                onClick={handleRunCode}
                disabled={isRunning}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
             >
               <Play size={12} fill="currentColor" />
               Run Code
             </button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden relative">
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Menlo, monospace',
                scrollBeyondLastLine: false,
                lineHeight: 24,
                padding: { top: 16 }
              }}
            />
          </div>

          {/* Terminal Output */}
          <div className="h-64 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black flex flex-col shrink-0">
             <div className="h-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 bg-zinc-100 dark:bg-zinc-900 shrink-0">
                <span className="text-xs font-medium text-zinc-500 uppercase flex items-center gap-2">Output</span>
             </div>
             <div className="flex-1 p-4 overflow-y-auto">
               <pre className="text-sm font-mono whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 leading-relaxed">
                 {output || "Run your code to see the output here."}
               </pre>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
