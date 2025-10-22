import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import { getNodesBounds } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import { exportToNetFile, importFromNetFile, type NetworkFileData } from '../utils/networkFileFormat';

// --- Modern Export Functions using html-to-image ---

// Export diagram as PNG using html-to-image (Node-based)
export async function exportDiagramAsPng(
  nodes: ReactFlowNode[],
  setViewport: (viewport: { x: number; y: number; zoom: number }, options?: any) => void,
  fileName: string
): Promise<boolean> {
  // 1. บันทึก viewport เดิม
  const reactFlowInstance = (window as any).__reactFlowInstance;
  const originalViewport = reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 };

  try {
    if (!nodes.length) return false;

    // 2. คำนวณ bounds ของ nodes
    const nodesBounds = getNodesBounds(nodes);
    const padding = 50; // เพิ่ม padding รอบๆ nodes
    
    // 3. ตั้ง viewport ให้อยู่ที่มุมซ้ายบนของ bounds
    const viewport = {
      x: -(nodesBounds.x - padding),
      y: -(nodesBounds.y - padding),
      zoom: 1
    };

    // 4. ตั้ง viewport
    setViewport(viewport, { duration: 0 });
    
    // 5. รอให้ render เสร็จ
    await new Promise(resolve => setTimeout(resolve, 200));

    // 6. ซ่อนส่วนที่ไม่ต้องการ export
    const controls = document.querySelector('.react-flow__controls');
    const minimap = document.querySelector('.react-flow__minimap');
    const attribution = document.querySelector('.react-flow__attribution');
    
    const originalDisplays: string[] = [];
    [controls, minimap, attribution].forEach((element, index) => {
      if (element) {
        originalDisplays[index] = (element as HTMLElement).style.display;
        (element as HTMLElement).style.display = 'none';
      }
    });

    // 6. Export viewport
    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportElement) throw new Error('ไม่พบ viewport element');

    const dataUrl = await toPng(viewportElement, {
      backgroundColor: 'transparent',
      pixelRatio: window.devicePixelRatio || 2,
      quality: 1.0,
      width: Math.ceil(nodesBounds.width + padding * 2),
      height: Math.ceil(nodesBounds.height + padding * 2),
    });

    // 7. คืนค่า display elements
    [controls, minimap, attribution].forEach((element, index) => {
      if (element) {
        (element as HTMLElement).style.display = originalDisplays[index] || 'block';
      }
    });

    // 8. Download file
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = dataUrl;
    link.click();

    // 9. คืนค่า viewport เดิมหลัง export
    setViewport(originalViewport, { duration: 300 });

    return true;
  } catch (error) {
    console.error('PNG export failed:', error);
    
    // คืนค่า viewport เดิมในกรณี error
    setViewport(originalViewport, { duration: 300 });
    
    return false;
  }
}

// Export diagram as SVG using html-to-image (Node-based)
export async function exportDiagramAsSvg(
  nodes: ReactFlowNode[],
  setViewport: (viewport: { x: number; y: number; zoom: number }, options?: any) => void,
  fileName: string
): Promise<boolean> {
  // 1. บันทึก viewport เดิม
  const reactFlowInstance = (window as any).__reactFlowInstance;
  const originalViewport = reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 };

  try {
    if (!nodes.length) return false;

    // 2. คำนวณ bounds ของ nodes
    const nodesBounds = getNodesBounds(nodes);
    const padding = 50; // เพิ่ม padding รอบๆ nodes
    
    // 3. ตั้ง viewport ให้อยู่ที่มุมซ้ายบนของ bounds
    const viewport = {
      x: -(nodesBounds.x - padding),
      y: -(nodesBounds.y - padding),
      zoom: 1
    };

    // 4. ตั้ง viewport
    setViewport(viewport, { duration: 0 });
    
    // 5. รอให้ render เสร็จ
    await new Promise(resolve => setTimeout(resolve, 200));

    // 6. ซ่อนส่วนที่ไม่ต้องการ export
    const controls = document.querySelector('.react-flow__controls');
    const minimap = document.querySelector('.react-flow__minimap');
    const attribution = document.querySelector('.react-flow__attribution');
    
    const originalDisplays: string[] = [];
    [controls, minimap, attribution].forEach((element, index) => {
      if (element) {
        originalDisplays[index] = (element as HTMLElement).style.display;
        (element as HTMLElement).style.display = 'none';
      }
    });

    // 6. Export viewport as SVG
    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportElement) throw new Error('ไม่พบ viewport element');

    const svgDataUrl = await toSvg(viewportElement, {
      backgroundColor: 'transparent',
      width: Math.ceil(nodesBounds.width + padding * 2),
      height: Math.ceil(nodesBounds.height + padding * 2),
    });

    // 7. คืนค่า display elements
    [controls, minimap, attribution].forEach((element, index) => {
      if (element) {
        (element as HTMLElement).style.display = originalDisplays[index] || 'block';
      }
    });

    // 8. Download file
    const link = document.createElement('a');
    link.download = `${fileName}.svg`;
    link.href = svgDataUrl;
    link.click();

    // 9. คืนค่า viewport เดิมหลัง export
    setViewport(originalViewport, { duration: 300 });

    return true;
  } catch (error) {
    console.error('SVG export failed:', error);
    
    // คืนค่า viewport เดิมในกรณี error
    setViewport(originalViewport, { duration: 300 });
    
    return false;
  }
}

// Legacy wrapper functions สำหรับ MainLayout (ใช้ระบบใหม่ภายใน)
export async function exportDiagramAsPngLegacy(
  reactFlowElement: HTMLElement,
  nodes: ReactFlowNode[],
  fileName: string
): Promise<boolean> {
  // 1. บันทึก viewport เดิม
  const reactFlowInstance = (window as any).__reactFlowInstance;
  const originalViewport = reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 };

  try {
    if (!nodes.length) return false;

    // 2. คำนวณ bounds ของ nodes
    const nodesBounds = getNodesBounds(nodes);
    const padding = 50; // เพิ่ม padding รอบๆ nodes
    
    // 3. ตั้ง viewport ให้อยู่ที่มุมซ้ายบนของ bounds
    const viewport = {
      x: -(nodesBounds.x - padding),
      y: -(nodesBounds.y - padding),
      zoom: 1
    };

    // 4. หา ReactFlow instance เพื่อ setViewport
    if (reactFlowInstance && reactFlowInstance.setViewport) {
      reactFlowInstance.setViewport(viewport, { duration: 0 });
    }

    // 5. ซ่อนส่วนที่ไม่ต้องการ export
    const controls = document.querySelector('.react-flow__controls');
    const minimap = document.querySelector('.react-flow__minimap');
    const attribution = document.querySelector('.react-flow__attribution');
    
    const originalDisplays: string[] = [];
    [controls, minimap, attribution].forEach((element, index) => {
      if (element) {
        originalDisplays[index] = (element as HTMLElement).style.display;
        (element as HTMLElement).style.display = 'none';
      }
    });

    // 5. รอให้ render เสร็จ
    await new Promise(resolve => setTimeout(resolve, 200));

    // 6. Export viewport หรือ container
    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    const targetElement = viewportElement || reactFlowElement;

    const dataUrl = await toPng(targetElement, {
      backgroundColor: 'transparent',
      pixelRatio: window.devicePixelRatio || 2,
      quality: 1.0,
      width: Math.ceil(nodesBounds.width + padding * 2),
      height: Math.ceil(nodesBounds.height + padding * 2),
    });

    // 7. คืนค่า display elements
    [controls, minimap, attribution].forEach((element, index) => {
      if (element) {
        (element as HTMLElement).style.display = originalDisplays[index] || 'block';
      }
    });

    // 8. Download file
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = dataUrl;
    link.click();

    // 9. คืนค่า viewport เดิมหลัง export
    if (reactFlowInstance && reactFlowInstance.setViewport) {
      reactFlowInstance.setViewport(originalViewport, { duration: 300 });
    }

    return true;
  } catch (error) {
    console.error('Legacy PNG export failed:', error);
    
    // คืนค่า viewport เดิมในกรณี error
    if (reactFlowInstance && reactFlowInstance.setViewport) {
      reactFlowInstance.setViewport(originalViewport, { duration: 300 });
    }
    
    return false;
  }
}

export async function exportDiagramAsSvgLegacy(
  reactFlowElement: HTMLElement,
  nodes: ReactFlowNode[],
  fileName: string
): Promise<boolean> {
  // 1. บันทึก viewport เดิม
  const reactFlowInstance = (window as any).__reactFlowInstance;
  const originalViewport = reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 };

  try {
    if (!nodes.length) return false;

    // 2. คำนวณ bounds ของ nodes
    const nodesBounds = getNodesBounds(nodes);
    const padding = 50; // เพิ่ม padding รอบๆ nodes
    
    // 3. ตั้ง viewport ให้อยู่ที่มุมซ้ายบนของ bounds
    const viewport = {
      x: -(nodesBounds.x - padding),
      y: -(nodesBounds.y - padding),
      zoom: 1
    };

    // 4. หา ReactFlow instance เพื่อ setViewport
    if (reactFlowInstance && reactFlowInstance.setViewport) {
      reactFlowInstance.setViewport(viewport, { duration: 0 });
    }

    // 5. ซ่อนส่วนที่ไม่ต้องการ export
    const controls = document.querySelector('.react-flow__controls');
    const minimap = document.querySelector('.react-flow__minimap');
    const attribution = document.querySelector('.react-flow__attribution');
    
    const originalDisplays: string[] = [];
    [controls, minimap, attribution].forEach((element, index) => {
      if (element) {
        originalDisplays[index] = (element as HTMLElement).style.display;
        (element as HTMLElement).style.display = 'none';
      }
    });

    // 5. รอให้ render เสร็จ
    await new Promise(resolve => setTimeout(resolve, 200));

    // 6. Export viewport หรือ container as SVG
    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    const targetElement = viewportElement || reactFlowElement;

    const svgDataUrl = await toSvg(targetElement, {
      backgroundColor: 'transparent',
      width: Math.ceil(nodesBounds.width + padding * 2),
      height: Math.ceil(nodesBounds.height + padding * 2),
    });

    // 7. คืนค่า display elements
    [controls, minimap, attribution].forEach((element, index) => {
      if (element) {
        (element as HTMLElement).style.display = originalDisplays[index] || 'block';
      }
    });

    // 8. Download file
    const link = document.createElement('a');
    link.download = `${fileName}.svg`;
    link.href = svgDataUrl;
    link.click();

    // 9. คืนค่า viewport เดิมหลัง export
    if (reactFlowInstance && reactFlowInstance.setViewport) {
      reactFlowInstance.setViewport(originalViewport, { duration: 300 });
    }

    return true;
  } catch (error) {
    console.error('Legacy SVG export failed:', error);
    
    // คืนค่า viewport เดิมในกรณี error
    if (reactFlowInstance && reactFlowInstance.setViewport) {
      reactFlowInstance.setViewport(originalViewport, { duration: 300 });
    }
    
    return false;
  }
}

// --- Helper Functions ---

// คืนค่าขนาดของ node ตาม type
function getNodeSize(node: ReactFlowNode): { width: number; height: number } {
  switch (node.type) {
    case 'router':
    case 'switch':
    case 'firewall':
    case 'isp':
      return { width: node.width || 120, height: node.height || 80 };
    case 'server':
      return { width: node.width || 100, height: node.height || 120 };
    case 'pc':
      return { width: node.width || 80, height: node.height || 100 };
    default:
      return { width: node.width || 150, height: node.height || 40 };
  }
}

// ฟังก์ชันคำนวณ bounding box รวม text ที่อาจยาวออกไป
export function getBoundingBoxFromDiagram(nodes: ReactFlowNode[], edges: ReactFlowEdge[]) {
  if (!nodes.length) return null;

  let xMin = Infinity, yMin = Infinity;
  let xMax = -Infinity, yMax = -Infinity;

  nodes.forEach((node) => {
    const { x, y } = node.position;
    const { width, height } = getNodeSize(node);
    
    // คำนวณ node bounds
    xMin = Math.min(xMin, x);
    yMin = Math.min(yMin, y);
    xMax = Math.max(xMax, x + width);
    
    // เพิ่มพื้นที่สำหรับ text ที่อยู่ด้านล่าง node  
    let extraHeight = height + 28; // icon + baseline ปกติต้อง +14 พอดี
    
    // เพิ่มพื้นที่สำหรับข้อมูลเพิ่มเติม
    if (node.type === 'pc' && node.data?.userCapacity && node.data.userCapacity !== '') {
      extraHeight += 14; // userCapacity text
    }
    if ((node.type === 'router' || node.type === 'switch' || node.type === 'firewall' || node.type === 'isp')) {
      if (node.data?.deviceRole && node.type !== 'isp') extraHeight += 14;
      if (node.data?.maxThroughput) extraHeight += 14;
    }
    if (node.type === 'server' && node.data?.serverType) {
      extraHeight += 14;
    }
    
    yMax = Math.max(yMax, y + extraHeight);
    
    // เพิ่มพื้นที่สำหรับ text ที่อาจยาวข้าง (ประมาณครึ่งของชื่อ)
    const labelLength = ((node.data?.label as string) || node.type || 'Unknown').length;
    const textWidth = labelLength * 4; // ประมาณ 4px ต่อตัวอักษร
    const extraWidth = Math.max(0, (textWidth - width) / 2);
    
    xMin = Math.min(xMin, x - extraWidth);
    xMax = Math.max(xMax, x + width + extraWidth);
  });

  edges.forEach((edge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (sourceNode && targetNode) {
      const sourceX = sourceNode.position.x + getNodeSize(sourceNode).width / 2;
      const sourceY = sourceNode.position.y + getNodeSize(sourceNode).height / 2;
      const targetX = targetNode.position.x + getNodeSize(targetNode).width / 2;
      const targetY = targetNode.position.y + getNodeSize(targetNode).height / 2;
      const curveOffset = 20;
      xMin = Math.min(xMin, sourceX - curveOffset, targetX - curveOffset);
      yMin = Math.min(yMin, sourceY - curveOffset, targetY - curveOffset);
      xMax = Math.max(xMax, sourceX + curveOffset, targetX + curveOffset);
      yMax = Math.max(yMax, sourceY + curveOffset, targetY + curveOffset);
    }
  });

  return { xMin, yMin, xMax, yMax };
}

// --- Export/Import .net Format ---

// Export current diagram as .net file
export function exportAsNetworkFile(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  fileName: string,
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
    tags?: string[];
  },
  viewport?: { x: number; y: number; zoom: number },
  settings?: Record<string, any>
): boolean {
  try {
    exportToNetFile(nodes, edges, fileName, metadata, viewport, settings);
    return true;
  } catch (error) {
    console.error('Error exporting .net file:', error);
    return false;
  }
}

// Import .net file and return diagram data
export async function importNetworkFile(file: File): Promise<{
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  metadata: NetworkFileData['metadata'];
  viewport?: { x: number; y: number; zoom: number };
  settings?: Record<string, any>;
}> {
  try {
    const networkData = await importFromNetFile(file);
    
    return {
      nodes: networkData.diagram.nodes,
      edges: networkData.diagram.edges,
      metadata: networkData.metadata,
      viewport: networkData.diagram.viewport,
      settings: networkData.settings
    };
  } catch (error) {
    console.error('Error importing .net file:', error);
    throw error;
  }
}

