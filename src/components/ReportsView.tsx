import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from 'lucide-react';
import { MUSCLE_GROUPS } from '../data/catalog';
import { AppDataState, BackupPayload, Exercise, WorkoutLog } from '../types/workout';
import {
  buildBackupPayload,
  generateCSVReport,
  parseAndValidateBackupJSON,
  triggerFileDownload,
} from '../services/storage';
import {
  DAY_NAMES_FULL,
  formatDateBR,
  formatKg,
  formatShortDateBR,
  getDayOfWeekFromISO,
  getTodayISO,
  parseLocalISODate,
} from '../utils/validation';
import { ExerciseImage } from './ExerciseImage';

interface ReportsViewProps {
  state: AppDataState;
  exercisesMap: Map<string, Exercise>;
  onImportBackup: (payload: BackupPayload, mode: 'merge' | 'replace') => void;
  onNotify: (message: string) => void;
}

type PeriodFilter = '7d' | '30d' | '90d' | 'all';

export function ReportsView({
  state,
  exercisesMap,
  onImportBackup,
  onNotify,
}: ReportsViewProps) {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selectedDayModalDate, setSelectedDayModalDate] = useState<string | null>(null);

  // Import/Export UI states
  const [showJsonTextModal, setShowJsonTextModal] = useState(false);
  const [jsonExportPreview, setJsonExportPreview] = useState('');
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<{ payload: BackupPayload; error?: string } | null>(
    null
  );
  const [importError, setImportError] = useState('');

  const filteredLogs = useMemo(() => {
    const today = parseLocalISODate(getTodayISO()).getTime();
    const maxDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : Infinity;

    return state.logs
      .filter((log) => {
        if (groupFilter !== 'all' && log.muscleGroupId !== groupFilter) return false;
        if (maxDays !== Infinity) {
          const logTime = parseLocalISODate(log.date).getTime();
          const diffDays = (today - logTime) / (1000 * 60 * 60 * 24);
          if (diffDays > maxDays || diffDays < -1) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt));
  }, [state.logs, period, groupFilter]);

  // Daily exercise count bar series (up to 14 most recent active days in filter)
  const dailyExerciseSeries = useMemo(() => {
    const byDate = new Map<string, WorkoutLog[]>();
    for (const log of filteredLogs) {
      const list = byDate.get(log.date) || [];
      list.push(log);
      byDate.set(log.date, list);
    }

    return Array.from(byDate.entries())
      .map(([date, logsForDate]) => {
        const dayOfWeek = getDayOfWeekFromISO(date);
        const scheduledForDay = state.scheduledItems.filter((item) => item.dayOfWeek === dayOfWeek);
        const totalScheduled = scheduledForDay.length;
        const completedScheduledCount =
          totalScheduled > 0
            ? scheduledForDay.filter((item) =>
                logsForDate.some(
                  (l) => l.scheduledItemId === item.id || l.exerciseId === item.exerciseId
                )
              ).length
            : logsForDate.length;

        const isComplete =
          totalScheduled === 0
            ? logsForDate.length > 0
            : completedScheduledCount >= totalScheduled;

        return {
          date,
          dayOfWeek,
          count: logsForDate.length,
          totalScheduled,
          completedScheduledCount,
          isComplete,
          logs: logsForDate,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [filteredLogs, state.scheduledItems]);

  // Muscle group breakdown (only exercise count)
  const muscleDistribution = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const g of MUSCLE_GROUPS) {
      map.set(g.id, { id: g.id, name: g.shortName, count: 0 });
    }
    for (const log of filteredLogs) {
      const entry = map.get(log.muscleGroupId) || {
        id: log.muscleGroupId,
        name: log.muscleGroupId,
        count: 0,
      };
      entry.count += 1;
      map.set(log.muscleGroupId, entry);
    }
    return Array.from(map.values())
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredLogs]);

  const selectedDayData = useMemo(() => {
    if (!selectedDayModalDate) return null;
    return dailyExerciseSeries.find((d) => d.date === selectedDayModalDate) || null;
  }, [selectedDayModalDate, dailyExerciseSeries]);

  const handleExportJSON = async () => {
    const payload = buildBackupPayload(state);
    const json = JSON.stringify(payload, null, 2);
    const filename = `forjafit-backup-${getTodayISO()}.json`;
    const ok = await triggerFileDownload(json, filename, 'application/json');
    if (ok) {
      onNotify('Backup JSON exportado.');
    }
    setJsonExportPreview(json);
  };

  const handleExportCSV = async () => {
    if (state.logs.length === 0) {
      onNotify('Conclua pelo menos 1 exercício antes de exportar o CSV.');
      return;
    }
    const csv = generateCSVReport(state);
    const filename = `forjafit-relatorio-${getTodayISO()}.csv`;
    const ok = await triggerFileDownload(csv, filename, 'text/csv;charset=utf-8;');
    if (ok) {
      onNotify('Relatório CSV exportado.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setImportText(content);
      const parsed = parseAndValidateBackupJSON(content);
      if (!parsed.valid || !parsed.payload) {
        setImportError(parsed.error || 'Arquivo inválido.');
        setImportPreview(null);
      } else {
        setImportError('');
        setImportPreview({ payload: parsed.payload });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleValidatePastedJSON = () => {
    const parsed = parseAndValidateBackupJSON(importText);
    if (!parsed.valid || !parsed.payload) {
      setImportError(parsed.error || 'JSON inválido.');
      setImportPreview(null);
    } else {
      setImportError('');
      setImportPreview({ payload: parsed.payload });
    }
  };

  const maxDailyCount = Math.max(1, ...dailyExerciseSeries.map((d) => d.count));
  const maxMuscleCount = Math.max(1, ...muscleDistribution.map((m) => m.count));

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Relatórios e backup</h1>
          <p className="text-sm text-slate-400">
            Acompanhe exercícios treinados por dia, distribuição por grupo muscular e porte seus dados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#121824] border border-white/10 max-w-full">
            {(
              [
                { id: '7d', label: '7 dias' },
                { id: '30d', label: '30 dias' },
                { id: '90d', label: '90 dias' },
                { id: 'all', label: 'Tudo' },
              ] as { id: PeriodFilter; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  period === opt.id ? 'bg-[#A3E635] text-[#090D14] font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filtrar por grupo muscular"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl bg-[#121824] border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-[#A3E635]"
          >
            <option value="all">Todos os grupos</option>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Charts Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
        {/* Chart 1: Daily Exercises Count */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121824] border border-white/10 space-y-4 min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">
                Quantidade de exercícios treinados no dia
              </h2>
              <p className="text-xs text-slate-400">
                Toque em uma barra para ver o resumo do dia
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-300 shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
                <span>Dia completo</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                <span>Parcial</span>
              </span>
            </div>
          </div>

          {dailyExerciseSeries.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-xl p-4">
              Nenhum exercício concluído no período selecionado. Conclua atividades na aba Hoje para gerar gráficos.
            </div>
          ) : (
            <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-4">
              {dailyExerciseSeries.map((d) => {
                const heightPct = Math.max(12, Math.round((d.count / maxDailyCount) * 100));
                const isSelected = selectedDayModalDate === d.date;
                const barColorClass = d.isComplete
                  ? isSelected
                    ? 'bg-emerald-300'
                    : 'bg-emerald-400/90 group-hover:bg-emerald-400'
                  : isSelected
                    ? 'bg-amber-300'
                    : 'bg-amber-400/90 group-hover:bg-amber-400';

                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelectedDayModalDate(d.date)}
                    className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1.5 group focus:outline-none"
                    title={`${formatDateBR(d.date)}: ${d.count} exercício(s)`}
                  >
                    <span className="text-[10px] font-mono text-slate-300 tabular-nums">
                      {d.count}
                    </span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-lg transition-colors ${barColorClass}`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums truncate max-w-full">
                      {formatShortDateBR(d.date)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Muscle Group Distribution */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121824] border border-white/10 space-y-4 min-w-0 overflow-hidden">
          <div>
            <h2 className="text-base font-semibold text-white">Distribuição por grupo muscular</h2>
            <p className="text-xs text-slate-400">Exercícios concluídos por grupo</p>
          </div>

          {muscleDistribution.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-xl p-4">
              Sem dados musculares neste período.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {muscleDistribution.map((m) => {
                const pct = Math.max(8, Math.round((m.count / maxMuscleCount) * 100));
                return (
                  <div key={m.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-200 truncate">{m.name}</span>
                      <span className="font-mono text-slate-400 tabular-nums shrink-0">
                        {m.count} {m.count === 1 ? 'exercício' : 'exercícios'}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#090D14] overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-[#A3E635]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Export / Import Section */}
      <section className="p-4 sm:p-5 rounded-2xl bg-[#121824] border border-white/10 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">Exportar e importar dados locais</h2>
          <p className="text-xs text-slate-400">
            Salve cópias da sua agenda ABCDE e histórico em JSON ou exporte relatórios em CSV para planilhas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={handleExportJSON}
            className="min-h-[48px] px-4 rounded-xl bg-[#A3E635] text-[#090D14] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#b5f24b] transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar backup (.json)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="min-h-[48px] px-4 rounded-xl bg-[#1A2233] border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:border-[#A3E635]/50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#A3E635]" />
            <span>Exportar planilha (.csv)</span>
          </button>

          <label className="min-h-[48px] px-4 rounded-xl bg-[#1A2233] border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:border-[#A3E635]/50 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-[#A3E635]" />
            <span>Importar arquivo (.json)</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* WebView-friendly text export/import fallback */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              const payload = buildBackupPayload(state);
              setJsonExportPreview(JSON.stringify(payload, null, 2));
              setShowJsonTextModal((v) => !v);
            }}
            className="text-xs font-medium text-[#A3E635] hover:underline py-1"
          >
            {showJsonTextModal ? 'Ocultar importação/cópia por texto (WebView)' : 'Importar ou copiar JSON por texto (ideal para WebView)'}
          </button>
        </div>

        {showJsonTextModal && (
          <div className="p-4 rounded-xl bg-[#090D14] border border-white/10 space-y-4">
            {jsonExportPreview && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">JSON atual para cópia</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(jsonExportPreview);
                        onNotify('JSON copiado para a área de transferência.');
                      } catch {
                        onNotify('Selecione e copie o texto abaixo.');
                      }
                    }}
                    className="min-h-[36px] px-3 rounded-lg bg-[#1A2233] text-xs text-white flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#A3E635]" />
                    <span>Copiar</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={4}
                  value={jsonExportPreview}
                  className="w-full p-2.5 rounded-lg bg-[#121824] border border-white/10 text-[11px] font-mono text-slate-300"
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="paste-json" className="block text-xs font-medium text-slate-300">
                Colar JSON de backup para importar
              </label>
              <textarea
                id="paste-json"
                rows={4}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='Cole aqui o conteúdo do arquivo .json exportado...'
                className="w-full p-2.5 rounded-lg bg-[#121824] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-[#A3E635]"
              />
              <button
                type="button"
                onClick={handleValidatePastedJSON}
                className="min-h-[44px] px-4 rounded-xl bg-[#1A2233] border border-white/15 text-xs font-semibold text-white hover:border-[#A3E635]"
              >
                Validar JSON colado
              </button>
            </div>
          </div>
        )}

        {importError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {importPreview && (
          <div className="p-4 rounded-xl bg-[#090D14] border border-[#A3E635]/40 space-y-3">
            <p className="text-sm font-semibold text-white">Backup validado e pronto para importar</p>
            <p className="text-xs text-slate-300 font-mono tabular-nums">
              {importPreview.payload.scheduledItems.length} itens na agenda ·{' '}
              {importPreview.payload.customExercises.length} exercícios customizados ·{' '}
              {importPreview.payload.logs.length} registros concluídos
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onImportBackup(importPreview.payload, 'merge');
                  setImportPreview(null);
                  setImportText('');
                }}
                className="min-h-[44px] px-4 rounded-xl bg-[#A3E635] text-[#090D14] text-xs font-semibold flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Mesclar com dados atuais</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onImportBackup(importPreview.payload, 'replace');
                  setImportPreview(null);
                  setImportText('');
                }}
                className="min-h-[44px] px-4 rounded-xl bg-amber-500 text-[#090D14] text-xs font-semibold"
              >
                Substituir tudo
              </button>
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="min-h-[44px] px-4 rounded-xl border border-white/15 text-xs text-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal resumo dos exercícios concluídos no dia */}
      {selectedDayData && (
        <div
          className="fixed inset-0 z-50 pt-safe-top flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm overflow-x-clip"
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-summary-modal-title"
        >
          <div className="w-full max-w-full md:max-w-lg min-w-0 bg-[#121824] border-t md:border border-white/10 rounded-t-3xl md:rounded-2xl max-h-full flex flex-col overflow-hidden">
            <div className="md:hidden w-10 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 shrink-0" />

            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-white/10 shrink-0 min-w-0">
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-medium truncate ${
                    selectedDayData.isComplete ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {DAY_NAMES_FULL[selectedDayData.dayOfWeek]} ·{' '}
                  <span className="font-mono tabular-nums">{formatDateBR(selectedDayData.date)}</span>
                </p>
                <h2
                  id="day-summary-modal-title"
                  className="text-base sm:text-lg font-bold text-white truncate"
                >
                  Exercícios concluídos ({selectedDayData.count})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayModalDate(null)}
                aria-label="Fechar resumo do dia"
                className="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto overflow-x-hidden px-4 sm:px-5 py-4 space-y-3 min-w-0">
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  selectedDayData.isComplete
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {selectedDayData.totalScheduled > 0
                    ? selectedDayData.isComplete
                      ? `Todos os ${selectedDayData.totalScheduled} exercícios programados para o dia foram concluídos.`
                      : `Concluído parcialmente: ${selectedDayData.completedScheduledCount} de ${selectedDayData.totalScheduled} exercícios programados.`
                    : `${selectedDayData.count} exercício(s) registrado(s) neste dia.`}
                </span>
              </div>

              <div className="space-y-2.5">
                {selectedDayData.logs.map((log) => {
                  const ex = exercisesMap.get(log.exerciseId);
                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[#090D14] border border-white/10 flex items-center gap-3 min-w-0"
                    >
                      {ex && (
                        <ExerciseImage
                          src={ex.imagePath}
                          alt={ex.name}
                          aspectClass="w-16 h-12 shrink-0"
                          className="rounded-lg border border-white/10"
                        />
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-semibold text-white truncate">
                          {ex?.name || log.exerciseId}
                        </p>
                        {ex && (
                          <p className="text-xs text-slate-400 truncate">{ex.primaryMuscle}</p>
                        )}
                        <p className="text-xs font-mono text-[#A3E635] tabular-nums">
                          {log.sets} séries × {log.reps} reps
                          {log.loadKg > 0 ? ` · ${formatKg(log.loadKg)}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-4 sm:px-5 py-3.5 border-t border-white/10 pb-safe shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDayModalDate(null)}
                className="w-full min-h-[46px] rounded-xl bg-[#1A2233] border border-white/10 text-sm font-semibold text-white hover:border-[#A3E635]/50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
