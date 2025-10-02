use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::path::Path;

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

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(db_path: &Path) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Database { conn };
        db.create_tables()?;
        Ok(db)
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
}