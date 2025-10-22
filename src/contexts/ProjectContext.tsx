import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { useAuth } from './AuthContext';

interface Project {
  id: number;
  name: string;
  description?: string;
  diagram_data?: any; // Changed from string to any to match backend
  is_favorite?: boolean;
  owner_id: number;
  created_at: string;
  updated_at?: string;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  createProject: (data: { name: string; description?: string; diagram_data?: string }) => Promise<void>;
  loadProjects: () => Promise<void>;
  selectProject: (project: Project, saveCurrentFirst?: boolean) => void;
  updateProject: (id: number, data: any) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
  clearCurrentProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load projects when user is authenticated
  useEffect(() => {
    if (user) {
      // ตรวจสอบว่าเป็นการ login ครั้งแรกหรือ refresh
      const savedProjectId = localStorage.getItem('currentProjectId');
      const isFirstLoad = localStorage.getItem('isFirstLoadAfterLogin');
      
      // ถ้าเป็นการ login ครั้งแรก (ไม่มี savedProjectId) ให้ตั้งค่า flag
      if (!savedProjectId && isFirstLoad !== 'false') {
        localStorage.setItem('isFirstLoadAfterLogin', 'true');
      } else {
        // ถ้ามี savedProjectId หรือเคย login แล้ว ให้ลบ flag
        localStorage.removeItem('isFirstLoadAfterLogin');
      }
      
      loadProjects();
    } else {
      // Clear projects when user logs out
      setProjects([]);
      setCurrentProject(null);
      // ลบ flag เมื่อ logout
      localStorage.removeItem('isFirstLoadAfterLogin');
      // ไม่ลบ localStorage.removeItem('currentProjectId'); เพื่อให้เก็บไว้สำหรับครั้งต่อไป
    }
  }, [user]);

  // Restore current project from localStorage after projects are loaded
  useEffect(() => {
    if (projects.length > 0 && !currentProject) {
      const savedProjectId = localStorage.getItem('currentProjectId');
      const isFirstLoad = localStorage.getItem('isFirstLoadAfterLogin');
      
      // ถ้าเป็นครั้งแรกที่ login ให้ไม่ restore project ทันที
      if (isFirstLoad === 'true') {
        localStorage.removeItem('isFirstLoadAfterLogin');
        return;
      }
      
      // ถ้ามี savedProjectId ให้ restore project ทันที (รวมถึงตอน refresh)
      if (savedProjectId) {
        const project = projects.find(p => p.id.toString() === savedProjectId);
        if (project) {
          // Fetch full project details when restoring
          selectProject(project);
        } else {
          // ถ้าไม่พบโปรเจกต์ที่บันทึกไว้ ให้ลบออกจาก localStorage
          localStorage.removeItem('currentProjectId');
        }
      }
    }
  }, [projects, currentProject]);

  const loadProjects = async () => {
    if (!user) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error: any) {
      //consle.error('Failed to load projects:', error);
      //consle.error('Error details:', error.response?.data);
      //consle.error('Error status:', error.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (data: { name: string; description?: string; diagram_data?: string }) => {
    try {
      const response = await projectsAPI.create(data);
      const newProject = response.data;
      
      setProjects(prev => [...prev, newProject]);
      setCurrentProject(newProject);
      localStorage.setItem('currentProjectId', newProject.id.toString());
      // ลบ flag เมื่อสร้าง project ใหม่
      localStorage.removeItem('isFirstLoadAfterLogin');
      localStorage.setItem('isFirstLoadAfterLogin', 'false');
    } catch (error) {
      //consle.error('Failed to create project:', error);
      throw error;
    }
  };

  const selectProject = async (project: Project, saveCurrentFirst?: boolean) => {
    try {
      // Save current project before switching if requested
      if (saveCurrentFirst && currentProject) {
        // This will be handled by the component that calls selectProject
      }
      
      // Fetch full project details including diagram_data
      const response = await projectsAPI.getById(project.id);
      const fullProject = response.data;
      
      setCurrentProject(fullProject);
      localStorage.setItem('currentProjectId', project.id.toString());
      
      // ลบ flag เมื่อ user เลือก project เพื่อให้การ restore ทำงานปกติในครั้งต่อไป
      localStorage.removeItem('isFirstLoadAfterLogin');
      localStorage.setItem('isFirstLoadAfterLogin', 'false');
      
      // Navigate to project page with proper routing
      navigate(`/project/${project.id}`, { replace: true });
    } catch (error) {
      //consle.error('Failed to select project:', error);
      // Fallback to basic project data
      setCurrentProject(project);
      localStorage.setItem('currentProjectId', project.id.toString());
      // Still navigate even on error
      navigate(`/project/${project.id}`, { replace: true });
    }
  };

  const updateProject = async (id: number, data: any) => {
    try {
      const response = await projectsAPI.update(id, data);
      setProjects(prev => prev.map(p => p.id === id ? response.data : p));
      if (currentProject?.id === id) {
        setCurrentProject(response.data);
      }
    } catch (error) {
      //consle.error('Failed to update project:', error);
      throw error;
    }
  };

  const deleteProject = async (id: number) => {
    try {
      await projectsAPI.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProject?.id === id) {
        setCurrentProject(null);
        localStorage.removeItem('currentProjectId');
      }
    } catch (error) {
      //consle.error('Failed to delete project:', error);
      throw error;
    }
  };

  const toggleFavorite = async (id: number) => {
    try {
      const project = projects.find(p => p.id === id);
      if (!project) return;
      
      const response = await projectsAPI.update(id, {
        is_favorite: !project.is_favorite
      });
      
      setProjects(prev => prev.map(p => p.id === id ? response.data : p));
      if (currentProject?.id === id) {
        setCurrentProject(response.data);
      }
    } catch (error) {
      //consle.error('Failed to toggle favorite:', error);
      throw error;
    }
  };

  const clearCurrentProject = () => {
    setCurrentProject(null);
    localStorage.removeItem('currentProjectId');
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      loading,
      createProject,
      loadProjects,
      selectProject,
      updateProject,
      deleteProject,
      toggleFavorite,
      clearCurrentProject,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}; 