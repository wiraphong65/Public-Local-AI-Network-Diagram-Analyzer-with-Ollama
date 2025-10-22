// Network Connection Validation System
import type { Node } from '@xyflow/react';
import { getDevicePortLimit } from './portManagement';

export interface ConnectionRule {
  from: string[];
  to: string[];
  allowed: boolean;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason: string;
}

// Network Connection Rules (All devices can connect to each other)
export const CONNECTION_RULES: ConnectionRule[] = [

  // ISP connections (ISP should connect to routers and firewalls mainly)
  {
    from: ['isp'],
    to: ['router', 'firewall', 'switch'],
    allowed: true,
    reason: 'ISP เชื่อมต่อได้กับ Router, Firewall และ Switch'
  },

  // PC connections
  {
    from: ['pc'],
    to: ['pc', 'server', 'switch', 'router', 'firewall'],
    allowed: true,
    reason: 'PC เชื่อมต่อได้กับทุกอุปกรณ์'
  },

  // Server connections
  {
    from: ['server'],
    to: ['pc', 'server', 'switch', 'router', 'firewall'],
    allowed: true,
    reason: 'Server เชื่อมต่อได้กับทุกอุปกรณ์'
  },

  // Switch connections (เพิ่ม ISP)
  {
    from: ['switch'],
    to: ['pc', 'server', 'switch', 'router', 'firewall', 'isp'],
    allowed: true,
    reason: 'Switch เชื่อมต่อได้กับทุกอุปกรณ์รวมทั้ง ISP'
  },

  // Router connections (เพิ่ม ISP)
  {
    from: ['router'],
    to: ['pc', 'server', 'switch', 'router', 'firewall', 'isp'],
    allowed: true,
    reason: 'Router เชื่อมต่อได้กับทุกอุปกรณ์รวมทั้ง ISP'
  },

  // Firewall connections (เพิ่ม ISP)
  {
    from: ['firewall'],
    to: ['pc', 'server', 'switch', 'router', 'firewall', 'isp'],
    allowed: true,
    reason: 'Firewall เชื่อมต่อได้กับทุกอุปกรณ์รวมทั้ง ISP'
  }
];

// Get device type from node
export function getDeviceType(node: Node): string {
  return String(node.data?.deviceType || node.type || 'unknown');
}

// Internal function to count existing connections for a node
function countNodeConnections(nodeId: string, edges: any[]): number {
  return edges.filter(edge =>
    edge.source === nodeId || edge.target === nodeId
  ).length;
}

// Get port status for a device
export function getPortStatus(node: Node, edges: any[]): {
  used: number;
  total: number;
  available: number;
  percentage: number;
} {
  const deviceType = getDeviceType(node);
  const maxPorts = getDevicePortLimit(deviceType);
  const currentConnections = countNodeConnections(node.id, edges);

  return {
    used: currentConnections,
    total: maxPorts,
    available: Math.max(0, maxPorts - currentConnections),
    percentage: maxPorts > 0 ? Math.round((currentConnections / maxPorts) * 100) : 0
  };
}

// Internal function to check if device has reached port limit (after adding new connection)
function checkPortLimit(
  node: Node,
  edges: any[]
): ValidationResult {
  const deviceType = getDeviceType(node);
  const maxPorts = getDevicePortLimit(deviceType);

  if (maxPorts === 999) { // Unlimited ports
    return { isValid: true, reason: '' };
  }

  const currentConnections = countNodeConnections(node.id, edges);
  
  // Check if adding one more connection would exceed the limit
  if (currentConnections >= maxPorts) {
    const deviceName = deviceType.toUpperCase();
    return {
      isValid: false,
      reason: `${deviceName} มี port เต็มแล้ว (${currentConnections}/${maxPorts} ports)`
    };
  }

  return { isValid: true, reason: '' };
}

// Validate a single connection (with port limit check)
export function validateConnection(
  sourceNode: Node,
  targetNode: Node,
  edges: any[] = []
): ValidationResult {
  const sourceType = getDeviceType(sourceNode);
  const targetType = getDeviceType(targetNode);

  // Check if trying to connect to itself
  if (sourceNode.id === targetNode.id) {
    return {
      isValid: false,
      reason: 'ไม่สามารถเชื่อมต่อกับตัวเองได้'
    };
  }

  // Check if connection already exists
  const existingConnection = edges.find(edge =>
    (edge.source === sourceNode.id && edge.target === targetNode.id) ||
    (edge.source === targetNode.id && edge.target === sourceNode.id)
  );

  if (existingConnection) {
    return {
      isValid: false,
      reason: 'มีการเชื่อมต่อระหว่างอุปกรณ์นี้อยู่แล้ว'
    };
  }

  // Check port limits first
  const sourcePortCheck = checkPortLimit(sourceNode, edges);
  if (!sourcePortCheck.isValid) {
    return sourcePortCheck;
  }

  const targetPortCheck = checkPortLimit(targetNode, edges);
  if (!targetPortCheck.isValid) {
    return targetPortCheck;
  }

  // Find matching connection rule
  const rule = CONNECTION_RULES.find(rule =>
    rule.from.includes(sourceType) && rule.to.includes(targetType)
  );

  if (!rule) {
    return {
      isValid: false,
      reason: `ไม่มีกฎการเชื่อมต่อสำหรับ ${sourceType.toUpperCase()} → ${targetType.toUpperCase()}`
    };
  }

  // If connection is valid, show port status info only for PC and Server
  if (rule.allowed) {
    const sourcePortStatus = getPortStatus(sourceNode, edges);
    const targetPortStatus = getPortStatus(targetNode, edges);

    let portInfo = '';
    
    // แสดงข้อมูล port เฉพาะ PC และ Server เท่านั้น
    const showSourcePort = sourceType === 'pc' || sourceType === 'server';
    const showTargetPort = targetType === 'pc' || targetType === 'server';
    
    if ((showSourcePort && sourcePortStatus.total > 0) || (showTargetPort && targetPortStatus.total > 0)) {
      const sourceInfo = showSourcePort && sourcePortStatus.total > 0 ? 
        `${sourceType.toUpperCase()}: ${sourcePortStatus.used + 1}/${sourcePortStatus.total}` : '';
      const targetInfo = showTargetPort && targetPortStatus.total > 0 ? 
        `${targetType.toUpperCase()}: ${targetPortStatus.used + 1}/${targetPortStatus.total}` : '';
      
      const parts = [sourceInfo, targetInfo].filter(Boolean);
      if (parts.length > 0) {
        portInfo = ` (${parts.join(', ')})`;
      }
    }

    return {
      isValid: rule.allowed,
      reason: rule.reason + portInfo
    };
  }

  return {
    isValid: rule.allowed,
    reason: rule.reason
  };
}