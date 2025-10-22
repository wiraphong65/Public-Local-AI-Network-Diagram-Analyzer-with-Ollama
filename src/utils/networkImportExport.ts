import type { Node, Edge } from '@xyflow/react';

// Network file format validation and transformation utilities
export interface NetworkFileFormat {
  version: string;
  metadata: {
    name: string;
    description?: string;
    created: string;
    modified: string;
    author?: string;
    tags?: string[];
  };
  network: {
    nodes: Node[];
    edges: Edge[];
  };
  settings?: {
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
    theme?: string;
    layout?: string;
  };
}

export interface ImportExportOptions {
  preserveIds?: boolean;
  validateStructure?: boolean;
  includeMetadata?: boolean;
  includeSettings?: boolean;
  mergeStrategy?: 'replace' | 'merge' | 'append';
}

export class NetworkImportExportHandler {
  private static readonly SUPPORTED_VERSIONS = ['1.0', '1.1', '1.2'];
  private static readonly CURRENT_VERSION = '1.2';

  // Export network to file format
  static exportNetwork(
    nodes: Node[],
    edges: Edge[],
    metadata: Partial<NetworkFileFormat['metadata']> = {},
    settings?: NetworkFileFormat['settings']
  ): NetworkFileFormat {
    const now = new Date().toISOString();
    
    return {
      version: this.CURRENT_VERSION,
      metadata: {
        name: metadata.name || 'Untitled Network',
        description: metadata.description || '',
        created: metadata.created || now,
        modified: now,
        author: metadata.author || 'Network Diagram Analyzer',
        tags: metadata.tags || []
      },
      network: {
        nodes: this.sanitizeNodes(nodes),
        edges: this.sanitizeEdges(edges)
      },
      settings: settings || {}
    };
  }

  // Import network from file format with validation
  static importNetwork(
    fileData: unknown,
    options: ImportExportOptions = {}
  ): {
    success: boolean;
    data?: {
      nodes: Node[];
      edges: Edge[];
      metadata: NetworkFileFormat['metadata'];
      settings?: NetworkFileFormat['settings'];
    };
    errors?: string[];
    warnings?: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Parse and validate file structure
      const networkData = this.validateFileStructure(fileData);
      if (!networkData) {
        errors.push('ไฟล์มีโครงสร้างที่ไม่ถูกต้อง');
        return { success: false, errors };
      }

      // Check version compatibility
      if (!this.SUPPORTED_VERSIONS.includes(networkData.version)) {
        warnings.push(`เวอร์ชันไฟล์ ${networkData.version} อาจไม่สมบูรณ์`);
      }

      // Validate and transform nodes
      const { nodes, nodeErrors } = this.validateNodes(
        networkData.network.nodes,
        options
      );
      errors.push(...nodeErrors);

      // Validate and transform edges
      const { edges, edgeErrors } = this.validateEdges(
        networkData.network.edges,
        nodes,
        options
      );
      errors.push(...edgeErrors);

      // Check for orphaned edges
      const orphanedEdges = edges.filter(edge => 
        !nodes.find(node => node.id === edge.source) ||
        !nodes.find(node => node.id === edge.target)
      );
      
      if (orphanedEdges.length > 0) {
        warnings.push(`พบการเชื่อมต่อที่ไม่มีโหนดปลายทาง: ${orphanedEdges.length} รายการ`);
      }

      // Remove orphaned edges
      const cleanEdges = edges.filter(edge => 
        nodes.find(node => node.id === edge.source) &&
        nodes.find(node => node.id === edge.target)
      );

      return {
        success: errors.length === 0,
        data: {
          nodes,
          edges: cleanEdges,
          metadata: networkData.metadata,
          settings: networkData.settings
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      errors.push(`เกิดข้อผิดพลาดในการนำเข้าไฟล์: ${error}`);
      return { success: false, errors };
    }
  }

  // Validate file structure
  private static validateFileStructure(data: unknown): NetworkFileFormat | null {
    if (!data || typeof data !== 'object') return null;

    const obj = data as any;
    
    // Required fields
    if (!obj.version || !obj.metadata || !obj.network) return null;
    if (!obj.network.nodes || !obj.network.edges) return null;
    if (!Array.isArray(obj.network.nodes) || !Array.isArray(obj.network.edges)) return null;

    return obj as NetworkFileFormat;
  }

  // Validate and sanitize nodes
  private static validateNodes(
    nodes: any[],
    options: ImportExportOptions
  ): { nodes: Node[]; nodeErrors: string[] } {
    const validNodes: Node[] = [];
    const errors: string[] = [];
    const usedIds = new Set<string>();

    for (const [index, node] of nodes.entries()) {
      try {
        // Required fields
        if (!node.id || !node.type) {
          errors.push(`โหนดที่ ${index + 1}: ขาดข้อมูลจำเป็น (id, type)`);
          continue;
        }

        // Handle ID conflicts
        let nodeId = node.id;
        if (!options.preserveIds && usedIds.has(nodeId)) {
          nodeId = this.generateUniqueId(nodeId, usedIds);
        }
        usedIds.add(nodeId);

        // Position validation
        const position = node.position || { x: 0, y: 0 };
        if (typeof position.x !== 'number' || typeof position.y !== 'number') {
          errors.push(`โหนด ${nodeId}: ตำแหน่งไม่ถูกต้อง`);
          continue;
        }

        // Create valid node
        const validNode: Node = {
          id: nodeId,
          type: node.type,
          position,
          data: node.data || {},
          style: node.style || {},
          className: node.className || '',
          targetPosition: node.targetPosition,
          sourcePosition: node.sourcePosition,
          hidden: node.hidden || false,
          selected: false, // Reset selection state
          dragging: false, // Reset dragging state
          connectable: node.connectable !== false,
          selectable: node.selectable !== false,
          deletable: node.deletable !== false
        };

        validNodes.push(validNode);
      } catch (error) {
        errors.push(`โหนดที่ ${index + 1}: ${error}`);
      }
    }

    return { nodes: validNodes, nodeErrors: errors };
  }

  // Validate and sanitize edges
  private static validateEdges(
    edges: any[],
    nodes: Node[],
    options: ImportExportOptions
  ): { edges: Edge[]; edgeErrors: string[] } {
    const validEdges: Edge[] = [];
    const errors: string[] = [];
    const usedIds = new Set<string>();
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const [index, edge] of edges.entries()) {
      try {
        // Required fields
        if (!edge.id || !edge.source || !edge.target) {
          errors.push(`การเชื่อมต่อที่ ${index + 1}: ขาดข้อมูลจำเป็น (id, source, target)`);
          continue;
        }

        // Check if source and target nodes exist
        if (!nodeIds.has(edge.source)) {
          errors.push(`การเชื่อมต่อ ${edge.id}: ไม่พบโหนดต้นทาง ${edge.source}`);
          continue;
        }
        if (!nodeIds.has(edge.target)) {
          errors.push(`การเชื่อมต่อ ${edge.id}: ไม่พบโหนดปลายทาง ${edge.target}`);
          continue;
        }

        // Handle ID conflicts
        let edgeId = edge.id;
        if (!options.preserveIds && usedIds.has(edgeId)) {
          edgeId = this.generateUniqueId(edgeId, usedIds);
        }
        usedIds.add(edgeId);

        // Create valid edge
        const validEdge: Edge = {
          id: edgeId,
          source: edge.source,
          target: edge.target,
          type: edge.type || 'default',
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          data: edge.data || {},
          style: edge.style || {},
          className: edge.className || '',
          animated: edge.animated || false,
          hidden: edge.hidden || false,
          selected: false, // Reset selection state
          deletable: edge.deletable !== false,
          selectable: edge.selectable !== false
        };

        validEdges.push(validEdge);
      } catch (error) {
        errors.push(`การเชื่อมต่อที่ ${index + 1}: ${error}`);
      }
    }

    return { edges: validEdges, edgeErrors: errors };
  }

  // Generate unique ID when conflicts occur
  private static generateUniqueId(baseId: string, usedIds: Set<string>): string {
    let counter = 1;
    let newId = `${baseId}_${counter}`;
    
    while (usedIds.has(newId)) {
      counter++;
      newId = `${baseId}_${counter}`;
    }
    
    return newId;
  }

  // Sanitize nodes for export
  private static sanitizeNodes(nodes: Node[]): Node[] {
    return nodes.map(node => ({
      ...node,
      selected: false,
      dragging: false,
      // Remove any temporary or internal properties
      measured: undefined as any,
    }));
  }

  // Sanitize edges for export
  private static sanitizeEdges(edges: Edge[]): Edge[] {
    return edges.map(edge => ({
      ...edge,
      selected: false,
      // Remove any temporary or internal properties
    }));
  }

  // Create backup of current state
  static createBackup(
    nodes: Node[],
    edges: Edge[],
    metadata?: Partial<NetworkFileFormat['metadata']>
  ): NetworkFileFormat {
    return this.exportNetwork(nodes, edges, {
      ...metadata,
      name: `${metadata?.name || 'Network'} - Backup`,
      tags: [...(metadata?.tags || []), 'backup']
    });
  }

  // Merge networks based on strategy
  static mergeNetworks(
    currentNodes: Node[],
    currentEdges: Edge[],
    importedNodes: Node[],
    importedEdges: Edge[],
    strategy: 'replace' | 'merge' | 'append' = 'replace'
  ): { nodes: Node[]; edges: Edge[] } {
    switch (strategy) {
      case 'replace':
        return { nodes: importedNodes, edges: importedEdges };
        
      case 'append':
        const nodeIdOffset = Math.max(...currentNodes.map(n => parseInt(n.id) || 0), 0) + 1;
        const edgeIdOffset = Math.max(...currentEdges.map(e => parseInt(e.id) || 0), 0) + 1;
        
        const offsetNodes = importedNodes.map((node, index) => ({
          ...node,
          id: `${nodeIdOffset + index}`,
          position: {
            x: node.position.x + 100, // Offset to avoid overlap
            y: node.position.y + 100
          }
        }));
        
        const offsetEdges = importedEdges.map((edge, index) => ({
          ...edge,
          id: `${edgeIdOffset + index}`,
          // Update source/target references if they were offset
          source: offsetNodes.find(n => n.id === edge.source)?.id || edge.source,
          target: offsetNodes.find(n => n.id === edge.target)?.id || edge.target
        }));
        
        return {
          nodes: [...currentNodes, ...offsetNodes],
          edges: [...currentEdges, ...offsetEdges]
        };
        
      case 'merge':
        const existingNodeIds = new Set(currentNodes.map(n => n.id));
        const existingEdgeIds = new Set(currentEdges.map(e => e.id));
        
        const newNodes = importedNodes.filter(node => !existingNodeIds.has(node.id));
        const newEdges = importedEdges.filter(edge => !existingEdgeIds.has(edge.id));
        
        return {
          nodes: [...currentNodes, ...newNodes],
          edges: [...currentEdges, ...newEdges]
        };
        
      default:
        return { nodes: importedNodes, edges: importedEdges };
    }
  }
}

export default NetworkImportExportHandler;