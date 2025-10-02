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
            update_course_last_accessed
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
