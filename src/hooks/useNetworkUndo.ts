import { useCallback, useState, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';

// Command Interface สำหรับ Network Diagram
export interface NetworkCommand {
  execute(): void;
  undo(): void;
  merge?(other: NetworkCommand): NetworkCommand | null;
  getDescription(): string;
  getType(): string;
}

// Add Node Command
export class AddNodeCommand implements NetworkCommand {
  constructor(
    private node: Node,
    private setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  ) {}

  execute() {
    this.setNodes(nodes => [...nodes, this.node]);
  }

  undo() {
    this.setNodes(nodes => nodes.filter(n => n.id !== this.node.id));
  }

  getDescription() {
    return `เพิ่ม ${this.node.type} (${this.node.data?.label || this.node.id})`;
  }

  getType() {
    return 'ADD_NODE';
  }
}

// Delete Node Command (with connected edges)
export class DeleteNodeCommand implements NetworkCommand {
  private deletedEdges: Edge[] = [];

  constructor(
    private nodeId: string,
    private deletedNode: Node,
    private setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    private setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  ) {}

  execute() {
    // Store connected edges before deletion
    this.setEdges(edges => {
      this.deletedEdges = edges.filter(e => 
        e.source === this.nodeId || e.target === this.nodeId
      );
      return edges.filter(e => 
        e.source !== this.nodeId && e.target !== this.nodeId
      );
    });
    
    // Remove the node
    this.setNodes(nodes => nodes.filter(n => n.id !== this.nodeId));
  }

  undo() {
    // Restore the node
    this.setNodes(nodes => [...nodes, this.deletedNode]);
    
    // Restore connected edges
    this.setEdges(edges => [...edges, ...this.deletedEdges]);
  }

  getDescription() {
    return `ลบ ${this.deletedNode.type} (${this.deletedNode.data?.label || this.nodeId})`;
  }

  getType() {
    return 'DELETE_NODE';
  }
}

// Move Node Command (with merging support)
export class MoveNodeCommand implements NetworkCommand {
  constructor(
    private nodeId: string,
    private oldPosition: { x: number; y: number },
    private newPosition: { x: number; y: number },
    private setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    private timestamp: number = Date.now()
  ) {}

  execute() {
    this.setNodes(nodes => 
      nodes.map(node => 
        node.id === this.nodeId 
          ? { ...node, position: this.newPosition }
          : node
      )
    );
  }

  undo() {
    this.setNodes(nodes => 
      nodes.map(node => 
        node.id === this.nodeId 
          ? { ...node, position: this.oldPosition }
          : node
      )
    );
  }

  merge(other: NetworkCommand): NetworkCommand | null {
    if (other instanceof MoveNodeCommand && 
        other.nodeId === this.nodeId &&
        other.timestamp - this.timestamp < 1000) { // Merge within 1 second
      return new MoveNodeCommand(
        this.nodeId,
        this.oldPosition,
        other.newPosition,
        this.setNodes,
        this.timestamp
      );
    }
    return null;
  }

  getDescription() {
    return `ย้าย node`;
  }

  getType() {
    return 'MOVE_NODE';
  }
}

// Update Node Properties Command
export class UpdateNodeCommand implements NetworkCommand {
  constructor(
    private nodeId: string,
    private oldData: any,
    private newData: any,
    private setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  ) {}

  execute() {
    this.setNodes(nodes => 
      nodes.map(node => 
        node.id === this.nodeId 
          ? { ...node, data: { ...node.data, ...this.newData } }
          : node
      )
    );
  }

  undo() {
    this.setNodes(nodes => 
      nodes.map(node => 
        node.id === this.nodeId 
          ? { ...node, data: { ...node.data, ...this.oldData } }
          : node
      )
    );
  }

  getDescription() {
    const keys = Object.keys(this.newData);
    return `แก้ไขคุณสมบัติ ${keys.join(', ')}`;
  }

  merge(other: NetworkCommand): NetworkCommand | null {
    if (other instanceof UpdateNodeCommand && 
        other.nodeId === this.nodeId) {
      // Merge consecutive updates to the same node
      return new UpdateNodeCommand(
        this.nodeId,
        this.oldData,
        other.newData,
        this.setNodes
      );
    }
    return null;
  }

  getType() {
    return 'UPDATE_NODE';
  }
}

// Add Edge Command
export class AddEdgeCommand implements NetworkCommand {
  constructor(
    private edge: Edge,
    private setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  ) {}

  execute() {
    this.setEdges(edges => [...edges, this.edge]);
  }

  undo() {
    this.setEdges(edges => edges.filter(e => e.id !== this.edge.id));
  }

  getDescription() {
    return `เพิ่มการเชื่อมต่อ`;
  }

  getType() {
    return 'ADD_EDGE';
  }
}

// Delete Edge Command
export class DeleteEdgeCommand implements NetworkCommand {
  constructor(
    private edgeId: string,
    private deletedEdge: Edge,
    private setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  ) {}

  execute() {
    this.setEdges(edges => edges.filter(e => e.id !== this.edgeId));
  }

  undo() {
    this.setEdges(edges => [...edges, this.deletedEdge]);
  }

  getDescription() {
    return `ลบการเชื่อมต่อ`;
  }

  getType() {
    return 'DELETE_EDGE';
  }
}

// Update Edge Command
export class UpdateEdgeCommand implements NetworkCommand {
  constructor(
    private edgeId: string,
    private oldData: any,
    private newData: any,
    private setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  ) {}

  execute() {
    this.setEdges(edges => 
      edges.map(edge => 
        edge.id === this.edgeId 
          ? { ...edge, data: { ...edge.data, ...this.newData } }
          : edge
      )
    );
  }

  undo() {
    this.setEdges(edges => 
      edges.map(edge => 
        edge.id === this.edgeId 
          ? { ...edge, data: { ...edge.data, ...this.oldData } }
          : edge
      )
    );
  }

  getDescription() {
    return `แก้ไขการเชื่อมต่อ`;
  }

  getType() {
    return 'UPDATE_EDGE';
  }
}

// Batch Command (for multiple operations)
export class BatchCommand implements NetworkCommand {
  constructor(
    private commands: NetworkCommand[],
    private description: string
  ) {}

  execute() {
    this.commands.forEach(cmd => cmd.execute());
  }

  undo() {
    // Undo in reverse order
    [...this.commands].reverse().forEach(cmd => cmd.undo());
  }

  getDescription() {
    return this.description;
  }

  getType() {
    return 'BATCH';
  }
}

// Bulk Delete Command (for multiple nodes/edges)
export class BulkDeleteCommand implements NetworkCommand {
  private deletedNodes: Node[] = [];
  private deletedEdges: Edge[] = [];
  private allDeletedEdges: Edge[] = [];

  constructor(
    private nodeIds: string[],
    private edgeIds: string[],
    private setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    private setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  ) {}

  execute() {
    // Store nodes before deletion
    this.setNodes(nodes => {
      this.deletedNodes = nodes.filter(n => this.nodeIds.includes(n.id));
      return nodes.filter(n => !this.nodeIds.includes(n.id));
    });

    // Store and delete edges
    this.setEdges(edges => {
      // Store specifically selected edges
      this.deletedEdges = edges.filter(e => this.edgeIds.includes(e.id));
      
      // Store edges connected to deleted nodes
      const connectedEdges = edges.filter(e => 
        this.nodeIds.includes(e.source) || this.nodeIds.includes(e.target)
      );
      
      this.allDeletedEdges = [...this.deletedEdges, ...connectedEdges];
      
      // Remove all affected edges
      return edges.filter(e => 
        !this.edgeIds.includes(e.id) && 
        !this.nodeIds.includes(e.source) && 
        !this.nodeIds.includes(e.target)
      );
    });
  }

  undo() {
    // Restore nodes
    this.setNodes(nodes => [...nodes, ...this.deletedNodes]);
    
    // Restore all edges
    this.setEdges(edges => [...edges, ...this.allDeletedEdges]);
  }

  getDescription() {
    const nodeCount = this.nodeIds.length;
    const edgeCount = this.edgeIds.length;
    
    if (nodeCount > 0 && edgeCount > 0) {
      return `ลบ ${nodeCount} อุปกรณ์ และ ${edgeCount} การเชื่อมต่อ`;
    } else if (nodeCount > 0) {
      return `ลบ ${nodeCount} อุปกรณ์`;
    } else {
      return `ลบ ${edgeCount} การเชื่อมต่อ`;
    }
  }

  getType() {
    return 'BULK_DELETE';
  }
}

// Bulk Move Command (for multiple nodes)
export class BulkMoveCommand implements NetworkCommand {
  constructor(
    private moves: Array<{
      nodeId: string;
      oldPosition: { x: number; y: number };
      newPosition: { x: number; y: number };
    }>,
    private setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    private timestamp: number = Date.now()
  ) {}

  execute() {
    this.setNodes(nodes => 
      nodes.map(node => {
        const move = this.moves.find(m => m.nodeId === node.id);
        return move ? { ...node, position: move.newPosition } : node;
      })
    );
  }

  undo() {
    this.setNodes(nodes => 
      nodes.map(node => {
        const move = this.moves.find(m => m.nodeId === node.id);
        return move ? { ...node, position: move.oldPosition } : node;
      })
    );
  }

  merge(other: NetworkCommand): NetworkCommand | null {
    if (other instanceof BulkMoveCommand && 
        other.timestamp - this.timestamp < 1000) {
      // Check if moving same nodes
      const thisNodeIds = new Set(this.moves.map(m => m.nodeId));
      const otherNodeIds = new Set(other.moves.map(m => m.nodeId));
      
      if (thisNodeIds.size === otherNodeIds.size && 
          [...thisNodeIds].every(id => otherNodeIds.has(id))) {
        
        // Merge the moves
        const mergedMoves = this.moves.map(thisMove => {
          const otherMove = other.moves.find(m => m.nodeId === thisMove.nodeId);
          return otherMove ? {
            ...thisMove,
            newPosition: otherMove.newPosition
          } : thisMove;
        });
        
        return new BulkMoveCommand(mergedMoves, this.setNodes, this.timestamp);
      }
    }
    return null;
  }

  getDescription() {
    return `ย้าย ${this.moves.length} อุปกรณ์`;
  }

  getType() {
    return 'BULK_MOVE';
  }
}

// Bulk Update Command (for multiple nodes/edges)
export class BulkUpdateCommand implements NetworkCommand {
  constructor(
    private nodeUpdates: Array<{
      nodeId: string;
      oldData: any;
      newData: any;
    }>,
    private edgeUpdates: Array<{
      edgeId: string;
      oldData: any;
      newData: any;
    }>,
    private setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    private setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  ) {}

  execute() {
    if (this.nodeUpdates.length > 0) {
      this.setNodes(nodes => 
        nodes.map(node => {
          const update = this.nodeUpdates.find(u => u.nodeId === node.id);
          return update ? 
            { ...node, data: { ...node.data, ...update.newData } } : 
            node;
        })
      );
    }

    if (this.edgeUpdates.length > 0) {
      this.setEdges(edges => 
        edges.map(edge => {
          const update = this.edgeUpdates.find(u => u.edgeId === edge.id);
          return update ? 
            { ...edge, data: { ...edge.data, ...update.newData } } : 
            edge;
        })
      );
    }
  }

  undo() {
    if (this.nodeUpdates.length > 0) {
      this.setNodes(nodes => 
        nodes.map(node => {
          const update = this.nodeUpdates.find(u => u.nodeId === node.id);
          return update ? 
            { ...node, data: { ...node.data, ...update.oldData } } : 
            node;
        })
      );
    }

    if (this.edgeUpdates.length > 0) {
      this.setEdges(edges => 
        edges.map(edge => {
          const update = this.edgeUpdates.find(u => u.edgeId === edge.id);
          return update ? 
            { ...edge, data: { ...edge.data, ...update.oldData } } : 
            edge;
        })
      );
    }
  }

  getDescription() {
    const nodeCount = this.nodeUpdates.length;
    const edgeCount = this.edgeUpdates.length;
    
    if (nodeCount > 0 && edgeCount > 0) {
      return `แก้ไข ${nodeCount} อุปกรณ์ และ ${edgeCount} การเชื่อมต่อ`;
    } else if (nodeCount > 0) {
      return `แก้ไข ${nodeCount} อุปกรณ์`;
    } else {
      return `แก้ไข ${edgeCount} การเชื่อมต่อ`;
    }
  }

  getType() {
    return 'BULK_UPDATE';
  }
}

// Project State Command (for save/load operations)
export class ProjectStateCommand implements NetworkCommand {
  constructor(
    private previousState: {
      nodes: Node[];
      edges: Edge[];
      projectName?: string;
    },
    private newState: {
      nodes: Node[];
      edges: Edge[];
      projectName?: string;
    },
    private setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    private setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
    private onProjectNameChange?: (name: string) => void,
    private description: string = 'โหลดโปรเจกต์'
  ) {}

  execute() {
    this.setNodes(this.newState.nodes);
    this.setEdges(this.newState.edges);
    if (this.newState.projectName && this.onProjectNameChange) {
      this.onProjectNameChange(this.newState.projectName);
    }
  }

  undo() {
    this.setNodes(this.previousState.nodes);
    this.setEdges(this.previousState.edges);
    if (this.previousState.projectName && this.onProjectNameChange) {
      this.onProjectNameChange(this.previousState.projectName);
    }
  }

  getDescription() {
    return this.description;
  }

  getType() {
    return 'PROJECT_STATE';
  }
}

// Import File Command
export class ImportFileCommand implements NetworkCommand {
  constructor(
    private previousState: {
      nodes: Node[];
      edges: Edge[];
    },
    private importedState: {
      nodes: Node[];
      edges: Edge[];
    },
    private setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    private setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
    private fileName: string
  ) {}

  execute() {
    this.setNodes(this.importedState.nodes);
    this.setEdges(this.importedState.edges);
  }

  undo() {
    this.setNodes(this.previousState.nodes);
    this.setEdges(this.previousState.edges);
  }

  getDescription() {
    return `นำเข้าไฟล์ ${this.fileName}`;
  }

  getType() {
    return 'IMPORT_FILE';
  }
}

// Clear All Command
export class ClearAllCommand implements NetworkCommand {
  constructor(
    private previousState: {
      nodes: Node[];
      edges: Edge[];
    },
    private setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    private setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  ) {}

  execute() {
    this.setNodes([]);
    this.setEdges([]);
  }

  undo() {
    this.setNodes(this.previousState.nodes);
    this.setEdges(this.previousState.edges);
  }

  getDescription() {
    return `ล้างโครงข่ายทั้งหมด (${this.previousState.nodes.length} อุปกรณ์)`;
  }

  getType() {
    return 'CLEAR_ALL';
  }
}

// Smart Merge Command - Intelligently merges rapid consecutive actions
export class SmartMergeCommand implements NetworkCommand {
  private commands: NetworkCommand[];
  private mergeTimeWindow: number;
  private lastExecutionTime: number;

  constructor(
    initialCommand: NetworkCommand,
    mergeTimeWindow: number = 500 // 500ms window for merging
  ) {
    this.commands = [initialCommand];
    this.mergeTimeWindow = mergeTimeWindow;
    this.lastExecutionTime = Date.now();
  }

  // Try to merge with another command
  merge(other: NetworkCommand): NetworkCommand | null {
    const now = Date.now();
    const timeSinceLastExecution = now - this.lastExecutionTime;

    // Check if within time window and compatible for merging
    if (timeSinceLastExecution <= this.mergeTimeWindow && this.canMergeWith(other)) {
      // Create new smart merge command with combined commands
      const newMerge = new SmartMergeCommand(this.commands[0], this.mergeTimeWindow);
      newMerge.commands = [...this.commands, other];
      newMerge.lastExecutionTime = now;
      return newMerge;
    }
    
    return null;
  }

  private canMergeWith(other: NetworkCommand): boolean {
    const thisType = this.getType();
    const otherType = other.getType();
    
    // Define mergeable command type combinations
    const mergeableTypes = [
      ['MOVE_NODE', 'MOVE_NODE'],
      ['UPDATE_NODE', 'UPDATE_NODE'],
      ['UPDATE_EDGE', 'UPDATE_EDGE'],
      ['BULK_MOVE', 'BULK_MOVE'],
      ['BULK_UPDATE', 'BULK_UPDATE'],
      // Cross-type merging
      ['MOVE_NODE', 'UPDATE_NODE'],
      ['UPDATE_NODE', 'MOVE_NODE']
    ];
    
    return mergeableTypes.some(([type1, type2]) => 
      (thisType === type1 && otherType === type2) ||
      (thisType === type2 && otherType === type1)
    );
  }

  execute() {
    // Execute all commands in sequence
    this.commands.forEach(cmd => cmd.execute());
  }

  undo() {
    // Undo all commands in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  getDescription() {
    if (this.commands.length === 1) {
      return this.commands[0].getDescription();
    }
    
    // Group by command type for better description
    const typeGroups = this.commands.reduce((groups, cmd) => {
      const type = cmd.getType();
      groups[type] = (groups[type] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
    
    const descriptions = Object.entries(typeGroups).map(([type, count]) => {
      const typeMap: Record<string, string> = {
        'MOVE_NODE': 'ย้ายโหนด',
        'UPDATE_NODE': 'อัปเดตโหนด',
        'UPDATE_EDGE': 'อัปเดตการเชื่อมต่อ',
        'BULK_MOVE': 'ย้ายหลายโหนด',
        'BULK_UPDATE': 'อัปเดตหลายรายการ'
      };
      
      return `${typeMap[type] || type} (${count})`;
    });
    
    return `การดำเนินการรวม: ${descriptions.join(', ')}`;
  }

  getType() {
    // Return the most common type or 'SMART_MERGE' if mixed
    const types = this.commands.map(cmd => cmd.getType());
    const uniqueTypes = [...new Set(types)];
    
    if (uniqueTypes.length === 1) {
      return uniqueTypes[0];
    }
    
    return 'SMART_MERGE';
  }

  getCommandCount(): number {
    return this.commands.length;
  }

  getTimeWindow(): number {
    return this.mergeTimeWindow;
  }
}

// Enhanced Batch Command with smart merging
export class EnhancedBatchCommand implements NetworkCommand {
  private commands: NetworkCommand[];
  private maxBatchSize: number;
  
  constructor(
    commands: NetworkCommand[], 
    maxBatchSize: number = 10,
    private description?: string
  ) {
    // Limit batch size to prevent performance issues
    this.commands = commands.slice(0, maxBatchSize);
    this.maxBatchSize = maxBatchSize;
  }

  execute() {
    this.commands.forEach(cmd => cmd.execute());
  }

  undo() {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  merge(other: NetworkCommand): NetworkCommand | null {
    // Can merge with another batch command or individual commands
    if (other instanceof EnhancedBatchCommand) {
      const combinedCommands = [...this.commands, ...other.commands];
      if (combinedCommands.length <= this.maxBatchSize) {
        return new EnhancedBatchCommand(
          combinedCommands, 
          this.maxBatchSize,
          `${this.getDescription()} + ${other.getDescription()}`
        );
      }
    } else if (this.commands.length < this.maxBatchSize) {
      return new EnhancedBatchCommand(
        [...this.commands, other],
        this.maxBatchSize
      );
    }
    
    return null;
  }

  getDescription() {
    if (this.description) {
      return this.description;
    }
    
    if (this.commands.length === 1) {
      return this.commands[0].getDescription();
    }
    
    return `การดำเนินการแบบกลุ่ม (${this.commands.length} รายการ)`;
  }

  getType() {
    return 'ENHANCED_BATCH';
  }

  getCommands(): NetworkCommand[] {
    return [...this.commands];
  }
}

// Enhanced Import Command with merge strategy support
export class EnhancedImportCommand implements NetworkCommand {
  constructor(
    private previousState: {
      nodes: any[];
      edges: any[];
    },
    private importedState: {
      nodes: any[];
      edges: any[];
    },
    private setNodes: React.Dispatch<React.SetStateAction<any[]>>,
    private setEdges: React.Dispatch<React.SetStateAction<any[]>>,
    private fileName: string,
    private mergeStrategy: 'replace' | 'merge' | 'append' = 'replace'
  ) {}

  execute() {
    // Apply merge strategy
    const { nodes, edges } = this.applyMergeStrategy();
    this.setNodes(nodes);
    this.setEdges(edges);
  }

  undo() {
    // Restore previous state
    this.setNodes(this.previousState.nodes);
    this.setEdges(this.previousState.edges);
  }

  private applyMergeStrategy(): { nodes: any[]; edges: any[] } {
    switch (this.mergeStrategy) {
      case 'replace':
        return {
          nodes: this.importedState.nodes,
          edges: this.importedState.edges
        };
        
      case 'append':
        return {
          nodes: [...this.previousState.nodes, ...this.importedState.nodes],
          edges: [...this.previousState.edges, ...this.importedState.edges]
        };
        
      case 'merge':
        const existingNodeIds = new Set(this.previousState.nodes.map((n: any) => n.id));
        const existingEdgeIds = new Set(this.previousState.edges.map((e: any) => e.id));
        
        const newNodes = this.importedState.nodes.filter((node: any) => !existingNodeIds.has(node.id));
        const newEdges = this.importedState.edges.filter((edge: any) => !existingEdgeIds.has(edge.id));
        
        return {
          nodes: [...this.previousState.nodes, ...newNodes],
          edges: [...this.previousState.edges, ...newEdges]
        };
        
      default:
        return this.importedState;
    }
  }

  getDescription() {
    const strategyText = {
      'replace': 'แทนที่',
      'merge': 'รวม',
      'append': 'เพิ่มต่อท้าย'
    }[this.mergeStrategy];
    
    return `นำเข้าไฟล์ ${this.fileName} (${strategyText}: ${this.importedState.nodes.length} โหนด, ${this.importedState.edges.length} การเชื่อมต่อ)`;
  }

  getType() {
    return 'ENHANCED_IMPORT';
  }
}

export const useNetworkUndo = () => {
  const [undoStack, setUndoStack] = useState<NetworkCommand[]>([]);
  const [redoStack, setRedoStack] = useState<NetworkCommand[]>([]);
  const MAX_HISTORY_SIZE = 50;
  const isExecutingRef = useRef(false);

  const executeCommand = useCallback((command: NetworkCommand) => {
    if (isExecutingRef.current) {
      // Command blocked - already executing
      return;
    }
    
    isExecutingRef.current = true;
    
    setUndoStack(stack => {
      const lastCommand = stack[stack.length - 1];
      
      // Enhanced merging logic
      if (lastCommand && lastCommand.merge) {
        // Try standard merge first
        let merged = lastCommand.merge(command);
        
        // If standard merge fails, try smart merge
        if (!merged && !(lastCommand instanceof SmartMergeCommand)) {
          const smartMerge = new SmartMergeCommand(lastCommand);
          merged = smartMerge.merge(command);
        }
        
        // If smart merge succeeds, use it
        if (merged) {
          try {
            merged.execute();
          } catch (error) {
            //consle.error('Merged command execution failed:', error);
            isExecutingRef.current = false;
            return stack;
          }
          const newStack = [...stack.slice(0, -1), merged];
          isExecutingRef.current = false;
          return newStack.length > MAX_HISTORY_SIZE ? newStack.slice(1) : newStack;
        }
      }
      
      // Execute new command if merging failed or not applicable
      try {
        command.execute();
      } catch (error) {
        //consle.error('Command execution failed:', error);
        isExecutingRef.current = false;
        return stack;
      }
      
      const newStack = [...stack, command];
      isExecutingRef.current = false;
      return newStack.length > MAX_HISTORY_SIZE ? newStack.slice(1) : newStack;
    });
    
    // Clear redo stack when new command is executed
    setRedoStack([]);
    
    requestAnimationFrame(() => {
      isExecutingRef.current = false;
    });
  }, [MAX_HISTORY_SIZE]);

  const undo = useCallback(() => {
    if (undoStack.length === 0 || isExecutingRef.current) {
      // Undo blocked - no history or executing
      return;
    }
    
    isExecutingRef.current = true;
    
    const lastCommand = undoStack[undoStack.length - 1];
    try {
      lastCommand.undo();
    } catch (error) {
      //consle.error('Undo failed:', error);
      isExecutingRef.current = false;
      return;
    }
    
    setUndoStack(stack => stack.slice(0, -1));
    setRedoStack(stack => [...stack, lastCommand]);
    
    requestAnimationFrame(() => {
      isExecutingRef.current = false;
    });
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0 || isExecutingRef.current) {
      // Redo blocked - no history or executing
      return;
    }
    
    isExecutingRef.current = true;
    
    const lastCommand = redoStack[redoStack.length - 1];
    try {
      lastCommand.execute();
    } catch (error) {
      //consle.error('Redo failed:', error);
      isExecutingRef.current = false;
      return;
    }
    
    setRedoStack(stack => stack.slice(0, -1));
    setUndoStack(stack => {
      const newStack = [...stack, lastCommand];
      return newStack.length > MAX_HISTORY_SIZE ? newStack.slice(1) : newStack;
    });
    
    requestAnimationFrame(() => {
      isExecutingRef.current = false;
    });
  }, [redoStack, MAX_HISTORY_SIZE]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const undoToPoint = useCallback((index: number) => {
    if (index < 0 || index >= undoStack.length || isExecutingRef.current) {
      return;
    }
    
    isExecutingRef.current = true;
    
    try {
      // Undo commands from the end to the specified index
      for (let i = undoStack.length - 1; i > index; i--) {
        undoStack[i].undo();
      }
      
      const commandsToRedo = undoStack.slice(index + 1);
      setUndoStack(stack => stack.slice(0, index + 1));
      setRedoStack(stack => [...commandsToRedo.reverse(), ...stack]);
    } catch (error) {
      //consle.error('Undo to point failed:', error);
    }
    
    requestAnimationFrame(() => {
      isExecutingRef.current = false;
    });
  }, [undoStack]);

  // Simplified wrapper functions for easier usage
  const addNode = useCallback((node: Node, setNodes: React.Dispatch<React.SetStateAction<Node[]>>) => {
    const command = new AddNodeCommand(node, setNodes);
    executeCommand(command);
  }, [executeCommand]);

  const updateNode = useCallback((nodeId: string, oldData: any, newData: any, setNodes: React.Dispatch<React.SetStateAction<Node[]>>) => {
    const command = new UpdateNodeCommand(nodeId, oldData, newData, setNodes);
    executeCommand(command);
  }, [executeCommand]);

  const deleteNode = useCallback((nodeId: string, nodeToDelete: Node, setNodes: React.Dispatch<React.SetStateAction<Node[]>>, setEdges: React.Dispatch<React.SetStateAction<Edge[]>>) => {
    const command = new DeleteNodeCommand(nodeId, nodeToDelete, setNodes, setEdges);
    executeCommand(command);
  }, [executeCommand]);

  // Simple move function for single node
  const moveNode = useCallback((nodeId: string, oldPosition: { x: number; y: number }, newPosition: { x: number; y: number }, setNodes: React.Dispatch<React.SetStateAction<Node[]>>) => {
    const command = new MoveNodeCommand(nodeId, oldPosition, newPosition, setNodes);
    executeCommand(command);
  }, [executeCommand]);

  const addEdge = useCallback((edge: Edge, setEdges: React.Dispatch<React.SetStateAction<Edge[]>>) => {
    const command = new AddEdgeCommand(edge, setEdges);
    executeCommand(command);
  }, [executeCommand]);

  const updateEdge = useCallback((edgeId: string, oldData: any, newData: any, setEdges: React.Dispatch<React.SetStateAction<Edge[]>>) => {
    const command = new UpdateEdgeCommand(edgeId, oldData, newData, setEdges);
    executeCommand(command);
  }, [executeCommand]);

  const deleteEdge = useCallback((edgeId: string, edgeToDelete: Edge, setEdges: React.Dispatch<React.SetStateAction<Edge[]>>) => {
    const command = new DeleteEdgeCommand(edgeId, edgeToDelete, setEdges);
    executeCommand(command);
  }, [executeCommand]);

    // Enhanced project-level operations with context integration
  const saveProject = useCallback((description: string = 'บันทึกโปรเจกต์') => {
    // This would be used with actual project context
    // For now, just add a save command to history
    const command = {
      execute: () => {
        //consle.log('Project saved:', description);
      },
      undo: () => {
        //consle.log('Save operation undone');
      },
      getDescription: () => description,
      getType: () => 'PROJECT_SAVE'
    } as NetworkCommand;
    
    executeCommand(command);
  }, [executeCommand]);

  const loadProject = useCallback((
    loadedNodes: any[], 
    loadedEdges: any[], 
    setNodes: React.Dispatch<React.SetStateAction<any[]>>,
    setEdges: React.Dispatch<React.SetStateAction<any[]>>,
    projectName?: string
  ) => {
    const command = new ProjectStateCommand(
      { nodes: [], edges: [] }, // Would get current state from context
      { nodes: loadedNodes, edges: loadedEdges, projectName },
      setNodes,
      setEdges,
      undefined,
      `โหลดโปรเจกต์${projectName ? ` "${projectName}"` : ''}`
    );
    executeCommand(command);
  }, [executeCommand]);

  const importFile = useCallback((
    importedNodes: any[], 
    importedEdges: any[], 
    currentNodes: any[],
    currentEdges: any[],
    setNodes: React.Dispatch<React.SetStateAction<any[]>>,
    setEdges: React.Dispatch<React.SetStateAction<any[]>>,
    fileName: string,
    mergeStrategy: 'replace' | 'merge' | 'append' = 'replace'
  ) => {
    // Enhanced import with merge strategy support
    const command = new EnhancedImportCommand(
      { nodes: currentNodes, edges: currentEdges },
      { nodes: importedNodes, edges: importedEdges },
      setNodes,
      setEdges,
      fileName,
      mergeStrategy
    );
    executeCommand(command);
  }, [executeCommand]);

  const exportFile = useCallback((
    _nodes: any[],
    _edges: any[],
    fileName: string,
    format: 'json' | 'csv' | 'xml' = 'json'
  ) => {
    // Create export command for undo support
    const command = {
      execute: () => {
        //consle.log(`Exported ${_nodes.length} nodes and ${_edges.length} edges to ${fileName}.${format}`);
        // Actual export logic would go here
      },
      undo: () => {
        //consle.log(`Export to ${fileName}.${format} undone (file still exists)`);
      },
      getDescription: () => `ส่งออกไฟล์ ${fileName}.${format}`,
      getType: () => 'EXPORT_FILE'
    } as NetworkCommand;
    
    executeCommand(command);
  }, [executeCommand]);

  const clearAll = useCallback((
    currentNodes: any[],
    currentEdges: any[],
    setNodes: React.Dispatch<React.SetStateAction<any[]>>,
    setEdges: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    const command = new ClearAllCommand(
      { nodes: currentNodes, edges: currentEdges },
      setNodes,
      setEdges
    );
    executeCommand(command);
  }, [executeCommand]);

  // Bulk operations (simplified wrappers)
  const bulkDelete = useCallback((nodeIds: string[], edgeIds: string[], setNodes: React.Dispatch<React.SetStateAction<Node[]>>, setEdges: React.Dispatch<React.SetStateAction<Edge[]>>) => {
    const command = new BulkDeleteCommand(nodeIds, edgeIds, setNodes, setEdges);
    executeCommand(command);
  }, [executeCommand]);

  const bulkMove = useCallback((nodeUpdates: Array<{ nodeId: string; oldPosition: { x: number; y: number }; newPosition: { x: number; y: number } }>, setNodes: React.Dispatch<React.SetStateAction<Node[]>>) => {
    const command = new BulkMoveCommand(nodeUpdates, setNodes);
    executeCommand(command);
  }, [executeCommand]);

  const bulkUpdate = useCallback((nodeUpdates: Array<{ nodeId: string; oldData: any; newData: any }>, edgeUpdates: Array<{ edgeId: string; oldData: any; newData: any }>, setNodes: React.Dispatch<React.SetStateAction<Node[]>>, setEdges: React.Dispatch<React.SetStateAction<Edge[]>>) => {
    const command = new BulkUpdateCommand(nodeUpdates, edgeUpdates, setNodes, setEdges);
    executeCommand(command);
  }, [executeCommand]);

  const getHistory = useCallback(() => {
    return undoStack.map(cmd => ({
      description: cmd.getDescription(),
      type: cmd.getType(),
      timestamp: new Date() // Would need to add timestamp to commands
    }));
  }, [undoStack]);

  const getHistoryInfo = useCallback(() => {
    const info = {
      undoCount: undoStack.length,
      redoCount: redoStack.length,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      lastCommand: undoStack[undoStack.length - 1]?.getDescription(),
      nextCommand: redoStack[redoStack.length - 1]?.getDescription(),
      recentCommands: undoStack.slice(-5).map(cmd => cmd.getDescription()),
      isExecuting: isExecutingRef.current,
      stackSizes: {
        undo: undoStack.length,
        redo: redoStack.length,
        max: MAX_HISTORY_SIZE
      },
      allUndoCommands: undoStack.map(cmd => cmd.getDescription()),
      allRedoCommands: redoStack.map(cmd => cmd.getDescription())
    };
    
    return info;
  }, [undoStack, redoStack, MAX_HISTORY_SIZE]);

  return {
    // Core undo/redo operations
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    undoToPoint,
    getHistory,
    clearHistory,
    getHistoryInfo,
    undoStack,
    redoStack,
    // Node operations
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    // Edge operations  
    addEdge,
    updateEdge,
    deleteEdge,
    // Bulk operations
    bulkDelete,
    bulkMove,
    bulkUpdate,
    // Project-level operations
    saveProject,
    loadProject,
    importFile,
    exportFile,
    clearAll,
    // Command classes for external use
    AddNodeCommand,
    DeleteNodeCommand,
    MoveNodeCommand,
    UpdateNodeCommand,
    AddEdgeCommand,
    DeleteEdgeCommand,
    UpdateEdgeCommand,
    BatchCommand,
    BulkDeleteCommand,
    BulkMoveCommand,
    BulkUpdateCommand,
    ProjectStateCommand,
    ImportFileCommand,
    ClearAllCommand,
    // Enhanced command classes
    SmartMergeCommand,
    EnhancedBatchCommand,
    EnhancedImportCommand
  };
};