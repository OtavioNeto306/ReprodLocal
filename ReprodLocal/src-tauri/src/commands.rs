use crate::db::{Database, Course, Module, Video, VideoProgress};
use crate::fs::{FileSystemScanner, get_default_course_directories};
use tauri::State;
use std::path::PathBuf;
use std::sync::Mutex;
use anyhow::Result;
use uuid::Uuid;
use chrono::Utc;

pub struct AppState {
    pub db: Mutex<Database>,
}

#[tauri::command]
pub async fn scan_courses(state: State<'_, AppState>) -> Result<Vec<Course>, String> {
    println!("🔍 Iniciando escaneamento de cursos...");
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    let scanner = FileSystemScanner::new(&*db);
    
    let default_dirs = get_default_course_directories();
    println!("📁 Diretórios a serem escaneados: {:?}", default_dirs);
    
    let courses = scanner.rescan_courses(&default_dirs).map_err(|e| e.to_string())?;
    println!("✅ Escaneamento concluído. {} cursos encontrados", courses.len());
    
    Ok(courses)
}

#[tauri::command]
pub async fn get_all_courses(state: State<'_, AppState>) -> Result<Vec<Course>, String> {
    println!("📚 Carregando todos os cursos do banco...");
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    let courses = db.get_all_courses().map_err(|e| e.to_string())?;
    println!("📚 {} cursos carregados do banco", courses.len());
    Ok(courses)
}

#[tauri::command]
pub async fn get_course_modules(
    course_id: String,
    state: State<'_, AppState>
) -> Result<Vec<Module>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_course_modules(&course_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_module_videos(
    module_id: String,
    state: State<'_, AppState>
) -> Result<Vec<Video>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_module_videos(&module_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_video_progress(
    video_id: String,
    state: State<'_, AppState>
) -> Result<Option<VideoProgress>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_video_progress(&video_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_video_progress(
    video_id: String,
    current_time: f64,
    duration: f64,
    completed: bool,
    state: State<'_, AppState>
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    let progress = VideoProgress {
        id: Uuid::new_v4().to_string(),
        video_id,
        current_time,
        duration,
        completed,
        last_watched: Utc::now(),
    };
    
    db.update_video_progress(&progress).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_recent_videos(
    limit: usize,
    state: State<'_, AppState>
) -> Result<Vec<(Video, VideoProgress)>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_recent_videos(limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn play_video(
    video_path: String,
    start_time: Option<f64>,
    _state: State<'_, AppState>
) -> Result<(), String> {
    // Implementação simplificada - apenas log por enquanto
    println!("Reproduzindo vídeo: {} (tempo: {:?})", video_path, start_time);
    Ok(())
}

#[tauri::command]
pub async fn pause_video(_state: State<'_, AppState>) -> Result<(), String> {
    // Implementação simplificada
    println!("Pausando vídeo");
    Ok(())
}

#[tauri::command]
pub async fn resume_video(_state: State<'_, AppState>) -> Result<(), String> {
    // Implementação simplificada
    println!("Retomando vídeo");
    Ok(())
}

#[tauri::command]
pub async fn seek_video(time: f64, _state: State<'_, AppState>) -> Result<(), String> {
    // Implementação simplificada
    println!("Buscando posição: {}", time);
    Ok(())
}

#[tauri::command]
pub async fn stop_video(_state: State<'_, AppState>) -> Result<(), String> {
    // Implementação simplificada
    println!("Parando vídeo");
    Ok(())
}

#[tauri::command]
pub async fn get_video_status(_state: State<'_, AppState>) -> Result<Option<VideoStatus>, String> {
    // Implementação simplificada
    Ok(Some(VideoStatus {
        is_playing: false,
        current_time: 0.0,
        duration: 0.0,
        volume: 1.0,
    }))
}

#[tauri::command]
pub async fn select_course_directory(app_handle: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{DialogExt};
    
    let folder_path = app_handle.dialog()
        .file()
        .set_title("Selecione a pasta dos cursos")
        .blocking_pick_folder();
    
    match folder_path {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None)
    }
}

#[tauri::command]
pub async fn scan_custom_directory(
    directory_path: String,
    state: State<'_, AppState>
) -> Result<Vec<Course>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    let scanner = FileSystemScanner::new(&*db);
    
    let path = PathBuf::from(directory_path);
    let courses = scanner.scan_directory(&path).map_err(|e| e.to_string())?;
    
    Ok(courses)
}

#[tauri::command]
pub async fn update_course_last_accessed(
    course_id: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.update_course_last_accessed(&course_id).map_err(|e| e.to_string())
}

// Estruturas auxiliares
#[derive(serde::Serialize, serde::Deserialize)]
pub struct VideoStatus {
    pub is_playing: bool,
    pub current_time: f64,
    pub duration: f64,
    pub volume: f64,
}

fn get_db_path() -> PathBuf {
    if let Some(data_dir) = dirs::data_dir() {
        let app_dir = data_dir.join("ReprodLocal");
        std::fs::create_dir_all(&app_dir).ok();
        app_dir.join("database.db")
    } else {
        PathBuf::from("database.db")
    }
}

pub fn create_app_state() -> Result<AppState> {
    let db_path = get_db_path();
    let db = Database::new(&db_path)?;
    
    Ok(AppState {
        db: Mutex::new(db),
    })
}