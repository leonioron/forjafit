import React, { useState } from 'react';
import { AlertCircle, Check, ImagePlus, X } from 'lucide-react';
import { MUSCLE_GROUPS } from '../data/catalog';
import { Exercise } from '../types/workout';
import { generateId } from '../utils/validation';

interface CustomExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (exercise: Exercise) => void;
}

export function CustomExerciseModal({ isOpen, onClose, onCreate }: CustomExerciseModalProps) {
  const [name, setName] = useState('');
  const [muscleGroupId, setMuscleGroupId] = useState(MUSCLE_GROUPS[0].id);
  const [primaryMuscle, setPrimaryMuscle] = useState('');
  const [secondaryMuscles, setSecondaryMuscles] = useState('');
  const [equipment, setEquipment] = useState('');
  const [execution, setExecution] = useState('');
  const [tip, setTip] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 720;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setImagePath(canvas.toDataURL('image/jpeg', 0.8));
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !primaryMuscle.trim() || !equipment.trim() || !execution.trim()) {
      setError('Preencha nome, músculo principal, equipamento e descrição de execução.');
      return;
    }

    const group = MUSCLE_GROUPS.find((g) => g.id === muscleGroupId);
    const created: Exercise = {
      id: generateId('custom'),
      code: 'C',
      muscleGroupId,
      name: name.trim(),
      primaryMuscle: primaryMuscle.trim(),
      secondaryMuscles: secondaryMuscles.trim() || 'Não especificado',
      equipment: equipment.trim(),
      execution: execution.trim(),
      tip: tip.trim() || 'Mantenha o controle do movimento em todas as repetições.',
      imagePath: imagePath || group?.anatomyImagePath || '/exercises/group_01_peitoral.jpg',
      isCustom: true,
    };

    onCreate(created);
    setName('');
    setPrimaryMuscle('');
    setSecondaryMuscles('');
    setEquipment('');
    setExecution('');
    setTip('');
    setImagePath('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 pt-safe-top flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm overflow-x-clip"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-ex-title"
    >
      <div className="w-full max-w-full md:max-w-lg min-w-0 bg-[#121824] border-t md:border border-white/10 rounded-t-3xl md:rounded-2xl max-h-full flex flex-col overflow-hidden">
        <div className="md:hidden w-10 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 shrink-0" />
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-white/10 shrink-0 min-w-0">
          <h2 id="custom-ex-title" className="text-base sm:text-lg font-bold text-white truncate min-w-0 flex-1">
            Novo exercício personalizado
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto overflow-x-hidden px-4 sm:px-5 py-4 space-y-4 min-w-0">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="cx-name" className="block text-xs font-medium text-slate-300 mb-1">
              Nome do exercício <span className="text-red-400">*</span>
            </label>
            <input
              id="cx-name"
              type="text"
              required
              placeholder="Ex.: Supino declinado com barra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#090D14] border border-white/15 text-sm text-white focus:outline-none focus:border-[#A3E635]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cx-group" className="block text-xs font-medium text-slate-300 mb-1">
                Grupo muscular <span className="text-red-400">*</span>
              </label>
              <select
                id="cx-group"
                value={muscleGroupId}
                onChange={(e) => setMuscleGroupId(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-[#090D14] border border-white/15 text-sm text-white focus:outline-none focus:border-[#A3E635]"
              >
                {MUSCLE_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cx-equip" className="block text-xs font-medium text-slate-300 mb-1">
                Equipamento <span className="text-red-400">*</span>
              </label>
              <input
                id="cx-equip"
                type="text"
                required
                placeholder="Ex.: Barra e banco"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#090D14] border border-white/15 text-sm text-white focus:outline-none focus:border-[#A3E635]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cx-primary" className="block text-xs font-medium text-slate-300 mb-1">
                Músculo principal <span className="text-red-400">*</span>
              </label>
              <input
                id="cx-primary"
                type="text"
                required
                placeholder="Ex.: Peitoral inferior"
                value={primaryMuscle}
                onChange={(e) => setPrimaryMuscle(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#090D14] border border-white/15 text-sm text-white focus:outline-none focus:border-[#A3E635]"
              />
            </div>
            <div>
              <label htmlFor="cx-sec" className="block text-xs font-medium text-slate-300 mb-1">
                Músculos secundários
              </label>
              <input
                id="cx-sec"
                type="text"
                placeholder="Ex.: Tríceps e ombro anterior"
                value={secondaryMuscles}
                onChange={(e) => setSecondaryMuscles(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#090D14] border border-white/15 text-sm text-white focus:outline-none focus:border-[#A3E635]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cx-exec" className="block text-xs font-medium text-slate-300 mb-1">
              Descrição da execução <span className="text-red-400">*</span>
            </label>
            <textarea
              id="cx-exec"
              rows={3}
              required
              placeholder="Descreva a postura inicial e o movimento completo..."
              value={execution}
              onChange={(e) => setExecution(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-[#090D14] border border-white/15 text-sm text-white focus:outline-none focus:border-[#A3E635]"
            />
          </div>

          <div>
            <label htmlFor="cx-tip" className="block text-xs font-medium text-slate-300 mb-1">
              Dica técnica
            </label>
            <input
              id="cx-tip"
              type="text"
              placeholder="Ex.: Evite estender os cotovelos completamente"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#090D14] border border-white/15 text-sm text-white focus:outline-none focus:border-[#A3E635]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Foto do exercício (opcional — usa anatomia do grupo se vazia)
            </label>
            <label className="min-h-[46px] px-4 rounded-xl border border-dashed border-white/20 bg-[#090D14] flex items-center justify-center gap-2 text-xs font-medium text-slate-300 hover:border-[#A3E635] cursor-pointer transition-colors">
              <ImagePlus className="w-4 h-4 text-[#A3E635]" />
              <span>{imagePath ? 'Foto carregada (toque para trocar)' : 'Selecionar foto do aparelho'}</span>
              <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </label>
          </div>

          <div className="pt-2 pb-safe flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-4 rounded-xl border border-white/15 text-sm text-slate-300 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[48px] px-5 rounded-xl bg-[#A3E635] text-[#090D14] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#b5f24b]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar no catálogo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
