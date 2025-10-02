📖 Resumo do Projeto – Plataforma EAD Desktop (Tauri + React + SQLite + mpv/VLC)
💡 Ideia

Construir um aplicativo desktop offline (Windows e macOS) para organizar e assistir cursos em vídeo baixados.
A interface imita uma plataforma EAD moderna, mas roda 100% localmente.
Diferencial: uso de player nativo (mpv ou VLC) para máxima performance.

🎯 Objetivos

Detectar automaticamente pastas locais de cursos.

Exibir lista de cursos, módulos e aulas.

Reproduzir vídeos com aceleração de GPU e suporte a múltiplos formatos (mpv/VLC).

Salvar progresso de cada vídeo no SQLite (ex.: “Aula 2 parada em 13:45”).

Interface intuitiva com barra de progresso e seção “Continuar assistindo”.

Rodar totalmente offline, sem servidor web.

📦 Tecnologias

Frontend (UI): React + Vite

Backend (core): Tauri (Rust)

Funções via invoke() para leitura de cursos, progresso e controle de player

Player nativo:

mpv (bindings em Rust, leve, usado em IINA/Celluloid)

ou libVLC (bindings em Rust, suporte completo, binário maior)

Banco: SQLite (persistência leve, embutida)

🛠️ Estrutura do Projeto
meu-ead-app/
├── src/                # Frontend React
│   ├── pages/          # Home, Course, Player
│   ├── components/     # Sidebar, Navbar, VideoControls
│   ├── api/api.js      # Chamadas Tauri.invoke
│   └── styles/         
│
├── src-tauri/          # Backend Tauri (Rust)
│   ├── main.rs         # Inicializa Tauri
│   ├── commands.rs     # Funções expostas ao React
│   ├── db.rs           # Integração SQLite
│   ├── fs.rs           # Leitura de pastas/arquivos
│   ├── video_mpv.rs    # Player nativo com mpv
│   └── video_vlc.rs    # (opcional) Player nativo com VLC
│
├── package.json
└── tauri.conf.json     # Configuração do app (nome, ícone, bundle)

🚀 Funcionalidades Principais

Exploração de cursos: leitura de pastas locais via backend.

Progresso salvo: tempo assistido persistido em SQLite.

Player nativo (mpv/VLC):

Suporte total a formatos e codecs (MKV, MP4, AVI, HEVC, AV1).

Legendas externas, múltiplos áudios, aceleração por GPU.

Comandos via React: play, pause, seek, toggle legendas.

Interface estilo plataforma: sidebar com módulos, player central, status de aula.

Experiência avançada: dark mode, busca por curso, continuar assistindo.

🔧 Fluxo de Uso

Usuário abre app → Tauri lista cursos.

React exibe cursos com progresso.

Ao iniciar uma aula → frontend chama invoke("play_video", { path }).

Backend Rust abre o arquivo no mpv/VLC embutido.

Controles (pause, seek, volume) são enviados via comandos Tauri.

Progresso é salvo continuamente no SQLite.

Ao reabrir, usuário retoma de onde parou.

✅ Resultado

Um aplicativo desktop multiplataforma que combina:

Organização de cursos locais,

Persistência de progresso,

Reprodução profissional de vídeo (mpv/VLC),

Interface moderna e fluida (React + Vite),

Rodando rápido e leve com Tauri, 100% offline.