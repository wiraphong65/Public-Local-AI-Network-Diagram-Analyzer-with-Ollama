import type { Node, Edge } from '@xyflow/react';

// Network File Format Interface
export interface NetworkFileData {
  version: string;
  metadata: {
    title: string;
    description?: string;
    author?: string;
    createdAt: string;
    updatedAt: string;
    tags?: string[];
  };
  diagram: {
    nodes: Node[];
    edges: Edge[];
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
  };
  settings?: {
    theme?: string;
    gridEnabled?: boolean;
    snapToGrid?: boolean;
    [key: string]: any;
  };
}

// Current format version
const CURRENT_VERSION = '1.0.0';

// Create network file data
export function createNetworkFileData(
  nodes: Node[],
  edges: Edge[],
  metadata: Partial<NetworkFileData['metadata']> = {},
  viewport?: NetworkFileData['diagram']['viewport'],
  settings?: NetworkFileData['settings']
): NetworkFileData {
  const now = new Date().toISOString();
  
  return {
    version: CURRENT_VERSION,
    metadata: {
      title: metadata.title || 'Network Diagram',
      description: metadata.description,
      author: metadata.author,
      createdAt: metadata.createdAt || now,
      updatedAt: now,
      tags: metadata.tags || []
    },
    diagram: {
      nodes: nodes.map(node => ({
        ...node,
        // Ensure all required properties are present
        position: node.position,
        data: node.data || {},
        type: node.type || 'default'
      })),
      edges: edges.map(edge => ({
        ...edge,
        // Ensure all required properties are present
        source: edge.source,
        target: edge.target,
        data: edge.data || {}
      })),
      viewport
    },
    settings: settings || {}
  };
}

// Export to .net file
export function exportToNetFile(
  nodes: Node[],
  edges: Edge[],
  fileName: string,
  metadata?: Partial<NetworkFileData['metadata']>,
  viewport?: NetworkFileData['diagram']['viewport'],
  settings?: NetworkFileData['settings']
): void {
  try {
    const networkData = createNetworkFileData(nodes, edges, metadata, viewport, settings);
    const jsonString = JSON.stringify(networkData, null, 2);
    
    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Ensure .net extension
    const cleanFileName = fileName.replace(/\.[^/.]+$/, '');
    link.download = `${cleanFileName}.net`;
    link.href = url;
    link.click();
    
    // Cleanup
    URL.revokeObjectURL(url);
    
    // Export completed successfully
  } catch (error) {
    //consle.error('Error exporting network file:', error);
    throw new Error('ไม่สามารถส่งออกไฟล์เครือข่ายได้');
  }
}

// Import from .net file
export function importFromNetFile(file: File): Promise<NetworkFileData> {
  return new Promise((resolve, reject) => {
    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.net')) {
      reject(new Error('รูปแบบไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์ .net'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const networkData: NetworkFileData = JSON.parse(content);
        
        // Validate file structure
        if (!validateNetworkFileData(networkData)) {
          reject(new Error('รูปแบบไฟล์ .net ไม่ถูกต้องหรือข้อมูลเสียหาย.'));
          return;
        }
        
       
        resolve(networkData);
      } catch (error) {
        
        reject(new Error('ไม่สามารถแยกวิเคราะห์ไฟล์ .net ได้ ไฟล์อาจเสียหาย'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
    };
    
    reader.readAsText(file);
  });
}

// Validate network file data structure
export function validateNetworkFileData(data: any): data is NetworkFileData {
  try {
    // Check required top-level properties
    if (!data || typeof data !== 'object') return false;
    if (!data.version || typeof data.version !== 'string') return false;
    if (!data.metadata || typeof data.metadata !== 'object') return false;
    if (!data.diagram || typeof data.diagram !== 'object') return false;
    
    // Check metadata
    const { metadata } = data;
    if (!metadata.title || typeof metadata.title !== 'string') return false;
    if (!metadata.createdAt || typeof metadata.createdAt !== 'string') return false;
    if (!metadata.updatedAt || typeof metadata.updatedAt !== 'string') return false;
    
    // Check diagram
    const { diagram } = data;
    if (!Array.isArray(diagram.nodes)) return false;
    if (!Array.isArray(diagram.edges)) return false;
    
    // Validate nodes structure
    for (const node of diagram.nodes) {
      if (!node.id || typeof node.id !== 'string') return false;
      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') return false;
    }
    
    // Validate edges structure
    for (const edge of diagram.edges) {
      if (!edge.id || typeof edge.id !== 'string') return false;
      if (!edge.source || typeof edge.source !== 'string') return false;
      if (!edge.target || typeof edge.target !== 'string') return false;
    }
    
    return true;
  } catch (error) {
    //consle.error('Validation error:', error);
    return false;
  }
}



