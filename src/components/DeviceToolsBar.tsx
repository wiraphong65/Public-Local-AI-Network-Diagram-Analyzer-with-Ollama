import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Devices = [
  {
    id: 'isp',
    type: 'isp',
    label: 'ISP',
    image: import.meta.env.BASE_URL + 'img/node/isp.png', 
    size: { width: 64, height: 64 },
  },
  {
    id: 'firewall',
    type: 'firewall',
    label: 'Firewall',
    image: import.meta.env.BASE_URL + 'img/node/firewall-protection.png', 
    size: { width: 64, height: 64 },
  },
  {
    id: 'router',
    type: 'router',
    label: 'Router',
    image: import.meta.env.BASE_URL + 'img/node/wireless-router.png', 
    size: { width: 64, height: 64 },
  },
  {
    id: 'switch',
    type: 'switch',
    label: 'Switch',
    image: import.meta.env.BASE_URL + 'img/node/switch.png', 
    size: { width: 64, height: 64 },
  },
  {
    id: 'server',
    type: 'server',
    label: 'Server',
    image: import.meta.env.BASE_URL + 'img/node/servers.png', 
    size: { width: 64, height: 64 },
  },
  {
    id: 'pc',
    type: 'pc',
    label: 'PC',
    image: import.meta.env.BASE_URL + 'img/node/pc.png', 
    size: { width: 64, height: 64 },
  },
  
]

interface DeviceToolsBarProps {
  isConnectionMode: boolean;
  onToggleConnectionMode: () => void;
  selectedSourceNode: string | null;
}

export const DeviceToolsBar = ({ isConnectionMode, onToggleConnectionMode, selectedSourceNode }: DeviceToolsBarProps) => {
    const onDragStart = (event: React.DragEvent, nodetype: string) => {
        event.dataTransfer.setData('application/reactflow', nodetype);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
     <div className="w-48 bg-white border-r border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-4">อุปกรณ์เครือข่าย</h3>
      
      <div className="space-y-2">
        {Devices.map((device) => {
          return (
            <div
              key={device.type}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-grab active:cursor-grabbing transition-colors"
              draggable
              onDragStart={(event) => onDragStart(event, device.type)}
            >
              <img 
                src={device.image} 
                alt={device.label}
                className="w-5 h-5 object-contain"
              />
              <span className="text-sm font-medium text-gray-700">{device.label}</span>
            </div>
          );
        })}
      </div>

      {/* Connection Button */}
      <div className="mt-6">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleConnectionMode}
                className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                  isConnectionMode
                    ? 'bg-blue-500 border-blue-600 text-white shadow-lg hover:bg-blue-600'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <img 
                  src={import.meta.env.BASE_URL + "img/node/rj45.png"} 
                  alt="LAN"
                  className="w-4 h-4 object-contain"
                />
                <span className="text-sm font-medium">
                  {isConnectionMode ? 'ยกเลิกการเชื่อมต่อ' : 'เชื่อมต่อสาย'}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="text-sm">
                {isConnectionMode 
                  ? selectedSourceNode 
                    ? (
                      <div>
                        <p className="font-medium text-blue-800">เลือกแล้ว: {selectedSourceNode}</p>
                        <p className="text-blue-700">คลิกที่ node ปลายทางเพื่อเชื่อมต่อ</p>
                      </div>
                    )
                    : (
                      <div>
                        <p className="font-medium text-blue-800">โหมดเชื่อมต่อ</p>
                        <p className="text-blue-700">คลิกที่ node ต้นทางเพื่อเริ่มการเชื่อมต่อ</p>
                      </div>
                    )
                  : (
                    <div>
                      <p className="font-medium">เชื่อมต่อสาย</p>
                      <p className="text-gray-600">คลิกเพื่อเริ่มโหมดเชื่อมต่อสาย</p>
                    </div>
                  )
                }
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800 font-medium mb-1">วิธีใช้งาน</p>
        <p className="text-xs text-blue-700">ลากอุปกรณ์ไปวางบนแผนผัง แล้วเชื่อมต่อเข้าด้วยกัน</p>
      </div>
    </div>
    );
}