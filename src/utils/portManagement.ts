// Port Management System for Network Devices

interface DevicePortConfig {
  deviceType: string;
  totalPorts: number;
  maxConnections: number;
}

// Internal device port configurations
const DEVICE_PORT_CONFIGS: Record<string, DevicePortConfig> = {
  // Switches (unlimited connections)
  switch: {
    deviceType: 'switch',
    totalPorts: 999,
    maxConnections: 999
  },

  // Routers (unlimited connections)
  router: {
    deviceType: 'router',
    totalPorts: 999,
    maxConnections: 999
  },

  // Hubs (unlimited connections)
  hub: {
    deviceType: 'hub',
    totalPorts: 999,
    maxConnections: 999
  },

  // Firewalls (unlimited connections)
  firewall: {
    deviceType: 'firewall',
    totalPorts: 999,
    maxConnections: 999
  },

  // ISP (Internet Service Provider) - unlimited connections
  isp: {
    deviceType: 'isp',
    totalPorts: 999,
    maxConnections: 999
  },

  // End devices - PC limited to 1 connection only
  pc: {
    deviceType: 'pc',
    totalPorts: 1,
    maxConnections: 1
  },

  // Server limited to 1 connection only
  server: {
    deviceType: 'server',
    totalPorts: 1,
    maxConnections: 1
  }
};

// Internal function to get port configuration for device type
function getDevicePortConfig(deviceType: string): DevicePortConfig | null {
  return DEVICE_PORT_CONFIGS[deviceType] || null;
}

// Get maximum port limit for device type
export function getDevicePortLimit(deviceType: string): number {
  const config = getDevicePortConfig(deviceType);
  return config ? config.maxConnections : 999; // Default to unlimited if unknown
}

// Count used ports for a specific device
export function getUsedPorts(deviceId: string, edges: any[]): number {
  if (!edges || !Array.isArray(edges)) return 0;
  
  return edges.filter(edge => 
    edge.source === deviceId || edge.target === deviceId
  ).length;
}