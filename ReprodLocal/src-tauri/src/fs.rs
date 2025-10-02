use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use uuid::Uuid;
use chrono::Utc;
use anyhow::{Result, anyhow};
use crate::db::{Course, Module, Video, Database};

const VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "mkv", "avi", "ts", "mov", "wmv", "flv", "webm", "m4v", "3gp", "ogv"
];

pub struct FileSystemScanner<'a> {
    db: &'a Database,
}

impl<'a> FileSystemScanner<'a> {
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    pub fn scan_directory(&self, base_path: &Path) -> Result<Vec<Course>> {
        if !base_path.exists() {
            return Err(anyhow!("Diretório não existe: {}", base_path.display()));
        }

        println!("🔍 Escaneando diretório: {}", base_path.display());
        let mut courses = Vec::new();
        let mut directories_found = 0;
        let mut files_found = 0;
        let mut root_videos = Vec::new();
        
        // Procura por diretórios que contenham vídeos (cursos)
        for entry in std::fs::read_dir(base_path)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() {
                directories_found += 1;
                println!("📁 Diretório encontrado: {}", path.display());
                
                match self.scan_course_directory(&path) {
                    Ok(course) => {
                        println!("✅ Curso criado: {} (ID: {})", course.name, course.id);
                        courses.push(course);
                    }
                    Err(e) => {
                        println!("❌ Erro ao escanear diretório {}: {}", path.display(), e);
                        println!("🔍 Detalhes do erro: {:?}", e);
                        // Continua para o próximo diretório em vez de parar
                    }
                }
            } else {
                files_found += 1;
                println!("📄 Arquivo encontrado: {}", path.display());
                if self.is_video_file(&path) {
                    println!("🎬 Arquivo de vídeo detectado na raiz: {}", path.display());
                    root_videos.push(path);
                }
            }
        }

        // Se encontramos vídeos na pasta raiz, criar um curso para eles
        if !root_videos.is_empty() {
            println!("📹 Criando curso para {} vídeos encontrados na pasta raiz", root_videos.len());
            let folder_name = base_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Curso")
                .to_string();
            
            match self.create_root_course(base_path, &folder_name) {
                Ok(course) => {
                    println!("✅ Curso da pasta raiz criado: {} (ID: {})", course.name, course.id);
                    courses.push(course);
                }
                Err(e) => {
                    println!("❌ Erro ao criar curso da pasta raiz: {}", e);
                }
            }
        }

        println!("📊 Resumo do escaneamento:");
        println!("   - Diretórios encontrados: {}", directories_found);
        println!("   - Arquivos encontrados: {}", files_found);
        println!("   - Vídeos na raiz: {}", root_videos.len());
        println!("   - Cursos criados: {}", courses.len());

        Ok(courses)
    }

    fn scan_course_directory(&self, course_path: &Path) -> Result<Course> {
        let course_name = course_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Curso Sem Nome")
            .to_string();

        let course_id = Uuid::new_v4().to_string();
        let course = Course {
            id: course_id.clone(),
            name: course_name,
            path: course_path.to_string_lossy().to_string(),
            created_at: Utc::now(),
            last_accessed: None,
        };

        // Salva o curso no banco
        self.db.insert_course(&course)?;

        // Escaneia módulos e vídeos
        self.scan_course_content(&course_id, course_path)?;

        Ok(course)
    }

    fn create_root_course(&self, course_path: &Path, course_name: &str) -> Result<Course> {
        let course_id = Uuid::new_v4().to_string();
        let course = Course {
            id: course_id.clone(),
            name: course_name.to_string(),
            path: course_path.to_string_lossy().to_string(),
            created_at: Utc::now(),
            last_accessed: None,
        };

        // Salva o curso no banco
        self.db.insert_course(&course)?;

        // Escaneia vídeos diretamente na pasta raiz
        self.scan_root_videos(&course_id, course_path)?;

        Ok(course)
    }

    fn scan_root_videos(&self, course_id: &str, course_path: &Path) -> Result<()> {
        println!("🎬 Escaneando vídeos na pasta raiz: {}", course_path.display());
        
        let mut videos_found = 0;
        let mut files_scanned = 0;

        // Cria um módulo padrão para os vídeos da raiz
        let module_id = Uuid::new_v4().to_string();
        let module = Module {
            id: module_id.clone(),
            course_id: course_id.to_string(),
            name: "Vídeos".to_string(),
            path: course_path.to_string_lossy().to_string(),
            order_index: 0,
        };
        self.db.insert_module(&module)?;

        for entry in std::fs::read_dir(course_path)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() {
                files_scanned += 1;
                println!("📄 Arquivo encontrado: {}", path.display());
                
                if self.is_video_file(&path) {
                    videos_found += 1;
                    println!("🎥 Vídeo detectado: {}", path.display());
                    
                    let video_name = path
                        .file_stem()
                        .and_then(|n| n.to_str())
                        .unwrap_or("Vídeo")
                        .to_string();

                    let video = Video {
                        id: Uuid::new_v4().to_string(),
                        module_id: module_id.clone(),
                        course_id: course_id.to_string(),
                        name: video_name,
                        path: path.to_string_lossy().to_string(),
                        duration: None,
                        order_index: videos_found as i32 - 1,
                    };

                    self.db.insert_video(&video)?;
                }
            }
        }

        println!("📊 Escaneamento de vídeos da raiz concluído:");
        println!("   - Arquivos escaneados: {}", files_scanned);
        println!("   - Vídeos encontrados: {}", videos_found);

        Ok(())
    }

    fn scan_course_content(&self, course_id: &str, course_path: &Path) -> Result<()> {
        println!("🎬 Escaneando conteúdo do curso: {}", course_path.display());
        let mut videos_found: Vec<PathBuf> = Vec::new();
        let _modules_found: Vec<PathBuf> = Vec::new();
        let mut files_scanned = 0;

        // Coleta todos os vídeos recursivamente
        for entry in WalkDir::new(course_path)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            files_scanned += 1;
            
            if path.is_file() {
                println!("📄 Arquivo encontrado: {}", path.display());
                if self.is_video_file(path) {
                    println!("🎥 Vídeo detectado: {}", path.display());
                    videos_found.push(path.to_path_buf());
                } else {
                    println!("❌ Não é vídeo: {}", path.display());
                }
            }
        }

        println!("📊 Escaneamento do curso concluído:");
        println!("   - Arquivos escaneados: {}", files_scanned);
        println!("   - Vídeos encontrados: {}", videos_found.len());

        if videos_found.is_empty() {
            println!("⚠️ Nenhum vídeo encontrado no curso: {}", course_path.display());
            return Ok(());
        }

        // Organiza vídeos por diretório (módulos)
        let mut modules_map: std::collections::HashMap<PathBuf, Vec<PathBuf>> = 
            std::collections::HashMap::new();

        for video_path in videos_found {
            let parent_dir = video_path.parent().unwrap_or(course_path);
            modules_map.entry(parent_dir.to_path_buf())
                .or_insert_with(Vec::new)
                .push(video_path);
        }

        // Cria módulos e vídeos
        let mut module_order = 0;
        for (module_path, mut videos) in modules_map {
            // Ordena vídeos por nome
            videos.sort_by(|a, b| {
                let a_name = a.file_name().unwrap_or_default();
                let b_name = b.file_name().unwrap_or_default();
                a_name.cmp(b_name)
            });

            let module_name = if module_path == course_path {
                "Aulas".to_string()
            } else {
                module_path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Módulo")
                    .to_string()
            };

            let module_id = Uuid::new_v4().to_string();
            let module = Module {
                id: module_id.clone(),
                course_id: course_id.to_string(),
                name: module_name,
                path: module_path.to_string_lossy().to_string(),
                order_index: module_order,
            };

            println!("🔧 Tentando inserir módulo: {} (course_id: {})", module.name, module.course_id);
            match self.db.insert_module(&module) {
                Ok(_) => println!("✅ Módulo inserido com sucesso: {}", module.name),
                Err(e) => {
                    println!("❌ Erro ao inserir módulo {}: {}", module.name, e);
                    println!("🔍 Detalhes do módulo: {:?}", module);
                    return Err(e.into());
                }
            }
            module_order += 1;

            // Adiciona vídeos do módulo
            for (video_order, video_path) in videos.iter().enumerate() {
                let video_name = video_path
                    .file_stem()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Vídeo")
                    .to_string();

                let video_id = Uuid::new_v4().to_string();
                let video = Video {
                    id: video_id,
                    module_id: module_id.clone(),
                    course_id: course_id.to_string(),
                    name: video_name,
                    path: video_path.to_string_lossy().to_string(),
                    duration: None, // Será preenchido quando o vídeo for reproduzido
                    order_index: video_order as i32,
                };

                self.db.insert_video(&video)?;
            }
        }

        Ok(())
    }

    pub fn is_video_file(&self, path: &Path) -> bool {
        if let Some(extension) = path.extension() {
            if let Some(ext_str) = extension.to_str() {
                let ext_lower = ext_str.to_lowercase();
                let is_video = VIDEO_EXTENSIONS.contains(&ext_lower.as_str());
                println!("🔍 Verificando arquivo: {} | Extensão: {} | É vídeo: {}", 
                    path.display(), ext_lower, is_video);
                return is_video;
            } else {
                println!("⚠️ Não foi possível converter extensão para string: {}", path.display());
            }
        } else {
            println!("⚠️ Arquivo sem extensão: {}", path.display());
        }
        false
    }

    pub fn rescan_courses(&self, base_paths: &[PathBuf]) -> Result<Vec<Course>> {
        let mut all_courses = Vec::new();
        
        for base_path in base_paths {
            let courses = self.scan_directory(base_path)?;
            all_courses.extend(courses);
        }

        Ok(all_courses)
    }

    pub fn get_video_info(&self, video_path: &Path) -> Result<VideoInfo> {
        if !video_path.exists() {
            return Err(anyhow!("Arquivo de vídeo não encontrado: {}", video_path.display()));
        }

        let metadata = std::fs::metadata(video_path)?;
        let file_size = metadata.len();
        
        // Por enquanto, retorna informações básicas
        // Futuramente pode integrar com ffprobe para obter duração, resolução, etc.
        Ok(VideoInfo {
            path: video_path.to_path_buf(),
            file_size,
            duration: None,
            width: None,
            height: None,
        })
    }
}

#[derive(Debug)]
pub struct VideoInfo {
    pub path: PathBuf,
    pub file_size: u64,
    pub duration: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

pub fn get_default_course_directories() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    
    // Pasta base especificada pelo usuário
    let main_course_dir = PathBuf::from("C:\\MeusCursos");
    if main_course_dir.exists() {
        dirs.push(main_course_dir);
    }
    
    // Diretórios comuns onde usuários podem ter cursos
    if let Some(home) = dirs::home_dir() {
        dirs.push(home.join("Cursos"));
        dirs.push(home.join("Videos").join("Cursos"));
        dirs.push(home.join("Documents").join("Cursos"));
        dirs.push(home.join("Downloads"));
    }

    // Adiciona drives comuns no Windows
    #[cfg(windows)]
    {
        for drive in ['C', 'D', 'E', 'F'] {
            let drive_path = PathBuf::from(format!("{}:\\Cursos", drive));
            if drive_path.exists() {
                dirs.push(drive_path);
            }
        }
    }

    dirs.into_iter().filter(|p| p.exists()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[test]
    fn test_video_file_detection() {
        let temp_dir = TempDir::new().unwrap();
        let db = Database::new(&temp_dir.path().join("test.db")).unwrap();
        let scanner = FileSystemScanner::new(db);

        assert!(scanner.is_video_file(Path::new("video.mp4")));
        assert!(scanner.is_video_file(Path::new("movie.mkv")));
        assert!(!scanner.is_video_file(Path::new("document.txt")));
        assert!(!scanner.is_video_file(Path::new("image.jpg")));
    }

    #[test]
    fn test_course_scanning() {
        let temp_dir = TempDir::new().unwrap();
        let course_dir = temp_dir.path().join("Curso Teste");
        fs::create_dir_all(&course_dir).unwrap();
        
        // Cria alguns arquivos de vídeo de teste
        fs::write(course_dir.join("aula1.mp4"), "fake video content").unwrap();
        fs::write(course_dir.join("aula2.mkv"), "fake video content").unwrap();
        
        let db = Database::new(&temp_dir.path().join("test.db")).unwrap();
        let scanner = FileSystemScanner::new(db);
        
        let courses = scanner.scan_directory(temp_dir.path()).unwrap();
        assert_eq!(courses.len(), 1);
        assert_eq!(courses[0].name, "Curso Teste");
    }
}