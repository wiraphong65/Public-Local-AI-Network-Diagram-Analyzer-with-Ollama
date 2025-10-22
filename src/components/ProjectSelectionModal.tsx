import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useProject } from '@/contexts/ProjectContext';
import { useNetworkDiagram } from '@/hooks/useNetworkDiagram';
import { LoadingSpinner } from './LoadingSpinner';

interface ProjectSelectionModalProps {
  open: boolean;
  onClose: () => void;
}

export const ProjectSelectionModal: React.FC<ProjectSelectionModalProps> = ({
  open,
  onClose,
}) => {
  const { projects, selectProject, currentProject, updateProject, loading } = useProject();
  const { setProjectName, loadDiagramFromData, nodes, edges, projectName } = useNetworkDiagram();

  const handleProjectSelect = async (project: any) => {
    // Save current project before switching
    if (currentProject && (nodes.length > 0 || edges.length > 0)) {
      try {
        const diagramData = { nodes, edges };
        await updateProject(currentProject.id, {
          name: projectName,
          diagram_data: diagramData
        });
      } catch (error) {
        //consle.error('Auto-save failed:', error);
      }
    }
    
    selectProject(project);
    setProjectName(project.name);
    
    // Load diagram data if exists
    if (project.diagram_data) {
      const diagramDataStr = typeof project.diagram_data === 'string' 
        ? project.diagram_data 
        : JSON.stringify(project.diagram_data);
      loadDiagramFromData(diagramDataStr);
    }
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-8 gap-6 rounded-lg shadow-xl scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent" style={{scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent'}}>
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold leading-none tracking-tight">เลือกโปรเจกต์</DialogTitle>
          <DialogDescription className="text-base text-gray-500">เลือกโปรเจกต์ที่ต้องการเปิด</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ไม่มีโปรเจกต์ใดๆ
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="rounded-md border bg-white shadow cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProjectSelect(project)}
                >
                  <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="font-semibold tracking-tight text-lg">{project.name}</h3>
                    {project.description && (
                      <span className="text-sm text-gray-500">{project.description}</span>
                    )}
                  </div>
                  <div className="p-6 pt-0">
                    <div className="text-sm text-gray-500">สร้างเมื่อ: {new Date(project.created_at).toLocaleDateString('th-TH')}</div>
                    {project.updated_at && (
                      <div className="text-sm text-gray-500">แก้ไขล่าสุด: {new Date(project.updated_at).toLocaleDateString('th-TH')}</div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="h-10 px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100">
            ยกเลิก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 