# Como gerar o APK instalável do ForjaFit Agenda

Este projeto já está configurado com **Capacitor** e com a pasta nativa `android/` pronta para gerar o `.apk` instalável com todas as 64 imagens dos exercícios e banco local (`IndexedDB`) embutidos.

## Opção 1: Pelo computador com Android Studio (ou linha de comando)

1. Instale as dependências e sincronize o build web com o projeto Android:
   ```bash
   npm install
   npm run android:sync
   ```
2. Para abrir no **Android Studio**:
   ```bash
   npm run android:open
   ```
   No Android Studio, acesse **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. Ou gere diretamente pelo terminal (com Java 21 e Android SDK instalados):
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   O arquivo gerado ficará em:
   `android/app/build/outputs/apk/debug/app-debug.apk`

## Opção 2: Gerar o APK na nuvem sem instalar Android Studio (GitHub Actions)

O repositório já inclui o workflow `.github/workflows/build-apk.yml`:
1. Envie este projeto para um repositório no GitHub.
2. Abra a aba **Actions → Build Android APK** (roda automaticamente no `push` ou via botão *Run workflow*).
3. Ao finalizar, baixe o artefato **`ForjaFit-Agenda-APK`** contendo o `app-debug.apk` pronto para instalar no seu celular Android.
