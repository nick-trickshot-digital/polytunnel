'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { vickieNoTasks, vickieOverdueTasks, vickieHasTasks, pickQuote } from '@/lib/quotes/vickie';

interface Task {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  category: string;
  priority: string;
  isCompleted: boolean;
  isAiGenerated: boolean;
  completedAt: string | null;
  plantingId: number | null;
}

const categoryIcons: Record<string, string> = {
  watering: '\u{1F4A7}',
  feeding: '\u{1F331}',
  ventilation: '\u{1F321}\uFE0F',
  sowing: '\u{1F331}',
  harvesting: '\u{1F96C}',
  maintenance: '\u{1F527}',
  'pest-control': '\u{1F41B}',
};

const categories = ['all', 'watering', 'feeding', 'ventilation', 'sowing', 'harvesting', 'maintenance', 'pest-control'];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Escape key + scroll lock for add task modal
  useEffect(() => {
    if (!showAddModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddModal(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleKey);
    };
  }, [showAddModal]);

  // Add task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newCategory, setNewCategory] = useState('maintenance');
  const [newPriority, setNewPriority] = useState('medium');

  const fetchTasks = () => {
    const url = showCompleted ? '/api/tasks' : '/api/tasks?completed=false';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, [showCompleted]);

  const handleComplete = async (id: number) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: true }),
    });
    fetchTasks();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    fetchTasks();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/tasks/generate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.generated === 0) {
        console.warn('Task generation returned 0 tasks:', data);
      }
    } catch (err) {
      console.error('Task generation failed:', err);
    }
    setGenerating(false);
    fetchTasks();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        description: newDesc || null,
        dueDate: newDueDate || null,
        category: newCategory,
        priority: newPriority,
      }),
    });

    setNewTitle('');
    setNewDesc('');
    setNewDueDate('');
    setShowAddModal(false);
    fetchTasks();
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.category === filter);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const overdue = filteredTasks.filter(t => !t.isCompleted && t.dueDate && t.dueDate < today);
  const doNow = filteredTasks.filter(t => !t.isCompleted && (!t.dueDate || (t.dueDate >= today && t.dueDate <= today)));
  const upcoming = filteredTasks.filter(t => !t.isCompleted && t.dueDate && t.dueDate > today);
  const completed = filteredTasks.filter(t => t.isCompleted);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-3xl font-800 text-earth-800"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Tasks
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-sm md:text-lg font-semibold px-3 py-2.5 md:px-5 md:py-4 bg-white text-tunnel-700 rounded-xl md:rounded-2xl hover:bg-tunnel-50 border border-tunnel-300 transition-colors disabled:opacity-50"
          >
            {generating ? '\u{1F9E0} Thinking...' : '\u{1F9E0} Suggest'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-sm md:text-lg font-bold px-3 py-2.5 md:px-5 md:py-4 bg-tunnel-600 text-white rounded-xl md:rounded-2xl hover:bg-tunnel-700 border border-tunnel-700 transition-colors shadow-sm"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`flex items-center gap-1.5 px-5 py-3 rounded-2xl text-base whitespace-nowrap transition-colors ${
              filter === cat
                ? 'bg-tunnel-600 text-white font-bold border border-tunnel-700'
                : 'bg-white text-earth-700 font-semibold border border-earth-200 hover:bg-earth-50'
            }`}
          >
            {cat !== 'all' && <span className="text-lg">{categoryIcons[cat]}</span>}
            <span className="capitalize">{cat === 'pest-control' ? 'Pest Control' : cat}</span>
          </button>
        ))}
      </div>

      {/* Show completed toggle */}
      <label className="flex items-center gap-3 text-lg text-earth-600 cursor-pointer font-medium">
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={e => setShowCompleted(e.target.checked)}
          className="w-6 h-6 rounded border-2 border-earth-300"
        />
        Show completed tasks
      </label>

      {loading ? (
        <div className="space-y-3 stagger-children">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-earth-200 animate-pulse">
              <div className="h-6 bg-earth-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="stagger-children">
          {/* Vickie's commentary when tasks exist */}
          {(overdue.length > 0 || doNow.length > 0 || upcoming.length > 0) && (
            <div className="flex items-center gap-4 mb-4 bg-white rounded-2xl p-4 border border-earth-200 card-texture">
              <Image
                src="/images/vickie.png"
                alt="Vickie"
                width={80}
                height={80}
                className="w-20 h-20 object-contain flex-shrink-0"
              />
              <div>
                <p className="text-lg font-800 text-earth-700" style={{ fontFamily: 'var(--font-display)' }}>
                  Vickie says...
                </p>
                <p className="text-base text-earth-600 font-semibold mt-1 italic">
                  &ldquo;{pickQuote(overdue.length > 0 ? vickieOverdueTasks : vickieHasTasks)}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {overdue.length === 0 && doNow.length === 0 && upcoming.length === 0 && (
            <div className="bg-white rounded-2xl p-6 border border-earth-200 card-texture flex items-center gap-5">
              <Image
                src="/images/vickie.png"
                alt="Vickie"
                width={96}
                height={96}
                className="w-24 h-24 object-contain flex-shrink-0"
              />
              <div>
                <p className="text-xl font-800 text-earth-700" style={{ fontFamily: 'var(--font-display)' }}>
                  Vickie says...
                </p>
                <p className="text-lg text-earth-500 font-semibold mt-1">
                  &ldquo;{pickQuote(vickieNoTasks)}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Overdue */}
          {overdue.length > 0 && (
            <div className="mb-6">
              <h2
                className="text-xl font-extrabold text-red-600 mb-3 uppercase tracking-wide flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {'\u{26A0}\uFE0F'} Overdue ({overdue.length})
              </h2>
              <div className="space-y-3">
                {overdue.map(task => (
                  <TaskCard key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} isOverdue />
                ))}
              </div>
            </div>
          )}

          {/* Do Now */}
          {doNow.length > 0 && (
            <div className="mb-6">
              <h2
                className="text-xl font-extrabold text-tunnel-700 mb-3 uppercase tracking-wide flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {'\u{1F3AF}'} Do Now ({doNow.length})
              </h2>
              <div className="space-y-3">
                {doNow.map(task => (
                  <TaskCard key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="mb-6">
              <h2
                className="text-xl font-extrabold text-earth-500 mb-3 uppercase tracking-wide flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {'\u{1F4C5}'} Upcoming ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map(task => (
                  <TaskCard key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {showCompleted && completed.length > 0 && (
            <div>
              <h2
                className="text-xl font-extrabold text-earth-400 mb-3 uppercase tracking-wide flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {'\u2705'} Completed ({completed.length})
              </h2>
              <div className="space-y-3 opacity-60">
                {completed.map(task => (
                  <TaskCard key={task.id} task={task} onComplete={handleComplete} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add task modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setShowAddModal(false)} />
          <div role="dialog" aria-modal="true" aria-label="Add task" className="fixed inset-x-4 top-[10%] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-51 bg-white rounded-2xl shadow-2xl overflow-hidden border border-earth-200">
            <div className="p-5 border-b border-earth-200">
              <h2
                className="text-2xl font-extrabold text-earth-800"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Add Task
              </h2>
            </div>
            <form onSubmit={handleAddTask} className="p-5 space-y-4">
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="What needs doing?"
                className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none"
                autoFocus
              />
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none resize-none"
              />
              <input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                className="w-full px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none"
              />
              <div className="flex gap-3">
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="flex-1 px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none"
                >
                  {categories.filter(c => c !== 'all').map(c => (
                    <option key={c} value={c}>{categoryIcons[c]} {c}</option>
                  ))}
                </select>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value)}
                  className="flex-1 px-5 py-4 border border-earth-300 rounded-2xl text-lg focus:ring-2 focus:ring-tunnel-300 focus:border-tunnel-400 outline-none"
                >
                  <option value="low">Low (when you get a chance)</option>
                  <option value="medium">Medium (do this week)</option>
                  <option value="high">High (do soon)</option>
                  <option value="urgent">Urgent (do today!)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 px-5 border border-earth-300 text-earth-600 rounded-2xl text-lg font-semibold hover:bg-earth-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle}
                  className="flex-1 py-4 px-5 bg-tunnel-600 text-white rounded-2xl text-lg font-bold disabled:opacity-50 border border-tunnel-700 shadow-sm hover:bg-tunnel-700 transition-colors"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function TaskCard({ task, onComplete, onDelete, isOverdue }: { task: Task; onComplete: (id: number) => void; onDelete: (id: number) => void; isOverdue?: boolean }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <div className={`flex items-start gap-4 bg-white rounded-2xl px-5 py-4 transition-colors card-texture ${
      isOverdue ? 'border-2 border-red-300 bg-red-50/30' :
      task.priority === 'urgent' ? 'border-2 border-red-300' :
      task.priority === 'high' ? 'border-2 border-amber-300' :
      'border border-earth-200'
    }`}>
      {!task.isCompleted ? (
        <button
          onClick={() => onComplete(task.id)}
          className="w-8 h-8 !min-h-0 p-0 mt-0.5 rounded-full border-2 border-earth-300 hover:border-tunnel-500 hover:bg-tunnel-50 flex-shrink-0 transition-colors"
        />
      ) : (
        <div className="w-8 h-8 aspect-square mt-0.5 rounded-full bg-tunnel-100 flex items-center justify-center flex-shrink-0 text-tunnel-600 text-lg font-bold">
          {'\u2713'}
        </div>
      )}
      <span className="text-2xl flex-shrink-0 mt-0.5">
        {categoryIcons[task.category] || '\u{1F4CC}'}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-lg font-bold ${task.isCompleted ? 'line-through text-earth-500' : 'text-earth-800'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-base text-earth-600 mt-1 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {task.dueDate && (
            <span className={`text-base font-semibold ${isOverdue ? 'text-red-600' : 'text-earth-600'}`}>
              {new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {task.isAiGenerated && (
            <span className="text-sm font-semibold text-earth-500 bg-earth-50 px-3 py-1 rounded-2xl border border-earth-200">{'\u{1F9E0}'} AI</span>
          )}
          <span className={`text-sm font-semibold px-3 py-1 rounded-2xl capitalize border ${
            task.priority === 'urgent' ? 'bg-red-50 text-red-600 border-red-200' :
            task.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            task.priority === 'low' ? 'bg-earth-50 text-earth-500 border-earth-200' :
            'bg-earth-50 text-earth-600 border-earth-200'
          }`}>
            {task.priority}
          </span>
        </div>
      </div>
      {confirmingDelete ? (
        <button
          onClick={() => onDelete(task.id)}
          className="self-center flex-shrink-0 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors px-2 py-1"
        >
          Delete?
        </button>
      ) : (
        <button
          onClick={() => setConfirmingDelete(true)}
          className="self-center flex-shrink-0 text-earth-300 hover:text-red-500 transition-colors px-2 py-1"
          title="Delete task"
        >
          {'\u2715'}
        </button>
      )}
    </div>
  );
}
