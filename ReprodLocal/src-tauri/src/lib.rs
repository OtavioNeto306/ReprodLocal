mod commands;
mod db;
mod fs;

use commands::{
    create_app_state,
    scan_courses,
    get_all_courses,
    get_course_modules,
    get_module_videos,
    get_video_progress,
    update_video_progress,
    get_recent_videos,
    play_video,
    pause_video,
    resume_video,
    seek_video,
    stop_video,
    get_video_status,
    select_course_directory,
    scan_custom_directory,
    update_course_last_accessed,
    scan_folder_content,
    get_folder_playlist,
    // Novos comandos para anotações
    create_user_note,
    update_user_note,
    delete_user_note,
    get_notes_by_video,
    get_notes_by_course,
    get_all_notes,
    // Novos comandos para bookmarks
    create_video_bookmark,
    delete_video_bookmark,
    get_video_bookmarks,
    // Novos comandos para configurações
    set_user_setting,
    get_user_setting,
    get_all_user_settings,
    initialize_default_settings,
    // Novos comandos para logs de atividade
    get_recent_activities,
    get_activities_by_type,
    log_user_activity,
    // Comandos para conclusão de vídeos
    mark_video_completed,
    mark_video_incomplete,
    get_completed_videos,
    get_incomplete_videos,
    get_course_completion_stats,
    get_video_by_path,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = create_app_state().expect("Falha ao criar estado da aplicação");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            scan_courses,
            get_all_courses,
            get_course_modules,
            get_module_videos,
            get_video_progress,
            update_video_progress,
            get_recent_videos,
            play_video,
            pause_video,
            resume_video,
            seek_video,
            stop_video,
            get_video_status,
            select_course_directory,
            scan_custom_directory,
            update_course_last_accessed,
            scan_folder_content,
            get_folder_playlist,
            // Comandos para anotações
            create_user_note,
            update_user_note,
            delete_user_note,
            get_notes_by_video,
            get_notes_by_course,
            get_all_notes,
            // Comandos para bookmarks
            create_video_bookmark,
            delete_video_bookmark,
            get_video_bookmarks,
            // Comandos para configurações
            set_user_setting,
            get_user_setting,
            get_all_user_settings,
            initialize_default_settings,
            // Comandos para logs de atividade
            get_recent_activities,
            get_activities_by_type,
            log_user_activity,
            // Comandos para conclusão de vídeos
            mark_video_completed,
            mark_video_incomplete,
            get_completed_videos,
            get_incomplete_videos,
            get_course_completion_stats,
            get_video_by_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
