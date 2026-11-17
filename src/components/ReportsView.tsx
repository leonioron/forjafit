import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Trash2,
  TrendingUp,
  Upload,
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
  formatDateBR,
  formatKg,
  formatShortDateBR,
  formatVolumeKg,
  getTodayISO,
  parseLocalISODate,
} from '../utils/validation';

interface ReportsViewProps {
  state: AppDataState;
  exercises: Exercise[];
  exercisesMap: Map<string, Exercise>;
  onDeleteLog: (logId: string) => void;
  onImportBackup: (payload: BackupPayload, mode: 'merge' | 'replace') => void;
  onNotify: (message: string) => void;
}

type PeriodFilter = '7d' | '30d' | '90d' | 'all';

export function ReportsView({
  state,
  exercises,
  exercisesMap,
  onDeleteLog,
  onImportBackup,
  onNotify,
}: ReportsViewProps) {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selectedProgressionExerciseId, setSelectedProgressionExerciseId] = useState<string>('');
  const [activeBarDate, setActiveBarDate] = useState<string | null>(null);

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

  const kpis = useMemo(() => {
    const uniqueDays = new Set(filteredLogs.map((l) => l.date)).size;
    const totalExercises = filteredLogs.length;
    const totalVolume = filteredLogs.reduce((sum, l) => sum + l.volumeKg, 0);
    const maxLoad = filteredLogs.reduce((max, l) => Math.max(max, l.loadKg), 0);
    return { uniqueDays, totalExercises, totalVolume, maxLoad };
  }, [filteredLogs]);

  // Daily volume bar series (up to 14 most recent active days in filter)
  const dailyVolumeSeries = useMemo(() => {
    const byDate = new Map<string, { date: string; volume: number; count: number }>();
    for (const log of filteredLogs) {
      const existing = byDate.get(log.date) || { date: log.date, volume: 0, count: 0 };
      existing.volume += log.volumeKg;
      existing.count += 1;
      byDate.set(log.date, existing);
    }
    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [filteredLogs]);

  // Muscle group breakdown
  const muscleDistribution = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; sets: number; volume: number }>();
    for (const g of MUSCLE_GROUPS) {
      map.set(g.id, { id: g.id, name: g.shortName, count: 0, sets: 0, volume: 0 });
    }
    for (const log of filteredLogs) {
      const entry = map.get(log.muscleGroupId) || {
        id: log.muscleGroupId,
        name: log.muscleGroupId,
        count: 0,
        sets: 0,
        volume: 0,
      };
      entry.count += 1;
      entry.sets += log.sets;
      entry.volume += log.volumeKg;
      map.set(log.muscleGroupId, entry);
    }
    return Array.from(map.values())
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredLogs]);

  // Exercises available for progression chart
  const loggedExercises = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of state.logs) {
      counts.set(l.exerciseId, (counts.get(l.exerciseId) || 0) + 1);
    }
    const list = exercises.filter((ex) => counts.has(ex.id));
    return list.length > 0 ? list : exercises.slice(0, 10);
  }, [state.logs, exercises]);

  const activeProgressionId =
    selectedProgressionExerciseId && exercisesMap.has(selectedProgressionExerciseId)
      ? selectedProgressionExerciseId
      : loggedExercises[0]?.id || '';

  const progressionPoints = useMemo(() => {
    if (!activeProgressionId) return [];
    return state.logs
      .filter((l) => l.exerciseId === activeProgressionId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.completedAt.localeCompare(b.completedAt))
      .slice(-16);
  }, [state.logs, activeProgressionId]);

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

  const maxDailyVolume = Math.max(1, ...dailyVolumeSeries.map((d) => d.volume));
  const maxMuscleCount = Math.max(1, ...muscleDistribution.map((m) => m.count));

  // SVG Line Chart geometry for progression
  const chartW = 520;
  const chartH = 160;
  const padX = 28;
  const padY = 20;
  const minLoad = progressionPoints.length > 0 ? Math.min(...progressionPoints.map((p) => p.loadKg)) : 0;
  const maxLoad = progressionPoints.length > 0 ? Math.max(...progressionPoints.map((p) => p.loadKg)) : 100;
  const loadSpan = Math.max(1, maxLoad - minLoad);

  const linePoints = progressionPoints.map((pt, i) => {
    const x =
      progressionPoints.length === 1
        ? chartW / 2
        : padX + (i / (progressionPoints.length - 1)) * (chartW - padX * 2);
    const y =
      progressionPoints.length === 1
        ? chartH / 2
        : chartH - padY - ((pt.loadKg - minLoad) / loadSpan) * (chartH - padY * 2);
    return { x, y, pt };
  });

  const polylineStr = linePoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Relatórios e backup</h1>
          <p className="text-sm text-slate-400">
            Acompanhe frequência, volume por grupo muscular, evolução de carga e porte seus dados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#121824] border border-white/10">
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

      {/* 4 KPI Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#121824] border border-white/10">
          <p className="text-xs text-slate-400">Dias treinados</p>
          <p className="text-2xl font-mono font-bold text-white tabular-nums mt-1">{kpis.uniqueDays}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#121824] border border-white/10">
          <p className="text-xs text-slate-400">Exercícios concluídos</p>
          <p className="text-2xl font-mono font-bold text-white tabular-nums mt-1">{kpis.totalExercises}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#121824] border border-white/10">
          <p className="text-xs text-slate-400">Volume total</p>
          <p className="text-2xl font-mono font-bold text-[#A3E635] tabular-nums mt-1">
            {formatVolumeKg(kpis.totalVolume)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-[#121824] border border-white/10">
          <p className="text-xs text-slate-400">Maior carga registrada</p>
          <p className="text-2xl font-mono font-bold text-white tabular-nums mt-1">
            {formatKg(kpis.maxLoad)}
          </p>
        </div>
      </section>

      {/* Charts Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Daily Volume */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121824] border border-white/10 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-white">Volume por dia de treino</h2>
              <p className="text-xs text-slate-400">Toque em uma barra para ver detalhes</p>
            </div>
            {activeBarDate && (
              <span className="text-xs font-mono text-[#A3E635] tabular-nums">
                {formatShortDateBR(activeBarDate)} ·{' '}
                {formatVolumeKg(dailyVolumeSeries.find((d) => d.date === activeBarDate)?.volume || 0)}
              </span>
            )}
          </div>

          {dailyVolumeSeries.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-xl p-4">
              Nenhum exercício concluído no período selecionado. Conclua atividades na aba Hoje para gerar gráficos.
            </div>
          ) : (
            <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-4">
              {dailyVolumeSeries.map((d) => {
                const heightPct = Math.max(8, Math.round((d.volume / maxDailyVolume) * 100));
                const isSelected = activeBarDate === d.date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setActiveBarDate(d.date)}
                    className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group focus:outline-none"
                    title={`${formatDateBR(d.date)}: ${formatVolumeKg(d.volume)} (${d.count} ex.)`}
                  >
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {d.count}
                    </span>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t-lg transition-colors ${
                          isSelected
                            ? 'bg-[#A3E635]'
                            : 'bg-[#A3E635]/65 group-hover:bg-[#A3E635]'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {formatShortDateBR(d.date)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Muscle Group Distribution */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121824] border border-white/10 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">Distribuição por grupo muscular</h2>
            <p className="text-xs text-slate-400">Exercícios concluídos e séries acumuladas</p>
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
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{m.name}</span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {m.count} ex. · {m.sets} séries · {formatVolumeKg(m.volume)}
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

      {/* Chart 3: Exercise Load Progression */}
      <section className="p-4 sm:p-5 rounded-2xl bg-[#121824] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#A3E635]" />
            <div>
              <h2 className="text-base font-semibold text-white">Evolução de carga por exercício</h2>
              <p className="text-xs text-slate-400">Histórico de carga executada (kg)</p>
            </div>
          </div>

          <select
            aria-label="Selecionar exercício para gráfico de evolução"
            value={activeProgressionId}
            onChange={(e) => setSelectedProgressionExerciseId(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl bg-[#090D14] border border-white/15 text-xs font-medium text-white focus:outline-none focus:border-[#A3E635] max-w-full sm:max-w-xs"
          >
            {loggedExercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.code} · {ex.name}
              </option>
            ))}
          </select>
        </div>

        {progressionPoints.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-xl p-4">
            Ainda não há execuções registradas para este exercício.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full min-w-[320px] h-44"
                role="img"
                aria-label="Gráfico de evolução de carga"
              >
                <line x1={padX} y1={padY} x2={chartW - padX} y2={padY} stroke="rgba(255,255,255,0.08)" />
                <line
                  x1={padX}
                  y1={chartH - padY}
                  x2={chartW - padX}
                  y2={chartH - padY}
                  stroke="rgba(255,255,255,0.12)"
                />
                {linePoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#A3E635"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineStr}
                  />
                )}
                {linePoints.map(({ x, y, pt }) => (
                  <g key={pt.id}>
                    <circle cx={x} cy={y} r="5" fill="#090D14" stroke="#A3E635" strokeWidth="2.5" />
                    <text
                      x={x}
                      y={y - 10}
                      textAnchor="middle"
                      fill="#F8FAFC"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pt.loadKg}kg
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono tabular-nums">
              <span>Mínima: {formatKg(minLoad)}</span>
              <span>Máxima: {formatKg(maxLoad)}</span>
              <span>Última: {formatKg(progressionPoints[progressionPoints.length - 1].loadKg)}</span>
            </div>
          </div>
        )}
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

      {/* Recent Logs Table */}
      <section className="p-4 sm:p-5 rounded-2xl bg-[#121824] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Histórico detalhado</h2>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {filteredLogs.length} registro(s)
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            Nenhum exercício concluído encontrado para os filtros aplicados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="py-2.5 pr-3 font-medium">Data</th>
                  <th className="py-2.5 pr-3 font-medium">Exercício</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Séries×Reps</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Carga</th>
                  <th className="py-2.5 pr-3 font-medium text-right">Volume</th>
                  <th className="py-2.5 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
                {filteredLogs.slice(0, 50).map((log: WorkoutLog) => {
                  const ex = exercisesMap.get(log.exerciseId);
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 pr-3 font-mono text-slate-300 tabular-nums whitespace-nowrap">
                        {formatShortDateBR(log.date)}
                      </td>
                      <td className="py-3 pr-3 font-medium text-white min-w-[140px]">
                        {ex?.name || log.exerciseId}
                      </td>
                      <td className="py-3 pr-3 font-mono text-slate-200 text-right tabular-nums whitespace-nowrap">
                        {log.sets}×{log.reps}
                      </td>
                      <td className="py-3 pr-3 font-mono text-slate-200 text-right tabular-nums whitespace-nowrap">
                        {formatKg(log.loadKg)}
                      </td>
                      <td className="py-3 pr-3 font-mono text-[#A3E635] text-right tabular-nums whitespace-nowrap">
                        {formatVolumeKg(log.volumeKg)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteLog(log.id)}
                          aria-label="Excluir registro"
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
