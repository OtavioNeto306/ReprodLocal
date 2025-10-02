use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::path::Path;

// Versão atual do esquema do banco de dados
const DATABASE_VERSION: i32 = 2;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Course {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: DateTime<Utc>,
    pub last_accessed: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Module {
    pub id: String,
    pub course_id: String,
    pub name: String,
    pub path: String,
    pub order_index: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Video {
    pub id: String,
    pub module_id: String,
    pub course_id: String,
    pub name: String,
    pub path: String,
    pub duration: Option<f64>,
    pub order_index: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoProgress {
    pub id: String,
    pub video_id: String,
    pub current_time: f64,
    pub duration: f64,
    pub completed: bool,
    pub last_watched: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserNote {
    pub id: String,
    pub video_id: Option<String>,
    pub course_id: Option<String>,
    pub module_id: Option<String>,
    pub timestamp: Option<f64>, // Para anotações em pontos específicos do vídeo
    pub title: String,
    pub content: String,
    pub note_type: String, // "video", "course", "module", "general"
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoBookmark {
    pub id: String,
    pub video_id: String,
    pub timestamp: f64,
    pub title: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSettings {
    pub id: String,
    pub setting_key: String,
    pub setting_value: String,
    pub setting_type: String, // "string", "number", "boolean", "json"
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivityLog {
    pub id: String,
    pub activity_type: String, // "video_watched", "course_started", "note_created", etc.
    pub entity_id: String, // ID do vídeo, curso, etc.
    pub entity_type: String, // "video", "course", "module"
    pub details: Option<String>, // JSON com detalhes adicionais
    pub created_at: DateTime<Utc>,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(db_path: &Path) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Database { conn };
        
        // Inicializar ou migrar o banco de dados
        db.initialize_database()?;
        
        Ok(db)
    }

    fn initialize_database(&self) -> Result<()> {
        // Criar tabela de versão se não existir
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS database_version (
                version INTEGER PRIMARY KEY
            )",
            [],
        )?;

        // Verificar versão atual
        let current_version = self.get_database_version()?;
        
        if current_version == 0 {
            // Primeira instalação - criar todas as tabelas
            self.create_tables()?;
            self.set_database_version(DATABASE_VERSION)?;
        } else if current_version < DATABASE_VERSION {
            // Migração necessária
            self.migrate_database(current_version, DATABASE_VERSION)?;
        }

        Ok(())
    }

    fn get_database_version(&self) -> Result<i32> {
        match self.conn.query_row(
            "SELECT version FROM database_version ORDER BY version DESC LIMIT 1",
            [],
            |row| row.get(0)
        ) {
            Ok(version) => Ok(version),
            Err(_) => Ok(0), // Banco novo
        }
    }

    fn set_database_version(&self, version: i32) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO database_version (version) VALUES (?1)",
            params![version],
        )?;
        Ok(())
    }

    fn migrate_database(&self, from_version: i32, to_version: i32) -> Result<()> {
        println!("🔄 Migrando banco de dados da versão {} para {}", from_version, to_version);
        
        // Migração da versão 1 para 2 (adicionar novas tabelas)
        if from_version < 2 {
            self.create_new_tables_v2()?;
        }

        // Atualizar versão
        self.set_database_version(to_version)?;
        println!("✅ Migração concluída com sucesso!");
        
        Ok(())
    }

    fn create_tables(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS courses (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                last_accessed TEXT
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS modules (
                id TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                FOREIGN KEY(course_id) REFERENCES courses(id)
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS videos (
                id TEXT PRIMARY KEY,
                module_id TEXT NOT NULL,
                course_id TEXT NOT NULL,
                name TEXT NOT NULL,
                path TEXT NOT NULL UNIQUE,
                duration REAL,
                order_index INTEGER NOT NULL,
                FOREIGN KEY(module_id) REFERENCES modules(id),
                FOREIGN KEY(course_id) REFERENCES courses(id)
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS video_progress (
                id TEXT PRIMARY KEY,
                video_id TEXT NOT NULL,
                current_time REAL NOT NULL,
                duration REAL NOT NULL,
                completed BOOLEAN NOT NULL DEFAULT 0,
                last_watched TEXT NOT NULL,
                FOREIGN KEY(video_id) REFERENCES videos(id)
            )",
            [],
        )?;

        // Criar novas tabelas da versão 2
        self.create_new_tables_v2()?;

        Ok(())
    }

    fn create_new_tables_v2(&self) -> Result<()> {
        // Tabela de anotações do usuário
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS user_notes (
                id TEXT PRIMARY KEY,
                video_id TEXT,
                course_id TEXT,
                module_id TEXT,
                timestamp REAL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                note_type TEXT NOT NULL DEFAULT 'general',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(video_id) REFERENCES videos(id),
                FOREIGN KEY(course_id) REFERENCES courses(id),
                FOREIGN KEY(module_id) REFERENCES modules(id)
            )",
            [],
        )?;

        // Tabela de bookmarks de vídeo
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS video_bookmarks (
                id TEXT PRIMARY KEY,
                video_id TEXT NOT NULL,
                timestamp REAL NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(video_id) REFERENCES videos(id)
            )",
            [],
        )?;

        // Tabela de configurações do usuário
        self.conn.execute(
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
        self.conn.execute(
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

        // Criar índices para melhor performance
        self.create_indexes()?;

        Ok(())
    }

    fn create_indexes(&self) -> Result<()> {
        // Índices para melhor performance nas consultas
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_user_notes_video_id ON user_notes(video_id)", [])?;
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_user_notes_course_id ON user_notes(course_id)", [])?;
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_user_notes_module_id ON user_notes(module_id)", [])?;
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_user_notes_type ON user_notes(note_type)", [])?;
        
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_video_bookmarks_video_id ON video_bookmarks(video_id)", [])?;
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_video_bookmarks_timestamp ON video_bookmarks(timestamp)", [])?;
        
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(setting_key)", [])?;
        
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type)", [])?;
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_id, entity_type)", [])?;
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at)", [])?;

        Ok(())
    }

    pub fn insert_course(&self, course: &Course) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO courses (id, name, path, created_at, last_accessed) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                course.id,
                course.name,
                course.path,
                course.created_at.to_rfc3339(),
                course.last_accessed.map(|dt| dt.to_rfc3339())
            ],
        )?;
        Ok(())
    }

    pub fn insert_module(&self, module: &Module) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO modules (id, course_id, name, path, order_index) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![module.id, module.course_id, module.name, module.path, module.order_index],
        )?;
        Ok(())
    }

    pub fn insert_video(&self, video: &Video) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO videos (id, module_id, course_id, name, path, duration, order_index) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                video.id,
                video.module_id,
                video.course_id,
                video.name,
                video.path,
                video.duration,
                video.order_index
            ],
        )?;
        Ok(())
    }

    pub fn update_video_progress(&self, progress: &VideoProgress) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO video_progress (id, video_id, current_time, duration, completed, last_watched) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                progress.id,
                progress.video_id,
                progress.current_time,
                progress.duration,
                progress.completed,
                progress.last_watched.to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn get_all_courses(&self) -> Result<Vec<Course>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, path, created_at, last_accessed FROM courses ORDER BY last_accessed DESC, name"
        )?;
        
        let course_iter = stmt.query_map([], |row| {
            Ok(Course {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?)
                    .map_err(|_| rusqlite::Error::InvalidColumnType(3, "created_at".to_string(), rusqlite::types::Type::Text))?
                    .with_timezone(&Utc),
                last_accessed: row.get::<_, Option<String>>(4)?
                    .map(|s| DateTime::parse_from_rfc3339(&s).ok())
                    .flatten()
                    .map(|dt| dt.with_timezone(&Utc)),
            })
        })?;

        let mut courses = Vec::new();
        for course in course_iter {
            courses.push(course?);
        }
        Ok(courses)
    }

    pub fn get_course_modules(&self, course_id: &str) -> Result<Vec<Module>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, course_id, name, path, order_index FROM modules WHERE course_id = ?1 ORDER BY order_index"
        )?;
        
        let module_iter = stmt.query_map([course_id], |row| {
            Ok(Module {
                id: row.get(0)?,
                course_id: row.get(1)?,
                name: row.get(2)?,
                path: row.get(3)?,
                order_index: row.get(4)?,
            })
        })?;

        let mut modules = Vec::new();
        for module in module_iter {
            modules.push(module?);
        }
        Ok(modules)
    }

    pub fn get_module_videos(&self, module_id: &str) -> Result<Vec<Video>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, module_id, course_id, name, path, duration, order_index 
             FROM videos WHERE module_id = ?1 ORDER BY order_index"
        )?;
        
        let video_iter = stmt.query_map([module_id], |row| {
            Ok(Video {
                id: row.get(0)?,
                module_id: row.get(1)?,
                course_id: row.get(2)?,
                name: row.get(3)?,
                path: row.get(4)?,
                duration: row.get(5)?,
                order_index: row.get(6)?,
            })
        })?;

        let mut videos = Vec::new();
        for video in video_iter {
            videos.push(video?);
        }
        Ok(videos)
    }

    pub fn get_video_progress(&self, video_id: &str) -> Result<Option<VideoProgress>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, video_id, current_time, duration, completed, last_watched 
             FROM video_progress WHERE video_id = ?1"
        )?;
        
        let mut rows = stmt.query_map([video_id], |row| {
            Ok(VideoProgress {
                id: row.get(0)?,
                video_id: row.get(1)?,
                current_time: row.get(2)?,
                duration: row.get(3)?,
                completed: row.get(4)?,
                last_watched: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .map_err(|_| rusqlite::Error::InvalidColumnType(5, "last_watched".to_string(), rusqlite::types::Type::Text))?
                    .with_timezone(&Utc),
            })
        })?;

        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    pub fn get_recent_videos(&self, limit: usize) -> Result<Vec<(Video, VideoProgress)>> {
        let mut stmt = self.conn.prepare(
            "SELECT v.id, v.module_id, v.course_id, v.name, v.path, v.duration, v.order_index,
                    p.id, p.video_id, p.current_time, p.duration, p.completed, p.last_watched
             FROM videos v
             INNER JOIN video_progress p ON v.id = p.video_id
             WHERE p.completed = 0
             ORDER BY p.last_watched DESC
             LIMIT ?1"
        )?;
        
        let video_iter = stmt.query_map([limit], |row| {
            let video = Video {
                id: row.get(0)?,
                module_id: row.get(1)?,
                course_id: row.get(2)?,
                name: row.get(3)?,
                path: row.get(4)?,
                duration: row.get(5)?,
                order_index: row.get(6)?,
            };
            
            let progress = VideoProgress {
                id: row.get(7)?,
                video_id: row.get(8)?,
                current_time: row.get(9)?,
                duration: row.get(10)?,
                completed: row.get(11)?,
                last_watched: DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                    .map_err(|_| rusqlite::Error::InvalidColumnType(12, "last_watched".to_string(), rusqlite::types::Type::Text))?
                    .with_timezone(&Utc),
            };
            
            Ok((video, progress))
        })?;

        let mut results = Vec::new();
        for item in video_iter {
            results.push(item?);
        }
        Ok(results)
    }

    pub fn update_course_last_accessed(&self, course_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE courses SET last_accessed = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), course_id],
        )?;
        Ok(())
    }

    // ========== MÉTODOS PARA ANOTAÇÕES ==========
    
    pub fn create_user_note(&self, note: &UserNote) -> Result<()> {
        self.conn.execute(
            "INSERT INTO user_notes (id, video_id, course_id, module_id, timestamp, title, content, note_type, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                note.id,
                note.video_id,
                note.course_id,
                note.module_id,
                note.timestamp,
                note.title,
                note.content,
                note.note_type,
                note.created_at.to_rfc3339(),
                note.updated_at.to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn update_user_note(&self, note: &UserNote) -> Result<()> {
        self.conn.execute(
            "UPDATE user_notes SET title = ?1, content = ?2, updated_at = ?3 WHERE id = ?4",
            params![note.title, note.content, note.updated_at.to_rfc3339(), note.id],
        )?;
        Ok(())
    }

    pub fn delete_user_note(&self, note_id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM user_notes WHERE id = ?1", params![note_id])?;
        Ok(())
    }

    pub fn get_notes_by_video(&self, video_id: &str) -> Result<Vec<UserNote>> {
        let stmt = self.conn.prepare(
            "SELECT id, video_id, course_id, module_id, timestamp, title, content, note_type, created_at, updated_at 
             FROM user_notes WHERE video_id = ?1 ORDER BY timestamp ASC, created_at ASC"
        )?;
        
        self.map_notes_from_query(stmt, params![video_id])
    }

    pub fn get_notes_by_course(&self, course_id: &str) -> Result<Vec<UserNote>> {
        let stmt = self.conn.prepare(
            "SELECT id, video_id, course_id, module_id, timestamp, title, content, note_type, created_at, updated_at 
             FROM user_notes WHERE course_id = ?1 ORDER BY created_at DESC"
        )?;
        
        self.map_notes_from_query(stmt, params![course_id])
    }

    pub fn get_all_notes(&self) -> Result<Vec<UserNote>> {
        let stmt = self.conn.prepare(
            "SELECT id, video_id, course_id, module_id, timestamp, title, content, note_type, created_at, updated_at 
             FROM user_notes ORDER BY created_at DESC"
        )?;
        
        self.map_notes_from_query(stmt, params![])
    }

    fn map_notes_from_query(&self, mut stmt: rusqlite::Statement, params: impl rusqlite::Params) -> Result<Vec<UserNote>> {
        let note_iter = stmt.query_map(params, |row| {
            Ok(UserNote {
                id: row.get(0)?,
                video_id: row.get(1)?,
                course_id: row.get(2)?,
                module_id: row.get(3)?,
                timestamp: row.get(4)?,
                title: row.get(5)?,
                content: row.get(6)?,
                note_type: row.get(7)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)
                    .map_err(|_| rusqlite::Error::InvalidColumnType(8, "created_at".to_string(), rusqlite::types::Type::Text))?
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)
                    .map_err(|_| rusqlite::Error::InvalidColumnType(9, "updated_at".to_string(), rusqlite::types::Type::Text))?
                    .with_timezone(&Utc),
            })
        })?;

        let mut notes = Vec::new();
        for note in note_iter {
            notes.push(note?);
        }
        Ok(notes)
    }

    // ========== MÉTODOS PARA BOOKMARKS ==========
    
    pub fn create_video_bookmark(&self, bookmark: &VideoBookmark) -> Result<()> {
        self.conn.execute(
            "INSERT INTO video_bookmarks (id, video_id, timestamp, title, description, created_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                bookmark.id,
                bookmark.video_id,
                bookmark.timestamp,
                bookmark.title,
                bookmark.description,
                bookmark.created_at.to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn delete_video_bookmark(&self, bookmark_id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM video_bookmarks WHERE id = ?1", params![bookmark_id])?;
        Ok(())
    }

    pub fn get_video_bookmarks(&self, video_id: &str) -> Result<Vec<VideoBookmark>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, video_id, timestamp, title, description, created_at 
             FROM video_bookmarks WHERE video_id = ?1 ORDER BY timestamp ASC"
        )?;
        
        let bookmark_iter = stmt.query_map([video_id], |row| {
            Ok(VideoBookmark {
                id: row.get(0)?,
                video_id: row.get(1)?,
                timestamp: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .map_err(|_| rusqlite::Error::InvalidColumnType(5, "created_at".to_string(), rusqlite::types::Type::Text))?
                    .with_timezone(&Utc),
            })
        })?;

        let mut bookmarks = Vec::new();
        for bookmark in bookmark_iter {
            bookmarks.push(bookmark?);
        }
        Ok(bookmarks)
    }

    // ========== MÉTODOS PARA CONFIGURAÇÕES ==========
    
    pub fn set_user_setting(&self, setting: &UserSettings) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO user_settings (id, setting_key, setting_value, setting_type, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                setting.id,
                setting.setting_key,
                setting.setting_value,
                setting.setting_type,
                setting.updated_at.to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn get_user_setting(&self, key: &str) -> Result<Option<UserSettings>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, setting_key, setting_value, setting_type, updated_at 
             FROM user_settings WHERE setting_key = ?1"
        )?;
        
        let mut rows = stmt.query_map([key], |row| {
            Ok(UserSettings {
                id: row.get(0)?,
                setting_key: row.get(1)?,
                setting_value: row.get(2)?,
                setting_type: row.get(3)?,
                updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .map_err(|_| rusqlite::Error::InvalidColumnType(4, "updated_at".to_string(), rusqlite::types::Type::Text))?
                    .with_timezone(&Utc),
            })
        })?;

        match rows.next() {
            Some(row) => Ok(Some(row?)),
            None => Ok(None),
        }
    }

    pub fn get_all_user_settings(&self) -> Result<Vec<UserSettings>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, setting_key, setting_value, setting_type, updated_at 
             FROM user_settings ORDER BY setting_key"
        )?;
        
        let setting_iter = stmt.query_map([], |row| {
            Ok(UserSettings {
                id: row.get(0)?,
                setting_key: row.get(1)?,
                setting_value: row.get(2)?,
                setting_type: row.get(3)?,
                updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(4)?)
                    .map_err(|_| rusqlite::Error::InvalidColumnType(4, "updated_at".to_string(), rusqlite::types::Type::Text))?
                    .with_timezone(&Utc),
            })
        })?;

        let mut settings = Vec::new();
        for setting in setting_iter {
            settings.push(setting?);
        }
        Ok(settings)
    }

    // ========== MÉTODOS PARA LOG DE ATIVIDADES ==========
    
    pub fn log_activity(&self, activity: &ActivityLog) -> Result<()> {
        self.conn.execute(
            "INSERT INTO activity_log (id, activity_type, entity_id, entity_type, details, created_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                activity.id,
                activity.activity_type,
                activity.entity_id,
                activity.entity_type,
                activity.details,
                activity.created_at.to_rfc3339()
            ],
        )?;
        Ok(())
    }

    pub fn get_recent_activities(&self, limit: usize) -> Result<Vec<ActivityLog>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, activity_type, entity_id, entity_type, details, created_at 
             FROM activity_log ORDER BY created_at DESC LIMIT ?1"
        )?;
        
        let activity_iter = stmt.query_map([limit], |row| {
            Ok(ActivityLog {
                id: row.get(0)?,
                activity_type: row.get(1)?,
                entity_id: row.get(2)?,
                entity_type: row.get(3)?,
                details: row.get(4)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .map_err(|_| rusqlite::Error::InvalidColumnType(5, "created_at".to_string(), rusqlite::types::Type::Text))?
                    .with_timezone(&Utc),
            })
        })?;

        let mut activities = Vec::new();
        for activity in activity_iter {
            activities.push(activity?);
        }
        Ok(activities)
    }

    pub fn get_activities_by_type(&self, activity_type: &str, limit: usize) -> Result<Vec<ActivityLog>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, activity_type, entity_id, entity_type, details, created_at 
             FROM activity_log WHERE activity_type = ?1 ORDER BY created_at DESC LIMIT ?2"
        )?;
        
        let activity_iter = stmt.query_map(params![activity_type, limit], |row| {
            Ok(ActivityLog {
                id: row.get(0)?,
                activity_type: row.get(1)?,
                entity_id: row.get(2)?,
                entity_type: row.get(3)?,
                details: row.get(4)?,
                created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .map_err(|_| rusqlite::Error::InvalidColumnType(5, "created_at".to_string(), rusqlite::types::Type::Text))?
                    .with_timezone(&Utc),
            })
        })?;

        let mut activities = Vec::new();
        for activity in activity_iter {
            activities.push(activity?);
        }
        Ok(activities)
    }

    // ========== MÉTODOS UTILITÁRIOS ==========
    
    pub fn initialize_default_settings(&self) -> Result<()> {
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
            // Só criar se não existir
            if self.get_user_setting(key)?.is_none() {
                let setting = UserSettings {
                    id: uuid::Uuid::new_v4().to_string(),
                    setting_key: key.to_string(),
                    setting_value: value.to_string(),
                    setting_type: setting_type.to_string(),
                    updated_at: Utc::now(),
                };
                self.set_user_setting(&setting)?;
            }
        }

        Ok(())
    }

    // Métodos para gerenciar conclusão de vídeos
    pub fn mark_video_completed(&self, video_id: &str, completed: bool) -> Result<()> {
        // Primeiro, verifica se já existe um registro de progresso
        if let Some(mut progress) = self.get_video_progress(video_id)? {
            // Atualiza o registro existente
            progress.completed = completed;
            progress.last_watched = Utc::now();
            self.update_video_progress(&progress)?;
        } else {
            // Cria um novo registro de progresso
            let progress = VideoProgress {
                id: uuid::Uuid::new_v4().to_string(),
                video_id: video_id.to_string(),
                current_time: if completed { 100.0 } else { 0.0 }, // Assume 100% se completo
                duration: 100.0, // Valor padrão, será atualizado quando o vídeo for reproduzido
                completed,
                last_watched: Utc::now(),
            };
            self.update_video_progress(&progress)?;
        }
        Ok(())
    }

    pub fn get_completed_videos(&self, course_id: Option<&str>) -> Result<Vec<(Video, VideoProgress)>> {
        let mut videos = Vec::new();
        
        if let Some(course_id) = course_id {
            let mut stmt = self.conn.prepare(
                "SELECT v.id, v.module_id, v.course_id, v.name, v.path, v.duration, v.order_index,
                        vp.id, vp.video_id, vp.current_time, vp.duration, vp.completed, vp.last_watched
                 FROM videos v 
                 INNER JOIN video_progress vp ON v.id = vp.video_id 
                 WHERE vp.completed = 1 AND v.course_id = ?
                 ORDER BY vp.last_watched DESC"
            )?;
            
            let video_iter = stmt.query_map(params![course_id], |row| {
                Ok((
                    Video {
                        id: row.get(0)?,
                        module_id: row.get(1)?,
                        course_id: row.get(2)?,
                        name: row.get(3)?,
                        path: row.get(4)?,
                        duration: row.get(5)?,
                        order_index: row.get(6)?,
                    },
                    VideoProgress {
                        id: row.get(7)?,
                        video_id: row.get(8)?,
                        current_time: row.get(9)?,
                        duration: row.get(10)?,
                        completed: row.get(11)?,
                        last_watched: DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                            .map_err(|_| rusqlite::Error::InvalidColumnType(12, "last_watched".to_string(), rusqlite::types::Type::Text))?
                            .with_timezone(&Utc),
                    },
                ))
            })?;
            
            for video in video_iter {
                videos.push(video?);
            }
        } else {
            let mut stmt = self.conn.prepare(
                "SELECT v.id, v.module_id, v.course_id, v.name, v.path, v.duration, v.order_index,
                        vp.id, vp.video_id, vp.current_time, vp.duration, vp.completed, vp.last_watched
                 FROM videos v 
                 INNER JOIN video_progress vp ON v.id = vp.video_id 
                 WHERE vp.completed = 1
                 ORDER BY vp.last_watched DESC"
            )?;
            
            let video_iter = stmt.query_map([], |row| {
                Ok((
                    Video {
                        id: row.get(0)?,
                        module_id: row.get(1)?,
                        course_id: row.get(2)?,
                        name: row.get(3)?,
                        path: row.get(4)?,
                        duration: row.get(5)?,
                        order_index: row.get(6)?,
                    },
                    VideoProgress {
                        id: row.get(7)?,
                        video_id: row.get(8)?,
                        current_time: row.get(9)?,
                        duration: row.get(10)?,
                        completed: row.get(11)?,
                        last_watched: DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                            .map_err(|_| rusqlite::Error::InvalidColumnType(12, "last_watched".to_string(), rusqlite::types::Type::Text))?
                            .with_timezone(&Utc),
                    },
                ))
            })?;
            
            for video in video_iter {
                videos.push(video?);
            }
        }
        
        Ok(videos)
    }

    pub fn get_incomplete_videos(&self, course_id: Option<&str>) -> Result<Vec<(Video, Option<VideoProgress>)>> {
        let mut videos = Vec::new();
        
        if let Some(course_id) = course_id {
            let mut stmt = self.conn.prepare(
                "SELECT v.id, v.module_id, v.course_id, v.name, v.path, v.duration, v.order_index,
                        vp.id, vp.video_id, vp.current_time, vp.duration, vp.completed, vp.last_watched
                 FROM videos v 
                 LEFT JOIN video_progress vp ON v.id = vp.video_id 
                 WHERE (vp.completed IS NULL OR vp.completed = 0) AND v.course_id = ?
                 ORDER BY v.order_index"
            )?;
            
            let video_iter = stmt.query_map(params![course_id], |row| {
                let progress = if row.get::<_, Option<String>>(7)?.is_some() {
                    Some(VideoProgress {
                        id: row.get(7)?,
                        video_id: row.get(8)?,
                        current_time: row.get(9)?,
                        duration: row.get(10)?,
                        completed: row.get(11)?,
                        last_watched: DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                            .map_err(|_| rusqlite::Error::InvalidColumnType(12, "last_watched".to_string(), rusqlite::types::Type::Text))?
                            .with_timezone(&Utc),
                    })
                } else {
                    None
                };

                Ok((
                    Video {
                        id: row.get(0)?,
                        module_id: row.get(1)?,
                        course_id: row.get(2)?,
                        name: row.get(3)?,
                        path: row.get(4)?,
                        duration: row.get(5)?,
                        order_index: row.get(6)?,
                    },
                    progress,
                ))
            })?;
            
            for video in video_iter {
                videos.push(video?);
            }
        } else {
            let mut stmt = self.conn.prepare(
                "SELECT v.id, v.module_id, v.course_id, v.name, v.path, v.duration, v.order_index,
                        vp.id, vp.video_id, vp.current_time, vp.duration, vp.completed, vp.last_watched
                 FROM videos v 
                 LEFT JOIN video_progress vp ON v.id = vp.video_id 
                 WHERE (vp.completed IS NULL OR vp.completed = 0)
                 ORDER BY v.order_index"
            )?;
            
            let video_iter = stmt.query_map([], |row| {
                let progress = if row.get::<_, Option<String>>(7)?.is_some() {
                    Some(VideoProgress {
                        id: row.get(7)?,
                        video_id: row.get(8)?,
                        current_time: row.get(9)?,
                        duration: row.get(10)?,
                        completed: row.get(11)?,
                        last_watched: DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                            .map_err(|_| rusqlite::Error::InvalidColumnType(12, "last_watched".to_string(), rusqlite::types::Type::Text))?
                            .with_timezone(&Utc),
                    })
                } else {
                    None
                };

                Ok((
                    Video {
                        id: row.get(0)?,
                        module_id: row.get(1)?,
                        course_id: row.get(2)?,
                        name: row.get(3)?,
                        path: row.get(4)?,
                        duration: row.get(5)?,
                        order_index: row.get(6)?,
                    },
                    progress,
                ))
            })?;
            
            for video in video_iter {
                videos.push(video?);
            }
        }
        
        Ok(videos)
    }

    pub fn get_course_completion_stats(&self, course_id: &str) -> Result<(i32, i32, i32)> {
        let total_videos: i32 = self.conn.query_row(
            "SELECT COUNT(*) FROM videos WHERE course_id = ?",
            params![course_id],
            |row| row.get(0),
        )?;

        let completed_videos: i32 = self.conn.query_row(
            "SELECT COUNT(*) FROM videos v INNER JOIN video_progress vp ON v.id = vp.video_id WHERE v.course_id = ? AND vp.completed = 1",
            params![course_id],
            |row| row.get(0),
        )?;

        let in_progress_videos: i32 = self.conn.query_row(
            "SELECT COUNT(*) FROM videos v INNER JOIN video_progress vp ON v.id = vp.video_id WHERE v.course_id = ? AND vp.completed = 0 AND vp.current_time > 0",
            params![course_id],
            |row| row.get(0),
        )?;

        Ok((total_videos, completed_videos, in_progress_videos))
    }

    pub fn get_video_by_path(&self, file_path: &str) -> Result<Option<Video>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, module_id, course_id, name, path, duration, order_index 
             FROM videos WHERE path = ?"
        )?;

        let result = stmt.query_row(params![file_path], |row| {
            Ok(Video {
                id: row.get(0)?,
                module_id: row.get(1)?,
                course_id: row.get(2)?,
                name: row.get(3)?,
                path: row.get(4)?,
                duration: row.get(5)?,
                order_index: row.get(6)?,
            })
        });

        match result {
            Ok(video) => Ok(Some(video)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}