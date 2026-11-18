# ForjaFit Agenda

Aplicativo mobile-first e multiplataforma (Web e **APK Android instalável**) para organização de treinos semanais, consulta de catálogo ilustrado de musculação, registro diário de execuções e acompanhamento de relatórios com funcionamento **100% offline / local-first**.

---

## Principais funcionalidades

- **Hoje (Execução diária)**
  - Navegador semanal rápido e seletor de data.
  - Card de progresso do dia com contador e anel percentual.
  - Lista de exercícios programados para o dia com foto ilustrativa, músculo principal, equipamento e metas.
  - Modal de registro/edição de conclusão exigindo apenas **séries** e **repetições** (com carga em `kg` opcional).

- **Agenda (Divisão semanal ABCDE)**
  - Pré-configurada no formato **ABCDE** (segunda a sexta de treino, sábado e domingo como descanso), totalmente editável.
  - Edição de título/foco do dia, alternância de dia de descanso, adição de exercícios do catálogo, reordenação, edição de metas e restauração do padrão ABCDE.

- **Catálogo muscular (11 grupos · 53 exercícios)**
  - Catálogo ilustrado com **53 exercícios** distribuídos em **11 grupos musculares** e **64 imagens locais** (fotos de execução + diagramas anatômicos dos grupos).
  - Busca por nome, código, músculo ou equipamento e filtros por grupo muscular.
  - Ficha detalhada com alternância entre foto de execução e anatomia do grupo, músculos trabalhados, passo a passo, dica técnica e botão para adicionar diretamente à agenda.
  - Cadastro de **exercícios personalizados** (com suporte a upload/redimensionamento local de foto).

- **Relatórios e backup**
  - Filtros por período (`7 dias`, `30 dias`, `90 dias`, `Tudo`) e por grupo muscular.
  - **Gráfico de barras de quantidade de exercícios treinados no dia**:
    - Barra **verde**: todos os exercícios programados do dia foram concluídos;
    - Barra **amarela**: dia concluído parcialmente;
    - Ao tocar em uma barra, abre um modal com o resumo dos exercícios concluídos naquele dia.
  - **Distribuição por grupo muscular** exibindo quantidade de exercícios concluídos por grupo.
  - **Exportação e importação**:
    - Backup completo em `.json` (mesclar ou substituir dados);
    - Relatório em `.csv` para planilhas;
    - Cópia e colagem direta de JSON em texto (útil em WebViews restritos);
    - Compartilhamento nativo no Android via `@capacitor/filesystem` e `@capacitor/share`.

---

## Stack tecnológica

- **Frontend:** React 19 + TypeScript + Vite
- **Estilização:** Tailwind CSS v4 (`@tailwindcss/vite`) + Lucide React
- **Tipografia:** `Outfit` (títulos), `Plus Jakarta Sans` (interface) e `JetBrains Mono` (`tabular-nums` para métricas)
- **Persistência local:** IndexedDB (`forjafit_local_db`) com fallback automático em `localStorage`
- **Empacotamento Android:** Capacitor 8 (`com.forjafit.agenda`) + `@capacitor/android`, `@capacitor/filesystem`, `@capacitor/share`
- **CI/CD Android:** GitHub Actions (`.github/workflows/build-apk.yml`) gerando o artefato `ForjaFit-Agenda-APK` (`app-debug.apk`)

---

## Estrutura do projeto

```text
.
├── .github/
│   └── workflows/
│       └── build-apk.yml              # Workflow para compilar app-debug.apk na nuvem
├── android/                           # Projeto Android nativo gerado pelo Capacitor
│   ├── build.gradle                   # Repositórios Gradle (com mirror Maven Central do Google)
│   └── app/src/main/assets/public/    # Assets sincronizados pelo Capacitor
├── public/
│   └── exercises/                     # 64 imagens locais (11 diagramas anatômicos + 53 fotos)
├── src/
│   ├── components/
│   │   ├── CatalogView.tsx            # Busca, filtro por grupo e grade do catálogo
│   │   ├── CompleteWorkoutSheet.tsx   # Sheet/modal de registro de séries, reps e carga opcional
│   │   ├── CustomExerciseModal.tsx    # Cadastro de exercício personalizado
│   │   ├── ExerciseDetailModal.tsx    # Ficha técnica, anatomia e agendamento rápido
│   │   ├── ExerciseImage.tsx          # Componente de imagem com fallback seguro
│   │   ├── ReportsView.tsx            # Gráficos, resumo diário modal e backup JSON/CSV
│   │   ├── ScheduleTargetModal.tsx    # Modal para adicionar/editar metas na agenda
│   │   ├── ScheduleView.tsx           # Editor semanal ABCDE
│   │   └── TodayView.tsx              # Tela principal de treinos do dia
│   ├── data/
│   │   └── catalog.ts                 # 11 grupos musculares, 53 exercícios e split ABCDE padrão
│   ├── services/
│   │   └── storage.ts                 # Persistência IndexedDB/localStorage + export/import JSON/CSV
│   ├── types/
│   │   └── workout.ts                 # Tipagens TypeScript do domínio
│   ├── utils/
│   │   └── validation.ts              # Validações de campos, datas locais e formatação
│   ├── App.tsx                        # Shell principal, navegação inferior/superior e safe-area
│   ├── index.css                      # Tema escuro, overflow-x: clip e --app-safe-top (32px)
│   └── main.tsx
├── BUILD_APK.md                       # Guia rápido de geração do APK
├── capacitor.config.ts                # Configuração do Capacitor (appId, webDir, backgroundColor)
├── index.html                         # Viewport cover e metadados HTML
└── package.json
```

---

## Como executar localmente (Web)

1. Instale as dependências:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Inicie o servidor de desenvolvimento na porta `3000`:
   ```bash
   npm run dev
   ```
3. Para validar tipos e build de produção:
   ```bash
   npm run lint
   npm run build
   ```

---

## Como gerar o APK Android

Consulte também o guia resumido em [`BUILD_APK.md`](./BUILD_APK.md).

### Opção 1: Via GitHub Actions (sem Android Studio)
1. Envie o projeto para um repositório no GitHub (`main` ou `master`).
2. Acesse **Actions → Build Android APK** (executa no `push` ou manualmente via **Run workflow**).
3. Ao final da execução, baixe o artefato **`ForjaFit-Agenda-APK`** e instale o `app-debug.apk` no celular Android.

### Opção 2: Localmente com Android Studio / Gradle
1. Gere o bundle web e sincronize com o projeto nativo:
   ```bash
   npm run android:sync
   ```
2. Abra o projeto no Android Studio ou compile direto pelo terminal (Java 21 + Android SDK):
   ```bash
   npm run android:open
   # ou:
   cd android && ./gradlew assembleDebug
   ```
   O APK será gerado em `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## Decisões técnicas de compatibilidade Mobile / WebView

- **Safe-area superior mínima de `32px`**: definida via `--app-safe-top: max(32px, env(safe-area-inset-top, 0px))` com faixa fixa de proteção no topo e aplicada em modais (`pt-safe-top`), evitando sobreposição pela barra de notificações do Android.
- **Bloqueio horizontal sem travar rolagem vertical**: uso de `overflow-x: clip` (em vez de `overflow-x: hidden`) no `html`, `body` e container raiz, somado a `min-w-0` em grids/flex/inputs, preservando a barra de rolagem principal e o cabeçalho `sticky`.
- **Estabilidade do build Gradle na nuvem**: espelho `https://maven-central.storage-download.googleapis.com/maven2/` configurado em `android/build.gradle` e via `init.d` no workflow para evitar falhas `HTTP 429` do Maven Central.
