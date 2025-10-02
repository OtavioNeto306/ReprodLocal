# Script de Inicializacao do Banco de Dados SQLite - ReprodLocal
# Versao: 2.0
# Autor: Sistema ReprodLocal

param(
    [string]$DatabasePath = "",
    [switch]$Force = $false,
    [switch]$Verify = $false
)

function Get-DatabasePath {
    if ($DatabasePath -ne "") {
        return $DatabasePath
    }
    
    $appDir = Join-Path $env:APPDATA "ReprodLocal"
    if (!(Test-Path $appDir)) {
        New-Item -ItemType Directory -Path $appDir -Force | Out-Null
    }
    
    return Join-Path $appDir "database.db"
}

function Test-SQLiteAvailable {
    try {
        $null = Get-Command sqlite3 -ErrorAction Stop
        return $true
    }
    catch {
        Write-Host "ERRO: SQLite3 nao encontrado no PATH do sistema." -ForegroundColor Red
        Write-Host "Por favor, instale o SQLite3 e adicione ao PATH." -ForegroundColor Yellow
        return $false
    }
}

function Initialize-Database {
    param([string]$DbPath)
    
    Write-Host "Inicializando banco de dados em: $DbPath" -ForegroundColor Green
    
    # Criar diretorio se nao existir
    $dbDir = Split-Path $DbPath -Parent
    if (!(Test-Path $dbDir)) {
        New-Item -ItemType Directory -Path $dbDir -Force | Out-Null
    }
    
    # SQL para criar todas as tabelas
    $createTablesSQL = @"
-- Habilitar foreign keys
PRAGMA foreign_keys = ON;

-- Tabela de cursos
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    total_modules INTEGER DEFAULT 0,
    total_videos INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    last_accessed TEXT
);

-- Tabela de modulos
CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    total_videos INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

-- Tabela de videos
CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    duration REAL,
    file_size INTEGER,
    order_index INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
);

-- Tabela de progresso dos videos
CREATE TABLE IF NOT EXISTS video_progress (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    current_time REAL NOT NULL DEFAULT 0,
    duration REAL NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT 0,
    last_watched TEXT NOT NULL,
    watch_count INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
);

-- Tabela de anotacoes do usuario
CREATE TABLE IF NOT EXISTS user_notes (
    id TEXT PRIMARY KEY,
    video_id TEXT,
    course_id TEXT,
    module_id TEXT,
    timestamp REAL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'note',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
);

-- Tabela de bookmarks de video
CREATE TABLE IF NOT EXISTS video_bookmarks (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    timestamp REAL NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
);

-- Tabela de configuracoes do usuario
CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL DEFAULT 'string',
    updated_at TEXT NOT NULL
);

-- Tabela de log de atividades
CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    activity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL
);

-- Tabela de metadados do banco
CREATE TABLE IF NOT EXISTS database_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"@

    # Indices para performance
    $createIndexesSQL = @"
-- Indices para melhor performance
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules (course_id);
CREATE INDEX IF NOT EXISTS idx_videos_module_id ON videos (module_id);
CREATE INDEX IF NOT EXISTS idx_videos_course_id ON videos (course_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON video_progress (video_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_video_id ON user_notes (video_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_course_id ON user_notes (course_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_timestamp ON user_notes (timestamp);
CREATE INDEX IF NOT EXISTS idx_video_bookmarks_video_id ON video_bookmarks (video_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log (activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log (created_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings (setting_key);
"@

    # Configuracoes padrao
    $defaultSettingsSQL = @"
-- Inserir configuracoes padrao
INSERT OR IGNORE INTO user_settings (id, setting_key, setting_value, setting_type, updated_at) VALUES
    ('setting_theme', 'theme', 'dark', 'string', datetime('now')),
    ('setting_auto_play', 'auto_play_next', 'true', 'boolean', datetime('now')),
    ('setting_speed', 'playback_speed', '1.0', 'number', datetime('now')),
    ('setting_volume', 'volume', '0.8', 'number', datetime('now')),
    ('setting_auto_save', 'auto_save_progress', 'true', 'boolean', datetime('now')),
    ('setting_subtitles', 'show_subtitles', 'false', 'boolean', datetime('now')),
    ('setting_language', 'language', 'pt-BR', 'string', datetime('now'));

-- Definir versao do banco
INSERT OR REPLACE INTO database_metadata (key, value, updated_at) VALUES
    ('version', '2', datetime('now')),
    ('created_at', datetime('now'), datetime('now')),
    ('last_migration', datetime('now'), datetime('now'));
"@

    try {
        # Executar SQLs
        $createTablesSQL | sqlite3 $DbPath
        if ($LASTEXITCODE -ne 0) {
            throw "Erro ao criar tabelas"
        }
        
        $createIndexesSQL | sqlite3 $DbPath
        if ($LASTEXITCODE -ne 0) {
            throw "Erro ao criar indices"
        }
        
        $defaultSettingsSQL | sqlite3 $DbPath
        if ($LASTEXITCODE -ne 0) {
            throw "Erro ao inserir configuracoes padrao"
        }
        
        Write-Host "Banco de dados inicializado com sucesso!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "ERRO ao inicializar banco: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Verify-Database {
    param([string]$DbPath)
    
    if (!(Test-Path $DbPath)) {
        Write-Host "Banco de dados nao encontrado em: $DbPath" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Verificando estrutura do banco..." -ForegroundColor Yellow
    
    # Verificar tabelas
    $tables = @('courses', 'modules', 'videos', 'video_progress', 'user_notes', 'video_bookmarks', 'user_settings', 'activity_log', 'database_metadata')
    
    foreach ($table in $tables) {
        $result = "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" | sqlite3 $DbPath
        if ($result -eq $table) {
            Write-Host "  Tabela '$table': OK" -ForegroundColor Green
        } else {
            Write-Host "  Tabela '$table': FALTANDO" -ForegroundColor Red
            return $false
        }
    }
    
    # Verificar versao
    $version = "SELECT value FROM database_metadata WHERE key='version';" | sqlite3 $DbPath 2>$null
    if ($version -eq "2") {
        Write-Host "  Versao do banco: $version (OK)" -ForegroundColor Green
    } else {
        Write-Host "  Versao do banco: $version (DESATUALIZADA)" -ForegroundColor Yellow
    }
    
    # Verificar configuracoes
    $settingsCount = "SELECT COUNT(*) FROM user_settings;" | sqlite3 $DbPath 2>$null
    Write-Host "  Configuracoes do usuario: $settingsCount registros" -ForegroundColor Green
    
    Write-Host "Verificacao concluida!" -ForegroundColor Green
    return $true
}

function Show-Menu {
    Write-Host ""
    Write-Host "=== ReprodLocal - Configuracao do Banco de Dados ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Inicializar novo banco de dados" -ForegroundColor White
    Write-Host "2. Verificar banco existente" -ForegroundColor White
    Write-Host "3. Forcar recriacao do banco" -ForegroundColor White
    Write-Host "4. Mostrar caminho do banco" -ForegroundColor White
    Write-Host "5. Sair" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Escolha uma opcao (1-5)"
    
    $dbPath = Get-DatabasePath
    
    switch ($choice) {
        "1" { 
            if (Test-Path $dbPath) {
                Write-Host "Banco ja existe em: $dbPath" -ForegroundColor Yellow
                $overwrite = Read-Host "Deseja sobrescrever? (s/N)"
                if ($overwrite -eq "s" -or $overwrite -eq "S") {
                    Remove-Item $dbPath -Force
                    Initialize-Database $dbPath
                } else {
                    Write-Host "Operacao cancelada." -ForegroundColor Yellow
                }
            } else {
                Initialize-Database $dbPath
            }
            Show-Menu 
        }
        "2" { 
            Verify-Database $dbPath
            Show-Menu 
        }
        "3" { 
            if (Test-Path $dbPath) {
                Remove-Item $dbPath -Force
                Write-Host "Banco anterior removido." -ForegroundColor Yellow
            }
            Initialize-Database $dbPath
            Show-Menu 
        }
        "4" { 
            Write-Host "Caminho do banco: $dbPath" -ForegroundColor Cyan
            Show-Menu 
        }
        "5" { 
            Write-Host "Ate logo!" -ForegroundColor Green
            return 
        }
        default { 
            Write-Host "Opcao invalida!" -ForegroundColor Red
            Show-Menu 
        }
    }
}

# Executar baseado nos parametros
if (!(Test-SQLiteAvailable)) {
    exit 1
}

$dbPath = Get-DatabasePath

if ($Verify) {
    Verify-Database $dbPath
    exit 0
}

if ($Force) {
    if (Test-Path $dbPath) {
        Remove-Item $dbPath -Force
        Write-Host "Banco anterior removido." -ForegroundColor Yellow
    }
    Initialize-Database $dbPath
    exit 0
}

if ($DatabasePath -ne "" -or $args.Count -eq 0) {
    if (Test-Path $dbPath) {
        Write-Host "Banco ja existe em: $dbPath" -ForegroundColor Yellow
        Write-Host "Use -Force para recriar ou -Verify para verificar." -ForegroundColor Yellow
    } else {
        Initialize-Database $dbPath
    }
} else {
    Show-Menu
}