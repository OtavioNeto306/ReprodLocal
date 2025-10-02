// Script de inicialização do banco de dados SQLite
// Este script pode ser executado durante a instalação ou primeira execução
// para garantir que o banco de dados seja criado com a estrutura correta

use std::path::PathBuf;
use anyhow::Result;

// Importar as estruturas do banco de dados
// Nota: Em um cenário real, você importaria do módulo db
// use crate::db::Database;

fn main() -> Result<()> {
    println!("🚀 Iniciando configuração do banco de dados ReprodLocal...");
    
    // Determinar o caminho do banco de dados
    let db_path = get_database_path()?;
    println!("📁 Caminho do banco: {:?}", db_path);
    
    // Criar diretório se não existir
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
        println!("📂 Diretório criado: {:?}", parent);
    }
    
    // Inicializar banco de dados
    initialize_database(&db_path)?;
    
    println!("✅ Banco de dados inicializado com sucesso!");
    println!("📊 Estrutura criada:");
    println!("   - Tabelas de cursos, módulos e vídeos");
    println!("   - Sistema de progresso de vídeos");
    println!("   - Anotações pessoais do usuário");
    println!("   - Bookmarks de vídeos");
    println!("   - Configurações do usuário");
    println!("   - Log de atividades");
    println!("   - Sistema de migração automática");
    
    Ok(())
}

fn get_database_path() -> Result<PathBuf> {
    if let Some(data_dir) = dirs::data_dir() {
        let app_dir = data_dir.join("ReprodLocal");
        Ok(app_dir.join("database.db"))
    } else {
        // Fallback para diretório atual
        Ok(PathBuf::from("database.db"))
    }
}

fn initialize_database(db_path: &PathBuf) -> Result<()> {
    use rusqlite::{Connection, params};
    
    println!("🔧 Criando conexão com o banco...");
    let conn = Connection::open(db_path)?;
    
    // Habilitar foreign keys
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    
    println!("📋 Criando tabelas principais...");
    create_main_tables(&conn)?;
    
    println!("📝 Criando tabelas de anotações e configurações...");
    create_user_tables(&conn)?;
    
    println!("🔧 Criando índices para performance...");
    create_indexes(&conn)?;
    
    println!("⚙️ Configurando versão do banco...");
    set_database_version(&conn, 2)?;
    
    println!("🎯 Inserindo configurações padrão...");
    insert_default_settings(&conn)?;
    
    Ok(())
}

fn create_main_tables(conn: &Connection) -> Result<()> {
    // Tabela de cursos
    conn.execute(
        "CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            path TEXT NOT NULL,
            total_modules INTEGER DEFAULT 0,
            total_videos INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            last_accessed TEXT
        )",
        [],
    )?;

    // Tabela de módulos
    conn.execute(
        "CREATE TABLE IF NOT EXISTS modules (
            id TEXT PRIMARY KEY,
            course_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            path TEXT NOT NULL,
            order_index INTEGER NOT NULL,
            total_videos INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Tabela de vídeos
    conn.execute(
        "CREATE TABLE IF NOT EXISTS videos (
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
        )",
        [],
    )?;

    // Tabela de progresso de vídeos
    conn.execute(
        "CREATE TABLE IF NOT EXISTS video_progress (
            id TEXT PRIMARY KEY,
            video_id TEXT NOT NULL,
            current_time REAL NOT NULL DEFAULT 0,
            duration REAL NOT NULL DEFAULT 0,
            completed BOOLEAN NOT NULL DEFAULT FALSE,
            last_watched TEXT NOT NULL,
            watch_count INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE,
            UNIQUE(video_id)
        )",
        [],
    )?;

    Ok(())
}

fn create_user_tables(conn: &Connection) -> Result<()> {
    // Tabela de anotações do usuário
    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_notes (
            id TEXT PRIMARY KEY,
            video_id TEXT NOT NULL,
            course_id TEXT NOT NULL,
            module_id TEXT NOT NULL,
            timestamp REAL NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            note_type TEXT NOT NULL DEFAULT 'note',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
            FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Tabela de bookmarks de vídeos
    conn.execute(
        "CREATE TABLE IF NOT EXISTS video_bookmarks (
            id TEXT PRIMARY KEY,
            video_id TEXT NOT NULL,
            timestamp REAL NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Tabela de configurações do usuário
    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_settings (
            id TEXT PRIMARY KEY,
            setting_key TEXT NOT NULL UNIQUE,
            setting_value TEXT NOT NULL,
            setting_type TEXT NOT NULL DEFAULT 'string',
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    // Tabela de log de atividades
    conn.execute(
        "CREATE TABLE IF NOT EXISTS activity_log (
            id TEXT PRIMARY KEY,
            activity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // Tabela de metadados do banco
    conn.execute(
        "CREATE TABLE IF NOT EXISTS database_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    Ok(())
}

fn create_indexes(conn: &Connection) -> Result<()> {
    // Índices para performance
    let indexes = vec![
        "CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules (course_id)",
        "CREATE INDEX IF NOT EXISTS idx_videos_module_id ON videos (module_id)",
        "CREATE INDEX IF NOT EXISTS idx_videos_course_id ON videos (course_id)",
        "CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON video_progress (video_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_notes_video_id ON user_notes (video_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_notes_course_id ON user_notes (course_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_notes_timestamp ON user_notes (timestamp)",
        "CREATE INDEX IF NOT EXISTS idx_video_bookmarks_video_id ON video_bookmarks (video_id)",
        "CREATE INDEX IF NOT EXISTS idx_video_bookmarks_timestamp ON video_bookmarks (timestamp)",
        "CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log (activity_type)",
        "CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log (entity_id, entity_type)",
        "CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log (created_at)",
    ];

    for index_sql in indexes {
        conn.execute(index_sql, [])?;
    }

    Ok(())
}

fn set_database_version(conn: &Connection, version: i32) -> Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR REPLACE INTO database_metadata (key, value, updated_at) VALUES (?1, ?2, ?3)",
        params!["version", version.to_string(), now],
    )?;
    Ok(())
}

fn insert_default_settings(conn: &Connection) -> Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    let default_settings = vec![
        ("theme", "dark", "string"),
        ("auto_play_next", "true", "boolean"),
        ("playback_speed", "1.0", "number"),
        ("volume", "0.8", "number"),
        ("auto_save_progress", "true", "boolean"),
        ("show_subtitles", "false", "boolean"),
        ("language", "pt-BR", "string"),
    ];

    for (key, value, setting_type) in default_settings {
        // Só inserir se não existir
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM user_settings WHERE setting_key = ?1",
            [key],
            |row| row.get(0),
        )?;

        if count == 0 {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO user_settings (id, setting_key, setting_value, setting_type, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, key, value, setting_type, now],
            )?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_database_initialization() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test.db");
        
        // Testar inicialização
        assert!(initialize_database(&db_path).is_ok());
        
        // Verificar se o arquivo foi criado
        assert!(db_path.exists());
        
        // Verificar se as tabelas foram criadas
        let conn = rusqlite::Connection::open(&db_path).unwrap();
        
        let tables = vec![
            "courses", "modules", "videos", "video_progress",
            "user_notes", "video_bookmarks", "user_settings", 
            "activity_log", "database_metadata"
        ];
        
        for table in tables {
            let count: i64 = conn.query_row(
                &format!("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{}'", table),
                [],
                |row| row.get(0),
            ).unwrap();
            assert_eq!(count, 1, "Tabela {} não foi criada", table);
        }
    }
}