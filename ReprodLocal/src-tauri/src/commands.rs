use crate::db::{Database, Course, Module, Video, VideoProgress, UserNote, VideoBookmark, UserSettings, ActivityLog};
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

// ===== COMANDOS DE CONCLUSÃO DE VÍDEOS =====

#[tauri::command]
pub async fn mark_video_completed(
    video_id: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    db.mark_video_completed(&video_id, true)
        .map_err(|e| format!("Erro ao marcar vídeo como concluído: {}", e))?;
    
    // Registrar atividade
    let activity = ActivityLog {
        id: Uuid::new_v4().to_string(),
        activity_type: "video_completed".to_string(),
        entity_id: video_id,
        entity_type: "video".to_string(),
        details: Some("Vídeo marcado como concluído manualmente".to_string()),
        created_at: Utc::now(),
    };
    
    db.log_activity(&activity)
        .map_err(|e| format!("Erro ao registrar atividade: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn mark_video_incomplete(
    video_id: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    db.mark_video_completed(&video_id, false)
        .map_err(|e| format!("Erro ao marcar vídeo como incompleto: {}", e))?;
    
    // Registrar atividade
    let activity = ActivityLog {
        id: Uuid::new_v4().to_string(),
        activity_type: "video_marked_incomplete".to_string(),
        entity_id: video_id,
        entity_type: "video".to_string(),
        details: Some("Vídeo marcado como incompleto".to_string()),
        created_at: Utc::now(),
    };
    
    db.log_activity(&activity)
        .map_err(|e| format!("Erro ao registrar atividade: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_completed_videos(
    course_id: Option<String>,
    state: State<'_, AppState>
) -> Result<Vec<(Video, VideoProgress)>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    db.get_completed_videos(course_id.as_deref())
        .map_err(|e| format!("Erro ao buscar vídeos concluídos: {}", e))
}

#[tauri::command]
pub async fn get_incomplete_videos(
    course_id: Option<String>,
    state: State<'_, AppState>
) -> Result<Vec<(Video, Option<VideoProgress>)>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    db.get_incomplete_videos(course_id.as_deref())
        .map_err(|e| format!("Erro ao buscar vídeos incompletos: {}", e))
}

#[tauri::command]
pub async fn get_course_completion_stats(
    course_id: String,
    state: State<'_, AppState>
) -> Result<(i32, i32, i32), String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    db.get_course_completion_stats(&course_id)
        .map_err(|e| format!("Erro ao obter estatísticas de conclusão: {}", e))
}

#[tauri::command]
pub async fn get_video_by_path(
    video_path: String,
    state: State<'_, AppState>
) -> Result<Option<Video>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    db.get_video_by_path(&video_path)
        .map_err(|e| format!("Erro ao buscar vídeo por caminho: {}", e))
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
pub async fn select_course_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::mpsc;
    use std::time::Duration;
    
    let (tx, rx) = mpsc::channel();
    
    app.dialog()
        .file()
        .set_title("Selecionar Diretório de Cursos")
        .pick_folder(move |path| {
            let _ = tx.send(path);
        });
    
    // Aguarda o resultado com timeout
    match rx.recv_timeout(Duration::from_secs(60)) {
        Ok(Some(path)) => {
            Ok(Some(path.to_string()))
        },
        Ok(None) => {
            Ok(None)
        },
        Err(_) => {
            Err("Timeout ao selecionar diretório".to_string())
        }
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
    
    // Inicializar configurações padrão se necessário
    if let Err(e) = db.initialize_default_settings() {
        eprintln!("⚠️ Aviso: Erro ao inicializar configurações padrão: {}", e);
    }
    
    Ok(AppState {
        db: Mutex::new(db),
    })
}

#[tauri::command]
pub async fn scan_folder_content(
    folder_path: String,
    state: State<'_, AppState>
) -> Result<FolderContent, String> {
    println!("🔍 Escaneando conteúdo da pasta: {}", folder_path);
    
    let path = std::path::Path::new(&folder_path);
    if !path.exists() {
        return Err(format!("Pasta não encontrada: {}", folder_path));
    }
    
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    let scanner = FileSystemScanner::new(&*db);
    
    let mut media_files = Vec::new();
    let mut subfolders = Vec::new();
    
    // Escanear recursivamente a pasta
    for entry in walkdir::WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok()) 
    {
        let entry_path = entry.path();
        
        if entry_path.is_file() && scanner.is_video_file(entry_path) {
            if let Some(file_name) = entry_path.file_name().and_then(|n| n.to_str()) {
                media_files.push(MediaFile {
                    name: file_name.to_string(),
                    path: entry_path.to_string_lossy().to_string(),
                    file_type: get_file_type(entry_path),
                    size: entry.metadata().map(|m| m.len()).unwrap_or(0),
                    duration: None, // Pode ser implementado posteriormente
                });
            }
        } else if entry_path.is_dir() && entry_path != path {
            if let Some(folder_name) = entry_path.file_name().and_then(|n| n.to_str()) {
                subfolders.push(SubFolder {
                    name: folder_name.to_string(),
                    path: entry_path.to_string_lossy().to_string(),
                    media_count: count_media_files_in_folder(entry_path, &scanner),
                });
            }
        }
    }
    
    // Ordenar arquivos por nome
    media_files.sort_by(|a, b| a.name.cmp(&b.name));
    subfolders.sort_by(|a, b| a.name.cmp(&b.name));
    
    let total_files = media_files.len();
    
    println!("✅ Escaneamento concluído. {} arquivos de mídia e {} subpastas encontrados", 
             total_files, subfolders.len());
    
    Ok(FolderContent {
        path: folder_path,
        media_files,
        subfolders,
        total_files,
    })
}

#[tauri::command]
pub async fn get_folder_playlist(
    folder_path: String,
    state: State<'_, AppState>
) -> Result<Vec<MediaFile>, String> {
    println!("🎵 Criando playlist para pasta: {}", folder_path);
    
    let path = std::path::Path::new(&folder_path);
    if !path.exists() {
        return Err(format!("Pasta não encontrada: {}", folder_path));
    }
    
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    let scanner = FileSystemScanner::new(&*db);
    
    let mut playlist = Vec::new();
    
    // Escanear recursivamente todos os arquivos de mídia
    for entry in walkdir::WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let entry_path = entry.path();
        
        if entry_path.is_file() && scanner.is_video_file(entry_path) {
            if let Some(file_name) = entry_path.file_name().and_then(|n| n.to_str()) {
                playlist.push(MediaFile {
                    name: file_name.to_string(),
                    path: entry_path.to_string_lossy().to_string(),
                    file_type: get_file_type(entry_path),
                    size: entry.metadata().map(|m| m.len()).unwrap_or(0),
                    duration: None,
                });
            }
        }
    }
    
    // Ordenar playlist por caminho para manter ordem hierárquica
    playlist.sort_by(|a, b| a.path.cmp(&b.path));
    
    println!("✅ Playlist criada com {} arquivos", playlist.len());
    Ok(playlist)
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct FolderContent {
    pub path: String,
    pub media_files: Vec<MediaFile>,
    pub subfolders: Vec<SubFolder>,
    pub total_files: usize,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct MediaFile {
    pub name: String,
    pub path: String,
    pub file_type: String,
    pub size: u64,
    pub duration: Option<f64>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SubFolder {
    pub name: String,
    pub path: String,
    pub media_count: usize,
}

fn get_file_type(path: &std::path::Path) -> String {
    path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("unknown")
        .to_uppercase()
}

fn count_media_files_in_folder(folder_path: &std::path::Path, scanner: &FileSystemScanner) -> usize {
    walkdir::WalkDir::new(folder_path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|entry| entry.path().is_file() && scanner.is_video_file(entry.path()))
        .count()
}

// ========== COMANDOS PARA ANOTAÇÕES ==========

#[tauri::command]
pub async fn create_user_note(
    video_id: String,
    course_id: String,
    module_id: String,
    timestamp: f64,
    title: String,
    content: String,
    note_type: String,
    state: State<'_, AppState>
) -> Result<String, String> {
    println!("🔍 Backend create_user_note - Parâmetros recebidos:");
    println!("   video_id: {}", video_id);
    println!("   course_id: {}", course_id);
    println!("   module_id: {}", module_id);
    println!("   timestamp: {}", timestamp);
    println!("   title: {}", title);
    println!("   content: {}", content);
    println!("   note_type: {}", note_type);

    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    let note = UserNote {
        id: Uuid::new_v4().to_string(),
        video_id: Some(video_id),
        course_id: Some(course_id),
        module_id: Some(module_id),
        timestamp: Some(timestamp),
        title,
        content,
        note_type,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    db.create_user_note(&note).map_err(|e| format!("Erro ao criar anotação: {}", e))?;
    
    // Log da atividade
    let activity = ActivityLog {
        id: Uuid::new_v4().to_string(),
        activity_type: "note_created".to_string(),
        entity_id: note.id.clone(),
        entity_type: "note".to_string(),
        details: Some(format!("Anotação criada: {}", note.title)),
        created_at: Utc::now(),
    };
    db.log_activity(&activity).ok(); // Não falhar se o log der erro
    
    println!("✅ Backend create_user_note - Anotação criada com sucesso! ID: {}", note.id);
    Ok(note.id)
}

#[tauri::command]
pub async fn update_user_note(
    note_id: String,
    title: String,
    content: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    // Buscar a nota existente para manter os outros campos
    let notes = db.get_all_notes().map_err(|e| format!("Erro ao buscar anotações: {}", e))?;
    let mut note = notes.into_iter()
        .find(|n| n.id == note_id)
        .ok_or("Anotação não encontrada")?;
    
    note.title = title;
    note.content = content;
    note.updated_at = Utc::now();
    
    db.update_user_note(&note).map_err(|e| format!("Erro ao atualizar anotação: {}", e))?;
    
    // Log da atividade
    let activity = ActivityLog {
        id: Uuid::new_v4().to_string(),
        activity_type: "note_updated".to_string(),
        entity_id: note.id,
        entity_type: "note".to_string(),
        details: Some(format!("Anotação atualizada: {}", note.title)),
        created_at: Utc::now(),
    };
    db.log_activity(&activity).ok();
    
    Ok(())
}

#[tauri::command]
pub async fn delete_user_note(
    note_id: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    db.delete_user_note(&note_id).map_err(|e| format!("Erro ao deletar anotação: {}", e))?;
    
    // Log da atividade
    let activity = ActivityLog {
        id: Uuid::new_v4().to_string(),
        activity_type: "note_deleted".to_string(),
        entity_id: note_id,
        entity_type: "note".to_string(),
        details: Some("Anotação deletada".to_string()),
        created_at: Utc::now(),
    };
    db.log_activity(&activity).ok();
    
    Ok(())
}

#[tauri::command]
pub async fn get_notes_by_video(
    video_id: String,
    state: State<'_, AppState>
) -> Result<Vec<UserNote>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_notes_by_video(&video_id).map_err(|e| format!("Erro ao buscar anotações: {}", e))
}

#[tauri::command]
pub async fn get_notes_by_course(
    course_id: String,
    state: State<'_, AppState>
) -> Result<Vec<UserNote>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_notes_by_course(&course_id).map_err(|e| format!("Erro ao buscar anotações: {}", e))
}

#[tauri::command]
pub async fn get_all_notes(state: State<'_, AppState>) -> Result<Vec<UserNote>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_all_notes().map_err(|e| format!("Erro ao buscar anotações: {}", e))
}

// ========== COMANDOS PARA BOOKMARKS ==========

#[tauri::command]
pub async fn create_video_bookmark(
    video_id: String,
    timestamp: f64,
    title: String,
    description: Option<String>,
    state: State<'_, AppState>
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    let bookmark = VideoBookmark {
        id: Uuid::new_v4().to_string(),
        video_id,
        timestamp,
        title,
        description,
        created_at: Utc::now(),
    };
    
    db.create_video_bookmark(&bookmark).map_err(|e| format!("Erro ao criar bookmark: {}", e))?;
    
    // Log da atividade
    let activity = ActivityLog {
        id: Uuid::new_v4().to_string(),
        activity_type: "bookmark_created".to_string(),
        entity_id: bookmark.id.clone(),
        entity_type: "bookmark".to_string(),
        details: Some(format!("Bookmark criado: {}", bookmark.title)),
        created_at: Utc::now(),
    };
    db.log_activity(&activity).ok();
    
    Ok(bookmark.id)
}

#[tauri::command]
pub async fn delete_video_bookmark(
    bookmark_id: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    db.delete_video_bookmark(&bookmark_id).map_err(|e| format!("Erro ao deletar bookmark: {}", e))?;
    
    // Log da atividade
    let activity = ActivityLog {
        id: Uuid::new_v4().to_string(),
        activity_type: "bookmark_deleted".to_string(),
        entity_id: bookmark_id,
        entity_type: "bookmark".to_string(),
        details: Some("Bookmark deletado".to_string()),
        created_at: Utc::now(),
    };
    db.log_activity(&activity).ok();
    
    Ok(())
}

#[tauri::command]
pub async fn get_video_bookmarks(
    video_id: String,
    state: State<'_, AppState>
) -> Result<Vec<VideoBookmark>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_video_bookmarks(&video_id).map_err(|e| format!("Erro ao buscar bookmarks: {}", e))
}

// ========== COMANDOS PARA CONFIGURAÇÕES ==========

#[tauri::command]
pub async fn set_user_setting(
    key: String,
    value: String,
    setting_type: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    let setting = UserSettings {
        id: Uuid::new_v4().to_string(),
        setting_key: key,
        setting_value: value,
        setting_type,
        updated_at: Utc::now(),
    };
    
    db.set_user_setting(&setting).map_err(|e| format!("Erro ao salvar configuração: {}", e))?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_user_setting(
    key: String,
    state: State<'_, AppState>
) -> Result<Option<UserSettings>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_user_setting(&key).map_err(|e| format!("Erro ao buscar configuração: {}", e))
}

#[tauri::command]
pub async fn get_all_user_settings(state: State<'_, AppState>) -> Result<Vec<UserSettings>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_all_user_settings().map_err(|e| format!("Erro ao buscar configurações: {}", e))
}

#[tauri::command]
pub async fn initialize_default_settings(state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.initialize_default_settings().map_err(|e| format!("Erro ao inicializar configurações: {}", e))
}

// ========== COMANDOS PARA LOG DE ATIVIDADES ==========

#[tauri::command]
pub async fn get_recent_activities(
    limit: usize,
    state: State<'_, AppState>
) -> Result<Vec<ActivityLog>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_recent_activities(limit).map_err(|e| format!("Erro ao buscar atividades: {}", e))
}

#[tauri::command]
pub async fn get_activities_by_type(
    activity_type: String,
    limit: usize,
    state: State<'_, AppState>
) -> Result<Vec<ActivityLog>, String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    db.get_activities_by_type(&activity_type, limit).map_err(|e| format!("Erro ao buscar atividades: {}", e))
}

// ========== COMANDO PARA LOG MANUAL DE ATIVIDADE ==========

#[tauri::command]
pub async fn log_user_activity(
    activity_type: String,
    entity_id: String,
    entity_type: String,
    details: String,
    state: State<'_, AppState>
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Erro ao acessar banco: {}", e))?;
    
    let activity = ActivityLog {
        id: Uuid::new_v4().to_string(),
        activity_type,
        entity_id,
        entity_type,
        details: Some(details),
        created_at: Utc::now(),
    };
    
    db.log_activity(&activity).map_err(|e| format!("Erro ao registrar atividade: {}", e))?;
    
    Ok(())
}