# 📊 Sistema de Banco de Dados SQLite - ReprodLocal

## 🎯 Visão Geral

O ReprodLocal utiliza um sistema robusto de banco de dados SQLite para armazenar o progresso do usuário, anotações pessoais, configurações e histórico de atividades. O banco é criado automaticamente durante a instalação e inclui um sistema de migração automática para futuras atualizações.

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### 📚 **courses** - Cursos
Armazena informações sobre os cursos disponíveis.
```sql
- id (TEXT PRIMARY KEY) - Identificador único
- name (TEXT) - Nome do curso
- description (TEXT) - Descrição do curso
- path (TEXT) - Caminho no sistema de arquivos
- total_modules (INTEGER) - Total de módulos
- total_videos (INTEGER) - Total de vídeos
- created_at (TEXT) - Data de criação
- last_accessed (TEXT) - Último acesso
```

#### 📖 **modules** - Módulos
Representa os módulos dentro de cada curso.
```sql
- id (TEXT PRIMARY KEY) - Identificador único
- course_id (TEXT) - Referência ao curso
- name (TEXT) - Nome do módulo
- description (TEXT) - Descrição do módulo
- path (TEXT) - Caminho no sistema de arquivos
- order_index (INTEGER) - Ordem de exibição
- total_videos (INTEGER) - Total de vídeos
- created_at (TEXT) - Data de criação
```

#### 🎥 **videos** - Vídeos
Contém informações sobre os vídeos de cada módulo.
```sql
- id (TEXT PRIMARY KEY) - Identificador único
- module_id (TEXT) - Referência ao módulo
- course_id (TEXT) - Referência ao curso
- name (TEXT) - Nome do vídeo
- description (TEXT) - Descrição do vídeo
- file_path (TEXT) - Caminho do arquivo
- duration (REAL) - Duração em segundos
- file_size (INTEGER) - Tamanho do arquivo
- order_index (INTEGER) - Ordem de exibição
- created_at (TEXT) - Data de criação
```

#### ⏯️ **video_progress** - Progresso dos Vídeos
Rastreia o progresso de visualização de cada vídeo.
```sql
- id (TEXT PRIMARY KEY) - Identificador único
- video_id (TEXT) - Referência ao vídeo
- current_time (REAL) - Tempo atual de parada
- duration (REAL) - Duração total
- completed (BOOLEAN) - Se foi completado
- last_watched (TEXT) - Data da última visualização
- watch_count (INTEGER) - Número de visualizações
```

### Tabelas de Funcionalidades Avançadas

#### 📝 **user_notes** - Anotações do Usuário
Permite que o usuário faça anotações em pontos específicos dos vídeos.
```sql
- id (TEXT PRIMARY KEY) - Identificador único
- video_id (TEXT) - Referência ao vídeo
- course_id (TEXT) - Referência ao curso
- module_id (TEXT) - Referência ao módulo
- timestamp (REAL) - Momento do vídeo (em segundos)
- title (TEXT) - Título da anotação
- content (TEXT) - Conteúdo da anotação
- note_type (TEXT) - Tipo: 'note', 'question', 'important'
- created_at (TEXT) - Data de criação
- updated_at (TEXT) - Data da última atualização
```

#### 🔖 **video_bookmarks** - Marcadores de Vídeo
Permite marcar pontos importantes nos vídeos para acesso rápido.
```sql
- id (TEXT PRIMARY KEY) - Identificador único
- video_id (TEXT) - Referência ao vídeo
- timestamp (REAL) - Momento do vídeo (em segundos)
- title (TEXT) - Título do marcador
- description (TEXT) - Descrição opcional
- created_at (TEXT) - Data de criação
```

#### ⚙️ **user_settings** - Configurações do Usuário
Armazena preferências e configurações personalizadas.
```sql
- id (TEXT PRIMARY KEY) - Identificador único
- setting_key (TEXT UNIQUE) - Chave da configuração
- setting_value (TEXT) - Valor da configuração
- setting_type (TEXT) - Tipo: 'string', 'boolean', 'number'
- updated_at (TEXT) - Data da última atualização
```

#### 📋 **activity_log** - Log de Atividades
Registra todas as ações do usuário para análise e histórico.
```sql
- id (TEXT PRIMARY KEY) - Identificador único
- activity_type (TEXT) - Tipo de atividade
- entity_id (TEXT) - ID da entidade relacionada
- entity_type (TEXT) - Tipo da entidade
- details (TEXT) - Detalhes da atividade
- created_at (TEXT) - Data da atividade
```

#### 🔧 **database_metadata** - Metadados do Banco
Controla versões e metadados do sistema.
```sql
- key (TEXT PRIMARY KEY) - Chave do metadado
- value (TEXT) - Valor do metadado
- updated_at (TEXT) - Data da atualização
```

## 🚀 Funcionalidades Implementadas

### 📝 Sistema de Anotações
- ✅ Criar anotações em pontos específicos dos vídeos
- ✅ Editar e excluir anotações existentes
- ✅ Buscar anotações por vídeo ou curso
- ✅ Diferentes tipos de anotações (nota, pergunta, importante)
- ✅ Timestamps precisos para navegação rápida

### 🔖 Sistema de Bookmarks
- ✅ Marcar pontos importantes nos vídeos
- ✅ Navegação rápida para bookmarks
- ✅ Títulos e descrições personalizadas
- ✅ Organização por timestamp

### ⚙️ Sistema de Configurações
- ✅ Configurações personalizáveis do usuário
- ✅ Tipos de dados tipados (string, boolean, number)
- ✅ Configurações padrão automáticas
- ✅ Persistência entre sessões

### 📊 Sistema de Atividades
- ✅ Log automático de todas as ações
- ✅ Histórico de atividades recentes
- ✅ Filtros por tipo de atividade
- ✅ Análise de uso e comportamento

### 🔄 Sistema de Migração
- ✅ Migração automática entre versões
- ✅ Preservação de dados existentes
- ✅ Controle de versão do banco
- ✅ Rollback seguro em caso de erro

## 🎛️ Comandos Tauri Disponíveis

### Anotações
```javascript
// Criar nova anotação
await invoke('create_user_note', {
  videoId: 'video-123',
  courseId: 'course-456',
  moduleId: 'module-789',
  timestamp: 120.5,
  title: 'Conceito Importante',
  content: 'Esta parte explica...',
  noteType: 'important'
});

// Buscar anotações de um vídeo
const notes = await invoke('get_notes_by_video', { videoId: 'video-123' });

// Atualizar anotação
await invoke('update_user_note', {
  noteId: 'note-123',
  title: 'Novo Título',
  content: 'Novo conteúdo...'
});

// Excluir anotação
await invoke('delete_user_note', { noteId: 'note-123' });
```

### Bookmarks
```javascript
// Criar bookmark
await invoke('create_video_bookmark', {
  videoId: 'video-123',
  timestamp: 300.0,
  title: 'Demonstração Prática',
  description: 'Exemplo de implementação'
});

// Buscar bookmarks de um vídeo
const bookmarks = await invoke('get_video_bookmarks', { videoId: 'video-123' });

// Excluir bookmark
await invoke('delete_video_bookmark', { bookmarkId: 'bookmark-123' });
```

### Configurações
```javascript
// Definir configuração
await invoke('set_user_setting', {
  key: 'theme',
  value: 'dark',
  settingType: 'string'
});

// Buscar configuração
const setting = await invoke('get_user_setting', { key: 'theme' });

// Buscar todas as configurações
const allSettings = await invoke('get_all_user_settings');

// Inicializar configurações padrão
await invoke('initialize_default_settings');
```

### Log de Atividades
```javascript
// Buscar atividades recentes
const activities = await invoke('get_recent_activities', { limit: 50 });

// Buscar atividades por tipo
const noteActivities = await invoke('get_activities_by_type', {
  activityType: 'note_created',
  limit: 20
});

// Registrar atividade manual
await invoke('log_user_activity', {
  activityType: 'custom_action',
  entityId: 'entity-123',
  entityType: 'custom',
  details: 'Ação personalizada realizada'
});
```

## 🛠️ Configurações Padrão

O sistema inicializa automaticamente com as seguintes configurações:

| Configuração | Valor Padrão | Tipo | Descrição |
|-------------|-------------|------|-----------|
| `theme` | `dark` | string | Tema da interface |
| `auto_play_next` | `true` | boolean | Reprodução automática |
| `playback_speed` | `1.0` | number | Velocidade de reprodução |
| `volume` | `0.8` | number | Volume padrão (80%) |
| `auto_save_progress` | `true` | boolean | Salvamento automático |
| `show_subtitles` | `false` | boolean | Exibir legendas |
| `language` | `pt-BR` | string | Idioma da interface |

## 📁 Localização do Banco

O banco de dados é criado automaticamente em:

**Windows:**
```
%APPDATA%\ReprodLocal\database.db
```

**Linux/macOS:**
```
~/.local/share/ReprodLocal/database.db
```

## 🔧 Scripts de Inicialização

### PowerShell (Windows)
```powershell
# Executar script de configuração
.\scripts\setup-database.ps1

# Forçar recriação do banco
.\scripts\setup-database.ps1 -Force

# Especificar caminho customizado
.\scripts\setup-database.ps1 -DatabasePath "C:\custom\path\database.db"
```

### Rust (Multiplataforma)
```bash
# Compilar e executar script de inicialização
cargo run --bin init_database
```

## 🔍 Índices de Performance

O banco inclui índices otimizados para consultas frequentes:

- **Módulos por curso:** `idx_modules_course_id`
- **Vídeos por módulo:** `idx_videos_module_id`
- **Progresso por vídeo:** `idx_video_progress_video_id`
- **Anotações por vídeo:** `idx_user_notes_video_id`
- **Anotações por timestamp:** `idx_user_notes_timestamp`
- **Bookmarks por vídeo:** `idx_video_bookmarks_video_id`
- **Atividades por tipo:** `idx_activity_log_type`
- **Atividades por data:** `idx_activity_log_created`

## 🔒 Integridade dos Dados

- **Foreign Keys:** Habilitadas para manter integridade referencial
- **Constraints:** Validações automáticas de dados
- **Transações:** Operações atômicas para consistência
- **Backup:** Recomendado backup regular do arquivo `.db`

## 🚀 Próximas Funcionalidades

- [ ] Sistema de tags para anotações
- [ ] Exportação de anotações (PDF, Markdown)
- [ ] Sincronização em nuvem
- [ ] Estatísticas avançadas de progresso
- [ ] Sistema de metas e objetivos
- [ ] Compartilhamento de anotações
- [ ] Busca full-text nas anotações

## 🐛 Troubleshooting

### Banco não inicializa
1. Verificar permissões de escrita no diretório
2. Executar script de inicialização manualmente
3. Verificar se SQLite está instalado

### Dados perdidos após atualização
1. Verificar se migração foi executada
2. Restaurar backup se disponível
3. Verificar logs de erro da aplicação

### Performance lenta
1. Verificar se índices estão criados
2. Executar `VACUUM` no banco
3. Considerar limpeza de logs antigos

---

**📝 Nota:** Esta documentação refere-se à versão 2 do banco de dados. Para versões anteriores, consulte o histórico de migrações.