import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { MUSCLE_GROUPS } from '../data/catalog';
import { Exercise } from '../types/workout';
import { ExerciseImage } from './ExerciseImage';

interface CatalogViewProps {
  exercises: Exercise[];
  onSelectExercise: (exercise: Exercise) => void;
  onOpenNewExerciseModal: () => void;
}

export function CatalogView({
  exercises,
  onSelectExercise,
  onOpenNewExerciseModal,
}: CatalogViewProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [query, setQuery] = useState('');

  const activeGroup = MUSCLE_GROUPS.find((g) => g.id === selectedGroupId);

  const filtered = exercises.filter((ex) => {
    const matchGroup = selectedGroupId === 'all' || ex.muscleGroupId === selectedGroupId;
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      ex.name.toLowerCase().includes(q) ||
      ex.primaryMuscle.toLowerCase().includes(q) ||
      ex.secondaryMuscles.toLowerCase().includes(q) ||
      ex.equipment.toLowerCase().includes(q) ||
      ex.code.toLowerCase().includes(q);
    return matchGroup && matchQuery;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Catálogo muscular</h1>
          <p className="text-sm text-slate-400">
            {exercises.length} exercícios ilustrados em 11 grupos musculares com execução e dicas.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewExerciseModal}
          className="min-h-[44px] px-4 rounded-xl bg-[#A3E635] text-[#090D14] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#b5f24b] transition-colors shrink-0 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo exercício</span>
        </button>
      </div>

      {/* Search & Muscle Group Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, músculo ou equipamento..."
            className="w-full min-h-[46px] pl-10 pr-4 rounded-xl bg-[#121824] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#A3E635]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedGroupId('all')}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              selectedGroupId === 'all'
                ? 'bg-[#A3E635] text-[#090D14] font-semibold'
                : 'bg-[#121824] border border-white/10 text-slate-300 hover:bg-[#1A2233]'
            }`}
          >
            Todos ({exercises.length})
          </button>
          {MUSCLE_GROUPS.map((group) => {
            const count = exercises.filter((e) => e.muscleGroupId === group.id).length;
            const active = selectedGroupId === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(group.id)}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#A3E635] text-[#090D14] font-semibold'
                    : 'bg-[#121824] border border-white/10 text-slate-300 hover:bg-[#1A2233]'
                }`}
              >
                {group.order}. {group.shortName} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Group Anatomy Spotlight when a specific group is selected */}
      {activeGroup && (
        <section className="p-4 rounded-2xl bg-[#121824] border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <ExerciseImage
            src={activeGroup.anatomyImagePath}
            alt={`Anatomia ${activeGroup.name}`}
            aspectClass="aspect-[16/10]"
            className="rounded-xl border border-white/10"
          />
          <div className="md:col-span-2 space-y-2">
            <h2 className="text-lg font-bold text-white">
              {activeGroup.order}. {activeGroup.name}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">{activeGroup.description}</p>
            <p className="text-xs text-slate-400">
              {activeGroup.subMuscles.join(' · ')}
            </p>
          </div>
        </section>
      )}

      {/* Exercises Grid */}
      {filtered.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#121824] border border-white/10 text-center space-y-2">
          <p className="text-sm text-slate-300">Nenhum exercício encontrado para esta busca.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedGroupId('all');
            }}
            className="min-h-[44px] px-4 rounded-xl bg-[#1A2233] text-xs font-medium text-[#A3E635]"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ex) => {
            const group = MUSCLE_GROUPS.find((g) => g.id === ex.muscleGroupId);
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => onSelectExercise(ex)}
                className="text-left rounded-2xl bg-[#121824] border border-white/10 overflow-hidden hover:border-[#A3E635]/50 transition-colors flex flex-col group"
              >
                <ExerciseImage
                  src={ex.imagePath}
                  alt={ex.name}
                  aspectClass="aspect-[16/10]"
                  className="w-full border-b border-white/10"
                />
                <div className="p-4 flex-1 flex flex-col justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 truncate">
                      {ex.code} · {group?.shortName || ex.muscleGroupId} · {ex.equipment}
                    </p>
                    <h3 className="text-base font-semibold text-white group-hover:text-[#A3E635] transition-colors leading-snug">
                      {ex.name}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-2">{ex.execution}</p>
                  </div>
                  <p className="text-xs font-medium text-[#A3E635] pt-1">
                    Ver foto, técnica e agendar →
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
