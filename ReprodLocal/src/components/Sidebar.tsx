import React, { useState, useEffect } from 'react';
import { Course, Module, coursesApi } from '../api/api';
import './Sidebar.css';

interface SidebarProps {
  onCourseSelect: (course: Course) => void;
  onModuleSelect: (module: Module) => void;
  selectedCourse?: Course;
  selectedModule?: Module;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onCourseSelect,
  onModuleSelect,
  selectedCourse,
  selectedModule
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadModules(selectedCourse.id);
      setExpandedCourse(selectedCourse.id);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const coursesData = await coursesApi.getAllCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async (courseId: string) => {
    try {
      const modulesData = await coursesApi.getCourseModules(courseId);
      setModules(modulesData);
    } catch (error) {
      console.error('Erro ao carregar módulos:', error);
    }
  };

  const handleCourseClick = async (course: Course) => {
    if (expandedCourse === course.id) {
      setExpandedCourse(null);
      setModules([]);
    } else {
      setExpandedCourse(course.id);
      await loadModules(course.id);
      onCourseSelect(course);
      await coursesApi.updateCourseLastAccessed(course.id);
    }
  };

  const handleScanCourses = async () => {
    try {
      setIsScanning(true);
      const newCourses = await coursesApi.scanCourses();
      setCourses(newCourses);
    } catch (error) {
      console.error('Erro ao escanear cursos:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectFolder = async () => {
    console.log('🔍 Iniciando seleção de pasta...');
    try {
      setIsScanning(true);
      console.log('📁 Chamando selectCourseDirectory...');
      const selectedPath = await coursesApi.selectCourseDirectory();
      console.log('📂 Resultado da seleção:', selectedPath);
      
      if (selectedPath) {
        console.log('✅ Pasta selecionada:', selectedPath);
        console.log('🔄 Escaneando diretório personalizado...');
        const newCourses = await coursesApi.scanCustomDirectory(selectedPath);
        console.log('📚 Cursos encontrados:', newCourses.length);
        setCourses(newCourses);
      } else {
        console.log('❌ Nenhuma pasta foi selecionada');
      }
    } catch (error) {
      console.error('❌ Erro ao selecionar pasta:', error);
    } finally {
      setIsScanning(false);
      console.log('🏁 Finalizando seleção de pasta');
    }
  };

  const formatLastAccessed = (dateString?: string) => {
    if (!dateString) return 'Nunca acessado';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hoje';
    if (diffDays === 2) return 'Ontem';
    if (diffDays <= 7) return `${diffDays} dias atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Meus Cursos</h2>
        </div>
        <div className="loading">Carregando cursos...</div>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Meus Cursos</h2>
        <div className="action-buttons">
          <button 
            className="scan-button"
            onClick={handleScanCourses}
            disabled={isScanning}
          >
            {isScanning ? '🔄' : '🔍'} {isScanning ? 'Escaneando...' : 'Escanear'}
          </button>
          <button 
            className="select-folder-button"
            onClick={handleSelectFolder}
            disabled={isScanning}
          >
            📁 Selecionar Pasta
          </button>
        </div>
      </div>

      <div className="courses-list">
        {courses.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum curso encontrado</p>
            <p className="empty-hint">
              Coloque seus cursos em <strong>C:\MeusCursos</strong> e clique em "Escanear"
            </p>
          </div>
        ) : (
          courses.map(course => (
            <div key={course.id} className="course-item">
              <div 
                className={`course-header ${selectedCourse?.id === course.id ? 'selected' : ''}`}
                onClick={() => handleCourseClick(course)}
              >
                <div className="course-info">
                  <h3 className="course-name">{course.name}</h3>
                  <span className="course-last-accessed">
                    {formatLastAccessed(course.last_accessed)}
                  </span>
                </div>
                <span className="expand-icon">
                  {expandedCourse === course.id ? '▼' : '▶'}
                </span>
              </div>

              {expandedCourse === course.id && (
                <div className="modules-list">
                  {modules.length === 0 ? (
                    <div className="no-modules">Nenhum módulo encontrado</div>
                  ) : (
                    modules.map(module => (
                      <div 
                        key={module.id}
                        className={`module-item ${selectedModule?.id === module.id ? 'selected' : ''}`}
                        onClick={() => onModuleSelect(module)}
                      >
                        <span className="module-icon">📁</span>
                        <span className="module-name">{module.name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};