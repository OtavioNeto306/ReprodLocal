import { invoke } from '@tauri-apps/api/core';

// Função para aguardar o Tauri estar pronto
const waitForTauri = async (): Promise<void> => {
  // Aguarda um pouco para garantir que o Tauri está carregado
  await new Promise(resolve => setTimeout(resolve, 100));
};

// Tipos TypeScript para as estruturas do backend
export interface Course {
  id: string;
  name: string;
  path: string;
  created_at: string;
  last_accessed?: string;
}

export interface Module {
  id: string;
  course_id: string;
  name: string;
  path: string;
  order_index: number;
}

export interface Video {
  id: string;
  module_id: string;
  course_id: string;
  name: string;
  path: string;
  duration?: number;
  order_index: number;
}

export interface VideoProgress {
  id: string;
  video_id: string;
  current_time: number;
  duration: number;
  completed: boolean;
  last_watched: string;
}

export interface VideoStatus {
  is_playing: boolean;
  current_time: number;
  duration: number;
  volume: number;
}

export interface MediaFile {
  name: string;
  path: string;
  file_type: string;
  size: number;
  duration?: number;
}

export interface SubFolder {
  name: string;
  path: string;
  media_count: number;
}

export interface FolderContent {
  path: string;
  media_files: MediaFile[];
  subfolders: SubFolder[];
  total_files: number;
}

// Dados mock temporários para teste
const mockCourses: Course[] = [
  {
    id: '1',
    name: 'Curso de React Avançado',
    path: '/cursos/react-avancado',
    created_at: '2024-01-15T10:00:00Z',
    last_accessed: '2024-01-20T15:30:00Z'
  },
  {
    id: '2',
    name: 'TypeScript Fundamentals',
    path: '/cursos/typescript-fundamentals',
    created_at: '2024-01-10T09:00:00Z',
    last_accessed: '2024-01-18T14:20:00Z'
  }
];

const mockModules: Module[] = [
  {
    id: '1',
    course_id: '1',
    name: 'Introdução ao React',
    path: '/cursos/react-avancado/modulo-1',
    order_index: 1
  },
  {
    id: '2',
    course_id: '1',
    name: 'Hooks Avançados',
    path: '/cursos/react-avancado/modulo-2',
    order_index: 2
  },
  {
    id: '3',
    course_id: '2',
    name: 'Tipos Básicos',
    path: '/cursos/typescript-fundamentals/modulo-1',
    order_index: 1
  }
];

const mockVideos: Video[] = [
  {
    id: '1',
    module_id: '1',
    course_id: '1',
    name: 'Introdução aos Componentes',
    path: '/cursos/react-avancado/modulo-1/video-1.mp4',
    duration: 1200,
    order_index: 1
  },
  {
    id: '2',
    module_id: '1',
    course_id: '1',
    name: 'Props e State',
    path: '/cursos/react-avancado/modulo-1/video-2.mp4',
    duration: 1800,
    order_index: 2
  },
  {
    id: '3',
    module_id: '1',
    course_id: '1',
    name: 'Demo do Player - ReprodLocal',
    path: 'http://localhost:1420/sample-video.html',
    duration: 300,
    order_index: 3
  },
  {
    id: '4',
    module_id: '2',
    course_id: '1',
    name: 'useState Hook',
    path: '/cursos/react-avancado/modulo-2/video-1.mp4',
    duration: 2100,
    order_index: 1
  }
];

const mockVideoProgress: VideoProgress[] = [
  {
    id: '1',
    video_id: '1',
    current_time: 600,
    duration: 1200,
    completed: false,
    last_watched: '2024-01-20T15:30:00Z'
  },
  {
    id: '2',
    video_id: '3',
    current_time: 0,
    duration: 300,
    completed: false,
    last_watched: '2024-01-20T16:00:00Z'
  }
];

// API de Cursos
export const coursesApi = {
  async scanCourses(): Promise<Course[]> {
    try {
      await waitForTauri();
      return await invoke<Course[]>('scan_courses');
    } catch (error) {
      console.error('Erro ao escanear cursos:', error);
      // Fallback para dados mock em caso de erro
      return mockCourses;
    }
  },

  async getAllCourses(): Promise<Course[]> {
    try {
      await waitForTauri();
      return await invoke<Course[]>('get_all_courses');
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
      // Fallback para dados mock em caso de erro
      return mockCourses;
    }
  },

  async getCourseModules(courseId: string): Promise<Module[]> {
    try {
      return await invoke<Module[]>('get_course_modules', { courseId });
    } catch (error) {
      console.error('Erro ao carregar módulos:', error);
      // Fallback para dados mock em caso de erro
      const courseModules = mockModules.filter(module => module.course_id === courseId);
      return courseModules;
    }
  },

  async updateCourseLastAccessed(courseId: string): Promise<void> {
    try {
      await invoke<void>('update_course_last_accessed', { courseId });
    } catch (error) {
      console.error('Erro ao atualizar último acesso:', error);
      // Fallback para dados mock em caso de erro
      const course = mockCourses.find(c => c.id === courseId);
      if (course) {
        course.last_accessed = new Date().toISOString();
      }
    }
  },

  async scanCustomDirectory(directoryPath: string): Promise<Course[]> {
    try {
      return await invoke<Course[]>('scan_custom_directory', { directoryPath });
    } catch (error) {
      console.error('Erro ao escanear diretório customizado:', error);
      // Fallback para dados mock em caso de erro
      return mockCourses;
    }
  },



  selectCourseDirectory: async (): Promise<string | null> => {
    try {
      console.log('⏳ Aguardando Tauri estar pronto...');
      await waitForTauri();
      console.log('🚀 Tauri pronto, invocando select_course_directory...');
      const result = await invoke<string | null>('select_course_directory');
      console.log('📋 Resultado do invoke:', result);
      return result;
    } catch (error) {
      console.error('❌ Erro ao selecionar diretório:', error);
      return null;
    }
  }
};

// API de Pastas
export const folderApi = {
  async scanFolderContent(folderPath: string): Promise<FolderContent> {
    try {
      await waitForTauri();
      return await invoke<FolderContent>('scan_folder_content', { folderPath });
    } catch (error) {
      console.error('Erro ao escanear conteúdo da pasta:', error);
      throw new ApiError('Erro ao escanear pasta', 'SCAN_FOLDER_ERROR');
    }
  },

  async getFolderPlaylist(folderPath: string): Promise<MediaFile[]> {
    try {
      await waitForTauri();
      return await invoke<MediaFile[]>('get_folder_playlist', { folderPath });
    } catch (error) {
      console.error('Erro ao criar playlist da pasta:', error);
      throw new ApiError('Erro ao criar playlist', 'PLAYLIST_ERROR');
    }
  },

  async selectFolder(): Promise<string | null> {
    try {
      await waitForTauri();
      return await invoke<string | null>('select_course_directory');
    } catch (error) {
      console.error('Erro ao selecionar pasta:', error);
      return null;
    }
  }
};

// API de Vídeos
export const videosApi = {
  async getModuleVideos(moduleId: string): Promise<Video[]> {
    return new Promise(resolve => {
      const moduleVideos = mockVideos.filter(video => video.module_id === moduleId);
      setTimeout(() => resolve(moduleVideos), 300);
    });
  },

  async getVideoProgress(videoId: string): Promise<VideoProgress | null> {
    return new Promise(resolve => {
      const progress = mockVideoProgress.find(p => p.video_id === videoId);
      setTimeout(() => resolve(progress || null), 200);
    });
  },

  async updateVideoProgress(
    videoId: string,
    currentTime: number,
    duration: number,
    completed: boolean
  ): Promise<void> {
    return new Promise(resolve => {
      const existingProgress = mockVideoProgress.find(p => p.video_id === videoId);
      if (existingProgress) {
        existingProgress.current_time = currentTime;
        existingProgress.duration = duration;
        existingProgress.completed = completed;
        existingProgress.last_watched = new Date().toISOString();
      } else {
        mockVideoProgress.push({
          id: Date.now().toString(),
          video_id: videoId,
          current_time: currentTime,
          duration,
          completed,
          last_watched: new Date().toISOString()
        });
      }
      setTimeout(() => resolve(), 200);
    });
  },

  async getRecentVideos(limit: number): Promise<[Video, VideoProgress][]> {
    return new Promise(resolve => {
      const recentPairs: [Video, VideoProgress][] = [];
      mockVideoProgress.slice(0, limit).forEach(progress => {
        const video = mockVideos.find(v => v.id === progress.video_id);
        if (video) {
          recentPairs.push([video, progress]);
        }
      });
      setTimeout(() => resolve(recentPairs), 300);
    });
  }
};

// Estado simulado do player
let mockPlayerStatus: VideoStatus = {
  is_playing: false,
  current_time: 0,
  duration: 0,
  volume: 1.0
};

// API do Player de Vídeo
export const playerApi = {
  async playVideo(videoPath: string, startTime?: number): Promise<void> {
    return new Promise(resolve => {
      mockPlayerStatus.is_playing = true;
      mockPlayerStatus.current_time = startTime || 0;
      mockPlayerStatus.duration = 1800; // 30 minutos simulados
      console.log(`Reproduzindo vídeo: ${videoPath}`);
      setTimeout(() => resolve(), 200);
    });
  },

  async pauseVideo(): Promise<void> {
    return new Promise(resolve => {
      mockPlayerStatus.is_playing = false;
      console.log('Vídeo pausado');
      setTimeout(() => resolve(), 100);
    });
  },

  async resumeVideo(): Promise<void> {
    return new Promise(resolve => {
      mockPlayerStatus.is_playing = true;
      console.log('Vídeo retomado');
      setTimeout(() => resolve(), 100);
    });
  },

  async seekVideo(time: number): Promise<void> {
    return new Promise(resolve => {
      mockPlayerStatus.current_time = time;
      console.log(`Buscando para: ${time}s`);
      setTimeout(() => resolve(), 100);
    });
  },

  async stopVideo(): Promise<void> {
    return new Promise(resolve => {
      mockPlayerStatus.is_playing = false;
      mockPlayerStatus.current_time = 0;
      console.log('Vídeo parado');
      setTimeout(() => resolve(), 100);
    });
  },

  async getVideoStatus(): Promise<VideoStatus | null> {
    return new Promise(resolve => {
      setTimeout(() => resolve({ ...mockPlayerStatus }), 100);
    });
  }
};

// Utilitários
export const utils = {
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },

  getProgressPercentage(progress: VideoProgress): number {
    if (progress.duration === 0) return 0;
    return Math.round((progress.current_time / progress.duration) * 100);
  },

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  getVideoExtension(path: string): string {
    return path.split('.').pop()?.toLowerCase() || '';
  },

  isVideoFile(path: string): boolean {
    const videoExtensions = ['mp4', 'mkv', 'avi', 'ts', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ogv'];
    const extension = this.getVideoExtension(path);
    return videoExtensions.includes(extension);
  }
};

// Hook personalizado para gerenciar estado de loading
export class ApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Wrapper para tratamento de erros
export const withErrorHandling = async <T>(
  apiCall: () => Promise<T>,
  errorMessage?: string
): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API Error:', error);
    throw new ApiError(
      errorMessage || 'Erro na comunicação com o backend',
      typeof error === 'string' ? error : 'UNKNOWN_ERROR'
    );
  }
};