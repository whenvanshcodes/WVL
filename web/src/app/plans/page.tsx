'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  ListMusic, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Play, 
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { 
  getStoredPlans, 
  saveListeningPlan, 
  togglePlanItemCompletion 
} from '@/lib/storage';
import { ListeningPlan } from '@/types/music';

export default function ListeningPlansPage() {
  const { playTrack } = usePlayer();
  const [plans, setPlans] = useState<ListeningPlan[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const reload = () => setPlans(getStoredPlans());

  useEffect(() => {
    reload();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    saveListeningPlan({
      title: title.trim(),
      description: description.trim(),
      items: [],
      status: 'ACTIVE',
    });

    setTitle('');
    setDescription('');
    setIsCreating(false);
    reload();
  };

  const handleToggle = (planId: string, itemId: string) => {
    togglePlanItemCompletion(planId, itemId);
    reload();
  };

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-5 py-6 md:py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-primary-light" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Listening Plans</h1>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Curate and schedule intentional music exploration sessions
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] shrink-0"
        >
          <Plus className="w-4 h-4" />
          {isCreating ? 'Close' : 'Create New Plan'}
        </button>
      </header>

      {/* Create Plan Form */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-2xl bg-surface-card border border-primary/30 space-y-4 animate-in slide-in-from-top duration-200"
        >
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Create a Listening Plan</h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-muted block mb-1 font-mono">Plan Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Midnight Acoustic Sessions, Weekend Album Deep Dive"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-black border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs text-text-muted block mb-1 font-mono">Description (Optional)</label>
              <textarea
                rows={2}
                placeholder="Focus, mood, or context for this plan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black border border-surface-border rounded-xl px-3.5 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)]"
            >
              Create Plan
            </button>
          </div>
        </form>
      )}

      {/* Plans List */}
      <div className="space-y-6">
        {plans.length === 0 ? (
          <div className="text-center py-12 p-6 rounded-2xl bg-surface-card border border-surface-border text-text-muted text-sm">
            <ListMusic className="w-8 h-8 text-primary-light/40 mx-auto mb-2" />
            No active listening plans. Click &quot;Create New Plan&quot; to begin!
          </div>
        ) : (
          plans.map((plan) => {
            const completedCount = plan.items.filter((i) => i.completed).length;
            const progress = plan.items.length > 0 ? (completedCount / plan.items.length) * 100 : 0;

            return (
              <div
                key={plan.id}
                className="p-5 rounded-3xl bg-surface-card border border-surface-border space-y-4"
              >
                {/* Plan Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{plan.title}</h2>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          plan.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-primary/20 text-primary-light border border-primary/30'
                        }`}
                      >
                        {plan.status}
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-xs text-text-secondary mt-1">{plan.description}</p>
                    )}
                  </div>

                  {/* Progress Stats */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-xs font-mono text-text-muted">
                      {completedCount} / {plan.items.length} completed ({Math.round(progress)}%)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-surface-border overflow-hidden">
                  <div
                    style={{ width: `${progress}%` }}
                    className="h-full bg-primary-light transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                  />
                </div>

                {/* Plan Items */}
                <div className="space-y-2 pt-2">
                  {plan.items.length === 0 ? (
                    <p className="text-xs text-text-muted italic py-2">
                      No tracks added yet. Use &quot;Add to Plan&quot; in the Now Playing screen or Home to add tracks!
                    </p>
                  ) : (
                    plan.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-surface-border/60 hover:border-primary/40 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Complete Toggle Checkbox */}
                          <button
                            onClick={() => handleToggle(plan.id, item.id)}
                            className="text-text-muted hover:text-primary-light transition-colors shrink-0"
                            aria-label="Toggle completion"
                          >
                            {item.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-surface-border group-hover:text-primary-light" />
                            )}
                          </button>

                          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-surface-border">
                            <Image src={item.artworkUrl} alt={item.title} fill className="object-cover" />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-sm font-semibold truncate ${
                                item.completed ? 'line-through text-text-muted' : 'text-white'
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="text-xs text-text-secondary truncate">{item.subtitle}</span>
                          </div>
                        </div>

                        {/* Play Item */}
                        <button
                          onClick={() =>
                            playTrack({
                              id: item.id,
                              uri: item.uri,
                              title: item.title,
                              artist: item.subtitle,
                              album: '',
                              artworkUrl: item.artworkUrl,
                              durationMs: 240000,
                            })
                          }
                          className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 text-primary-light flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-[0_0_10px_rgba(59,130,246,0.2)] shrink-0"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
