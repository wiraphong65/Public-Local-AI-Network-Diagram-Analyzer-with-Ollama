import { useCallback, useRef, useState, useEffect } from 'react';
import type { Node as ReactFlowNode, Edge, Connection } from '@xyflow/react';
import { useNodesState, useEdgesState, useReactFlow } from '@xyflow/react';
import { toast } from 'sonner';
import type { Device, NetworkDiagram } from '@/types/network';
import { useProject } from '@/contexts/ProjectContext';
import { useNetworkUndo } from './useNetworkUndo';
import {
  validateConnection,
  getPortStatus
} from '@/utils/connectionValidation';

export const useNetworkDiagram = () => {
  // State hooks - must be in consistent order
  const [nodes, setNodes, onNodesChange] = useNodesState<ReactFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Device | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [showEdgeProperties, setShowEdgeProperties] = useState(false);
  const [tempEdgeData, setTempEdgeData] = useState<any>(null);
  const [projectName, setProjectName] = useState<string>('โปรเจกต์ใหม่');

  // Copy/Paste state
  const [copiedNodes, setCopiedNodes] = useState<ReactFlowNode[]>([]);
  const [copiedEdges, setCopiedEdges] = useState<Edge[]>([]);

  // Use refs to get current state in async operations
  const nodesRef = useRef<ReactFlowNode[]>([]);
  const edgesRef = useRef<Edge[]>([]);

  // Update refs when state changes
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Command Pattern Undo/Redo System
  const {
    executeCommand,
    undo: handleUndo,
    redo: handleRedo,
    clearHistory,
    getHistoryInfo,
    undoStack,
    redoStack,
    AddNodeCommand,
    DeleteNodeCommand,
    MoveNodeCommand,
    UpdateNodeCommand,
    AddEdgeCommand,
    DeleteEdgeCommand,
    UpdateEdgeCommand,
    BatchCommand
  } = useNetworkUndo();

  // Connection mode state
  const [isConnectionMode, setIsConnectionMode] = useState(false);
  const [selectedSourceNode, setSelectedSourceNode] = useState<string | null>(null);

  // Other hooks
  const reactFlowInstance = useReactFlow();
  const { currentProject, updateProject } = useProject();


  const nodeTypeCounters = useRef<{ [key: string]: number }>({
    router: 1,
    switch: 1,
    firewall: 1,
    server: 1,
    pc: 1,
    isp: 1,
  });
  const nodeId = useRef(0);

  // Sync projectName with currentProject
  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name);
    } else {
      setProjectName('โปรเจกต์ใหม่');
    }
  }, [currentProject]);

  // Callback hooks - must be in consistent order
  const getId = useCallback(() => `node_${nodeId.current++}`, []);

  // Track node positions for move commands
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // ปรับ onNodesChange ให้ใช้ Command Pattern สำหรับ drag operations
  const optimizedOnNodesChange = useCallback(
    (changes: any) => {
      // Handle position changes with commands
      changes.forEach((change: any) => {
        if (change.type === 'positionStart') {
          // Store initial position from current node state
          const node = nodes.find(n => n.id === change.id);
          if (node) {
            nodePositionsRef.current.set(change.id, { ...node.position });
          }
        } else if (change.type === 'positionEnd') {
          // Create move command when drag ends
          const oldPosition = nodePositionsRef.current.get(change.id);
          const node = nodes.find(n => n.id === change.id);

          if (oldPosition && node &&
            (oldPosition.x !== node.position.x || oldPosition.y !== node.position.y)) {
            const command = new MoveNodeCommand(
              change.id,
              oldPosition,
              { ...node.position },
              setNodes
            );
            executeCommand(command);
          }
          nodePositionsRef.current.delete(change.id);
        }
      });

      onNodesChange(changes);
    },
    [onNodesChange, executeCommand, MoveNodeCommand, setNodes, nodes]
  );

  const optimizedOnEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // ปรับ onConnect ให้มี Connection Validation
  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      if (!sourceNode || !targetNode) {
        toast.error('ไม่พบอุปกรณ์ที่ต้องการเชื่อมต่อ');
        return;
      }

      // Validate connection using new validation system (with port limits)
      const validation = validateConnection(sourceNode, targetNode, edges);

      if (!validation.isValid) {
        // Show specific error message from validation
        toast.error(validation.reason, {
          duration: 3000
        });

        return; // Block invalid connection
      }

      // Connection is valid - proceed with creation
      const uniqueId = `edge_${params.source}_${params.target}_${Date.now()}`;

      // ค่า default - เปลี่ยนเป็น 1000 Mbps
      let bandwidth = '1000';
      let bandwidthUnit = 'Mbps';

      // ลองหา bandwidth/bandwidthUnit จาก node source/target
      if (typeof sourceNode?.data?.bandwidth === 'string' && typeof sourceNode?.data?.bandwidthUnit === 'string') {
        bandwidth = sourceNode.data.bandwidth;
        bandwidthUnit = sourceNode.data.bandwidthUnit;
      } else if (typeof targetNode?.data?.bandwidth === 'string' && typeof targetNode?.data?.bandwidthUnit === 'string') {
        bandwidth = targetNode.data.bandwidth;
        bandwidthUnit = targetNode.data.bandwidthUnit;
      }

      const edgeLabel = `${bandwidth} ${bandwidthUnit}`;
      const newEdge: Edge = {
        ...params,
        id: uniqueId,
        type: 'custom',
        data: {
          label: edgeLabel,
          bandwidth,
          bandwidthUnit
        }
      } as Edge;

      // Use command pattern for undo/redo support
      const command = new AddEdgeCommand(newEdge, setEdges);
      executeCommand(command);

      // Show success message with port info
      const sourcePortStatus = getPortStatus(sourceNode, edges);
      const targetPortStatus = getPortStatus(targetNode, edges);

      let message = 'เชื่อมต่อสำเร็จ';
      if (sourcePortStatus.total > 0 && targetPortStatus.total > 0) {
        // const sourceType = getDeviceType(sourceNode).toUpperCase();
        // const targetType = getDeviceType(targetNode).toUpperCase();
        // message += ` (${sourceType}: ${sourcePortStatus.used + 1}/${sourcePortStatus.total}, ${targetType}: ${targetPortStatus.used + 1}/${targetPortStatus.total})`;
      }

      toast.success(message, {
        duration: 3000
      });
    },
    [nodes, executeCommand, AddEdgeCommand, setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let deviceLabel = '';
      const labelNumber = nodeTypeCounters.current[type] || 1;
      switch (type) {
        case 'router':
          deviceLabel = `Router ${labelNumber}`;
          break;
        case 'switch':
          deviceLabel = `Switch ${labelNumber}`;
          break;
        case 'firewall':
          deviceLabel = `Firewall ${labelNumber}`;
          break;
        case 'server':
          deviceLabel = `Server ${labelNumber}`;
          break;
        case 'pc':
          deviceLabel = `PC ${labelNumber}`;
          break;
        case 'isp':
          deviceLabel = `ISP ${labelNumber}`;
          break;
        default:
          deviceLabel = `${type.charAt(0).toUpperCase() + type.slice(1)} ${labelNumber}`;
      }
      nodeTypeCounters.current[type] = labelNumber + 1;

      const newNode: ReactFlowNode = {
        id: getId(),
        type,
        position,
        data: {
          label: deviceLabel,
          type,
          // เพิ่มค่าเริ่มต้น throughput 1000 Mbps สำหรับอุปกรณ์ที่ไม่ใช่ PC และ ISP
          ...(type.toLowerCase() !== 'pc' && type.toLowerCase() !== 'isp' && {
            maxThroughput: '1000',
            throughputUnit: 'Mbps'
          })
        },
      };

      const command = new AddNodeCommand(newNode, setNodes);
      executeCommand(command);
      toast.success(`${deviceLabel} เพิ่มเข้าแผนผังแล้ว`);
    },
    [reactFlowInstance, getId, setNodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: ReactFlowNode) => {
    event.stopPropagation();
    if (isConnectionMode) {
      // ...existing code...
      if (!selectedSourceNode) {
        setSelectedSourceNode(node.id);
        toast.success(`เลือก ${node.data?.label || node.type} เป็นต้นทาง`);
      } else if (selectedSourceNode !== node.id) {
        // Validate connection in connection mode
        const sourceNode = nodes.find(n => n.id === selectedSourceNode);
        const targetNode = nodes.find(n => n.id === node.id);

        if (!sourceNode || !targetNode) {
          toast.error('ไม่พบอุปกรณ์ที่ต้องการเชื่อมต่อ');
          setSelectedSourceNode(null);
          return;
        }

        // Validate connection using new validation system
        const validation = validateConnection(sourceNode, targetNode, edges);

        if (!validation.isValid) {
          // Show specific error message from validation
          toast.error(validation.reason, {
            duration: 3000
          });

          setSelectedSourceNode(null);
          return; // Block invalid connection
        }

        // Connection is valid - proceed with creation
        const sourceName = sourceNode?.data?.label || selectedSourceNode;
        const targetName = targetNode?.data?.label || node.id;
        const newEdge: Edge = {
          id: `edge_${selectedSourceNode}_${node.id}_${Date.now()}`,
          source: selectedSourceNode,
          target: node.id,
          type: 'custom',
          data: {
            label: `${sourceName} → ${targetName}`,
            bandwidth: '1000',
            bandwidthUnit: 'Mbps'
          }
        };
        const command = new AddEdgeCommand(newEdge, setEdges);
        executeCommand(command);
        setSelectedSourceNode(null);

        // Show success message with port info
        const sourcePortStatus = getPortStatus(sourceNode, edges);
        const targetPortStatus = getPortStatus(targetNode, edges);

        let message = 'เชื่อมต่อสำเร็จ';
        if (sourcePortStatus.total > 0 && targetPortStatus.total > 0) {
          // const sourceType = getDeviceType(sourceNode).toUpperCase();
          // const targetType = getDeviceType(targetNode).toUpperCase();
          // message += ` (${sourceType}: ${sourcePortStatus.used + 1}/${sourcePortStatus.total}, ${targetType}: ${targetPortStatus.used + 1}/${targetPortStatus.total})`;
        }

        toast.success(message);
      } else {
        toast.info('เลือก node นี้เป็นต้นทางอยู่แล้ว');
      }
    } else {
      // Normal mode - show properties (except for ISP nodes)
      if (node.type?.toLowerCase() === 'isp') {
        // ISP nodes don't open properties panel
        return;
      }
      
      setShowEdgeProperties(false); // ปิด EdgePropertiesPanel ก่อน
      const device: Device = {
        id: node.id,
        type: node.type || 'unknown',
        data: node.data as any,
        position: node.position
      };
      setSelectedNode(device);
      setShowProperties(true);
    }
  }, [isConnectionMode, selectedSourceNode, nodes, executeCommand, AddEdgeCommand, setEdges]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setShowProperties(false); // ปิด PropertiesPanel ก่อน
    setSelectedEdge(edge);
    setTempEdgeData({
      id: edge.id,
      label: edge.data?.label || '',
      bandwidth: edge.data?.bandwidth || '',
      bandwidthUnit: edge.data?.bandwidthUnit || 'Mbps'
    });
    setShowEdgeProperties(true);
  }, []);

  const onPaneClick = useCallback(() => {
    if (isConnectionMode) {
      // Cancel connection mode when clicking on pane
      setSelectedSourceNode(null);
      setIsConnectionMode(false);
      toast.info('ยกเลิกโหมดเชื่อมต่อ');
    } else {
      setSelectedNode(null);
      setShowProperties(false);
      setSelectedEdge(null);
      setShowEdgeProperties(false);
    }
  }, [isConnectionMode]);

  // handleUpdateNode: ใช้ Command Pattern
  const handleUpdateNode = useCallback((nodeId: string, updatedData: any) => {
    const nodeToUpdate = nodes.find(n => n.id === nodeId);
    if (nodeToUpdate) {
      const oldData = { ...nodeToUpdate.data };
      const command = new UpdateNodeCommand(nodeId, oldData, updatedData, setNodes);
      executeCommand(command);

      // Also update selectedNode if it's the same node
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode({
          ...selectedNode,
          data: { ...selectedNode.data, ...updatedData }
        });
      }

      toast.success('อัปเดตข้อมูลอุปกรณ์สำเร็จ');
    }
  }, [nodes, selectedNode, executeCommand, UpdateNodeCommand, setNodes]);

  // handleUpdateEdge: ใช้ Command Pattern
  const handleUpdateEdge = useCallback((edgeId: string, updatedEdge: Edge) => {
    const edgeToUpdate = edges.find(e => e.id === edgeId);
    if (edgeToUpdate) {
      const oldData = { ...edgeToUpdate.data };
      const newData = { ...updatedEdge.data };
      const command = new UpdateEdgeCommand(edgeId, oldData, newData, setEdges);
      executeCommand(command);
    }
  }, [edges, executeCommand, UpdateEdgeCommand, setEdges]);

  // handleSaveEdge: ใช้ Command Pattern ผ่าน handleUpdateEdge
  const handleSaveEdge = useCallback(() => {
    if (selectedEdge && tempEdgeData) {
      const updatedEdge = {
        ...selectedEdge,
        data: {
          ...tempEdgeData,
          // ใช้ค่าเริ่มต้น 1000 Mbps ถ้าไม่ได้กรอก bandwidth
          bandwidth: tempEdgeData.bandwidth || '1000',
          bandwidthUnit: tempEdgeData.bandwidthUnit || 'Mbps'
        }
      };
      handleUpdateEdge(selectedEdge.id, updatedEdge);
      setSelectedEdge(updatedEdge);
      // Also update tempEdgeData to match the saved data
      setTempEdgeData(tempEdgeData);
      // Close the edge properties panel
      setShowEdgeProperties(false);
      toast.success('บันทึกข้อมูลสายสำเร็จ');
    }
  }, [selectedEdge, tempEdgeData, handleUpdateEdge]);

  const handleCancelEdge = useCallback(() => {
    setTempEdgeData(null);
    setShowEdgeProperties(false);
    setSelectedEdge(null);
  }, []);

  // --- ปรับ clearDiagram ให้ reset undo/redo stack ---
  const clearDiagram = useCallback(() => {
    setNodes([]);
    setEdges([]);
    clearHistory(); // reset undo/redo
    // Clear properties panels
    setSelectedNode(null);
    setShowProperties(false);
    setSelectedEdge(null);
    setShowEdgeProperties(false);
    setTempEdgeData(null);
    // Reset connection mode
    setIsConnectionMode(false);
    setSelectedSourceNode(null);
    // ไม่ต้อง set projectName เพราะจะถูก sync จาก currentProject
    nodeId.current = 0;
    // reset counter ทุกประเภท
    nodeTypeCounters.current = {
      router: 1,
      switch: 1,
      firewall: 1,
      server: 1,
      pc: 1,
    };
    toast.success('ล้างแผนผังเรียบร้อยแล้ว');
  }, [setNodes, setEdges]);

  // --- ฟังก์ชันล้างข้อมูลอย่างถาวร (ไม่สามารถ undo ได้) ---
  const permanentClearDiagram = useCallback(async () => {
    // Clear UI immediately
    setNodes([]);
    setEdges([]);
    clearHistory(); // reset undo/redo stack

    // Clear properties panels
    setSelectedNode(null);
    setShowProperties(false);
    setSelectedEdge(null);
    setShowEdgeProperties(false);
    setTempEdgeData(null);

    // Reset connection mode
    setIsConnectionMode(false);
    setSelectedSourceNode(null);

    // Reset counters
    nodeId.current = 0;
    nodeTypeCounters.current = {
      router: 1,
      switch: 1,
      firewall: 1,
      server: 1,
      pc: 1,
    };

    // Clear from database if project exists
    if (currentProject && updateProject) {
      try {
        await updateProject(currentProject.id, {
          name: projectName,
          diagram_data: { nodes: [], edges: [] } // Save empty diagram to database
        });
        // Database cleared successfully
      } catch (error) {
        //consle.error('Failed to clear diagram from database:', error);
      }
    }

    // Clear from localStorage
    try {
      localStorage.removeItem('network_diagram_backup');
      // localStorage cleared successfully
    } catch (error) {
      //consle.error('Failed to clear localStorage:', error);
    }

    toast.success('ล้างแผนผังอย่างถาวรเรียบร้อยแล้ว');
  }, [setNodes, setEdges, clearHistory, currentProject, updateProject, projectName]);

  const saveDiagram = useCallback(() => {
    const diagram: NetworkDiagram = {
      nodes,
      edges,
      projectName,
      timestamp: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(diagram, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success('บันทึกแผนผังสำเร็จ');
  }, [nodes, edges, projectName]);

  // --- ปรับ loadDiagram ให้ reset undo/redo stack ---
  const loadDiagram = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const diagram: NetworkDiagram = JSON.parse(e.target?.result as string);
          setNodes(diagram.nodes || []);
          // Remove duplicate edge ids
          const uniqueEdges = [];
          const seen = new Set();
          for (const edge of (diagram.edges || [])) {
            if (!seen.has(edge.id)) {
              uniqueEdges.push(edge);
              seen.add(edge.id);
            }
          }
          setEdges(uniqueEdges);
          setProjectName(diagram.projectName || file.name.replace('.json', ''));
          clearHistory(); // reset undo/redo

          const maxId = Math.max(
            ...diagram.nodes.map((node: ReactFlowNode) => {
              const match = node.id.match(/node_(\d+)/);
              return match ? parseInt(match[1]) : 0;
            }),
            0
          );
          nodeId.current = maxId + 1;

          toast.success('โหลดแผนผังสำเร็จ');
        } catch {
          toast.error('ไม่สามารถโหลดไฟล์ได้');
        }
      };
      reader.readAsText(file);
    },
    [setNodes, setEdges]
  );

  // --- ปรับ loadDiagramFromData ให้ reset undo/redo stack ---
  const loadDiagramFromData = useCallback((diagramData: string) => {
    try {
      const diagram: NetworkDiagram = JSON.parse(diagramData);
      setNodes((diagram.nodes || []) as unknown as ReactFlowNode[]);
      // Remove duplicate edge ids
      const uniqueEdges = [];
      const seen = new Set();
      for (const edge of (diagram.edges || [])) {
        if (!seen.has(edge.id)) {
          uniqueEdges.push(edge);
          seen.add(edge.id);
        }
      }
      setEdges(uniqueEdges);
      clearHistory(); // reset undo/redo

      // Update node counters based on loaded nodes
      const loadedCounters: { [key: string]: number } = {
        router: 1,
        switch: 1,
        firewall: 1,
        server: 1,
        pc: 1,
      };

      (diagram.nodes || []).forEach((node: unknown) => {
        const reactFlowNode = node as ReactFlowNode;
        const type = reactFlowNode.type || 'unknown';
        const label = reactFlowNode.data?.label || '';
        if (typeof label === 'string') {
          const match = label.match(new RegExp(`${type.charAt(0).toUpperCase() + type.slice(1)} (\\d+)`, 'i'));
          if (match) {
            const num = parseInt(match[1]);
            loadedCounters[type] = Math.max(loadedCounters[type] || 1, num + 1);
          }
        }
      });

      nodeTypeCounters.current = loadedCounters;

      // Update node ID counter
      const maxId = Math.max(
        ...(diagram.nodes || []).map((node: unknown) => {
          const reactFlowNode = node as ReactFlowNode;
          const match = reactFlowNode.id.match(/node_(\d+)/);
          return match ? parseInt(match[1]) : 0;
        }),
        0
      );
      nodeId.current = maxId + 1;

    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลแผนผังได้');
    }
  }, [setNodes, setEdges]);

  const toggleConnectionMode = useCallback(() => {
    setIsConnectionMode(!isConnectionMode);
    setSelectedSourceNode(null);
    if (!isConnectionMode) {
      toast.info('เข้าสู่โหมดเชื่อมต่อ - คลิกที่ node ต้นทาง');
    } else {
      toast.info('ออกจากโหมดเชื่อมต่อ');
    }
  }, [isConnectionMode]);


  const recoverFromBackup = useCallback(() => {
    const backupData = localStorage.getItem('network_diagram_backup');
    if (backupData) {
      try {
        const backup = JSON.parse(backupData);
        setNodes((backup.nodes || []) as unknown as ReactFlowNode[]);
        setEdges(backup.edges || []);
        setProjectName(backup.projectName || 'โปรเจกต์ใหม่');
        clearHistory(); // reset undo/redo

        // Update counters
        const loadedCounters: { [key: string]: number } = {
          router: 1,
          switch: 1,
          firewall: 1,
          server: 1,
          pc: 1,
        };

        (backup.nodes || []).forEach((node: unknown) => {
          const reactFlowNode = node as ReactFlowNode;
          const type = reactFlowNode.type || 'unknown';
          const label = reactFlowNode.data?.label || '';
          if (typeof label === 'string') {
            const match = label.match(new RegExp(`${type.charAt(0).toUpperCase() + type.slice(1)} (\\d+)`, 'i'));
            if (match) {
              const num = parseInt(match[1]);
              loadedCounters[type] = Math.max(loadedCounters[type] || 1, num + 1);
            }
          }
        });

        nodeTypeCounters.current = loadedCounters;

        const maxId = Math.max(
          ...(backup.nodes || []).map((node: unknown) => {
            const reactFlowNode = node as ReactFlowNode;
            const match = reactFlowNode.id.match(/node_(\d+)/);
            return match ? parseInt(match[1]) : 0;
          }),
          0
        );
        nodeId.current = maxId + 1;

        toast.success('กู้คืนข้อมูลจาก backup สำเร็จ');
        return true;
      } catch (error) {
        //consle.error('Error recovering from backup:', error);
        toast.error('ไม่สามารถกู้คืนข้อมูลได้');
        return false;
      }
    }
    return false;
  }, [setNodes, setEdges, setProjectName]);

  // Load diagram data only when the current project ID changes
  const lastLoadedProjectIdRef = useRef<number | null>(null);
  useEffect(() => {
    const projectId = currentProject?.id ?? null;
    if (projectId === null) {
      return;
    }

    if (lastLoadedProjectIdRef.current !== projectId) {
      lastLoadedProjectIdRef.current = projectId;

      if (currentProject && currentProject.diagram_data) {
        const diagramDataStr = typeof currentProject.diagram_data === 'string'
          ? currentProject.diagram_data
          : JSON.stringify(currentProject.diagram_data);
        loadDiagramFromData(diagramDataStr);
      } else {
        setNodes([]);
        setEdges([]);
      }
    }
  }, [currentProject?.id, loadDiagramFromData, setNodes, setEdges]);

  // Auto-save before page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      // Check if there are unsaved changes
      if (nodes.length > 0 || edges.length > 0) {
        // Show browser's default "Leave Site?" dialog
        event.preventDefault();
        event.returnValue = '';

        // Auto-save in the background before user decides
        if (currentProject) {
          try {
            const diagramData = JSON.stringify({ nodes, edges });
            // Save to localStorage as backup
            localStorage.setItem('network_diagram_backup', JSON.stringify({
              nodes,
              edges,
              projectName,
              projectId: currentProject.id,
              timestamp: new Date().toISOString()
            }));

            // Try to save to backend if possible
            try {
              await updateProject(currentProject.id, {
                name: projectName,
                diagram_data: JSON.parse(diagramData) // Parse string to object for backend
              });
            } catch {
              //consle.error('Backend save failed, but localStorage backup saved');
            }
          } catch (error) {
            //consle.error('Auto-save before unload failed:', error);
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [nodes, edges, currentProject, projectName, updateProject]);

  // Copy/Paste functions
  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    const selectedEdges = edges.filter(edge => edge.selected);

    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      toast.info('กรุณาเลือกอุปกรณ์หรือสายที่ต้องการคัดลอก');
      return;
    }

    // Copy selected nodes and their connected edges
    const nodesToCopy = selectedNodes.map(node => ({ ...node }));

    // Get edges that connect ONLY between selected nodes (internal connections)
    const selectedNodeIds = new Set(selectedNodes.map(node => node.id));
    const edgesToCopy = edges.filter(edge =>
      selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    ).map(edge => ({ ...edge }));

    setCopiedNodes(nodesToCopy);
    setCopiedEdges(edgesToCopy);

    toast.success(`คัดลอก ${nodesToCopy.length} อุปกรณ์ และ ${edgesToCopy.length} การเชื่อมต่อ`);
  }, [nodes, edges]);

  const handlePaste = useCallback(() => {
    if (copiedNodes.length === 0) {
      toast.info('ไม่มีข้อมูลที่คัดลอกไว้');
      return;
    }

    // Create batch command for paste operation
    const commands: any[] = [];

    // Calculate offset for pasted nodes (move them slightly to the right and down)
    const offset = { x: 50, y: 50 };

    // Create new IDs for pasted nodes with meaningful names
    const nodeIdMap = new Map<string, string>();

    // Track nodes created in this paste operation to include in numbering calculation
    const nodesCreatedInThisPaste: ReactFlowNode[] = [];

    const newNodes = copiedNodes.map((node, _index) => {
      const nodeType = (node.data?.type as string) || 'unknown';

      // Get all existing numbers for this node type from current nodes AND nodes created in this paste operation
      // Use nodesRef.current to get the most up-to-date nodes state
      const allRelevantNodes = [...nodesRef.current, ...nodesCreatedInThisPaste];
      const existingNumbers = allRelevantNodes
        .filter(n => (n.data?.type as string) === nodeType)
        .map(n => {
          const match = (n.data?.label as string)?.match(new RegExp(`${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} (\\d+)`, 'i'));
          return match ? parseInt(match[1]) : 0;
        })
        .filter(num => !isNaN(num));

      // Processing node type for labeling

      // Get the highest existing number for this type (including nodes created in this paste)
      const maxExisting = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;

      // Calculate the next number: max existing + 1
      const labelNumber = maxExisting + 1;

      let deviceLabel = '';
      switch (nodeType) {
        case 'router':
          deviceLabel = `Router ${labelNumber}`;
          break;
        case 'switch':
          deviceLabel = `Switch ${labelNumber}`;
          break;
        case 'firewall':
          deviceLabel = `Firewall ${labelNumber}`;
          break;
        case 'server':
          deviceLabel = `Server ${labelNumber}`;
          break;
        case 'pc':
          deviceLabel = `PC ${labelNumber}`;
          break;
        default:
          deviceLabel = `${String(nodeType).charAt(0).toUpperCase() + String(nodeType).slice(1)} ${labelNumber}`;
      }

      // Create new ID based on type and counter with timestamp to ensure uniqueness
      const newNodeId = `${nodeType}_${labelNumber}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      nodeIdMap.set(node.id, newNodeId);

      const newNode = {
        ...node,
        id: newNodeId,
        data: {
          ...node.data,
          label: deviceLabel
        },
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y
        },
        selected: false
      };

      // Add this node to the tracking array so subsequent nodes in this paste operation can see it
      nodesCreatedInThisPaste.push(newNode);

      return newNode;
    });

    // Create new edges with updated source/target IDs
    const newEdges = copiedEdges.map((edge, index) => {
      const newSourceId = nodeIdMap.get(edge.source);
      const newTargetId = nodeIdMap.get(edge.target);

      if (newSourceId && newTargetId) {
        const newEdgeId = `edge_${newSourceId}_${newTargetId}_${Date.now()}_${index}`;


        return {
          ...edge,
          id: newEdgeId,
          source: newSourceId,
          target: newTargetId,
          selected: false
        };
      }
      return null;
    }).filter(Boolean) as Edge[];

    // Add commands for nodes
    newNodes.forEach(node => {
      commands.push(new AddNodeCommand(node, setNodes));
    });

    // Add commands for edges
    newEdges.forEach(edge => {
      commands.push(new AddEdgeCommand(edge, setEdges));
    });

    // Execute as batch command
    if (commands.length > 0) {
      const batchCommand = new BatchCommand(commands, `วาง ${newNodes.length} อุปกรณ์ และ ${newEdges.length} การเชื่อมต่อ`);
      executeCommand(batchCommand);

      // Select the newly pasted nodes for visual feedback
      setTimeout(() => {
        setNodes(currentNodes =>
          currentNodes.map(node => ({
            ...node,
            selected: newNodes.some(newNode => newNode.id === node.id)
          }))
        );
      }, 100);

      toast.success(`วาง ${newNodes.length} อุปกรณ์ และ ${newEdges.length} การเชื่อมต่อ`);
    } else {
      toast.info('ไม่มีข้อมูลที่สามารถวางได้');
    }
  }, [copiedNodes, copiedEdges, getId, executeCommand, AddNodeCommand, AddEdgeCommand, BatchCommand, setNodes, setEdges]);


  return {
    // State
    nodes,
    edges,
    selectedNode,
    showProperties,
    selectedEdge,
    showEdgeProperties,
    tempEdgeData,
    isConnectionMode,
    selectedSourceNode,
    projectName,

    // Handlers
    onNodesChange: optimizedOnNodesChange,
    onEdgesChange: optimizedOnEdgesChange,
    onConnect,
    onDragOver,
    onDrop,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    handleUpdateNode,
    handleUpdateEdge,
    handleSaveEdge,
    handleCancelEdge,
    clearDiagram,
    permanentClearDiagram,
    saveDiagram,
    loadDiagram,
    toggleConnectionMode,
    handleUndo,
    handleRedo,
    undoStack,
    redoStack,
    clearHistory,
    getHistoryInfo, // New: get detailed history information
    // Command Pattern exports
    executeCommand,
    DeleteNodeCommand,
    DeleteEdgeCommand,
    BatchCommand,
    // State setters for commands
    setNodes,
    setEdges,
    loadDiagramFromData,
    handleCopy,
    handlePaste,
    setShowProperties,
    setShowEdgeProperties,
    setTempEdgeData,
    setProjectName,
    recoverFromBackup,
    // Port status utilities
    getPortStatus,
  };
}; 