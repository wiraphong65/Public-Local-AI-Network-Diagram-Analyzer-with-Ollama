import React, { useEffect, useState } from "react";
import { X, Settings, Wifi, Shield, Monitor, Activity, Trash2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Device } from '@/types/network';
import { DEVICE_ROLES, BANDWIDTH_UNITS, THROUGHPUT_UNITS } from '@/types/network';
import { motion, AnimatePresence, easeInOut } from 'framer-motion';
import { getDevicePortLimit, getUsedPorts } from '@/utils/portManagement';

interface PropertiesPanelProps {
  selectedNode: Device | null;
  onClose: () => void;
  onUpdateNode: (nodeId: string, updates: any) => void;
  onDeleteNode: (nodeId: string) => void;
  edges?: any[]; // เพิ่ม edges เพื่อคำนวณ port ที่ใช้งาน
}

interface Errors {
  deviceRole?: string;
  maxThroughput?: string;
  bandwidth?: string;
  userCapacity?: string;
}

export const PropertiesPanel = ({ selectedNode, onClose, onUpdateNode, onDeleteNode, edges = [] }: PropertiesPanelProps) => {

  // Helper to get allowed roles by node type
  const getAllowedRoles = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'router' || t === 'firewall') return DEVICE_ROLES.filter(r => r !== 'Access');
    return DEVICE_ROLES;
  };

  const [formData, setFormData] = useState({
    label: '',
    deviceRole: '',
    maxThroughput: '',
    throughputUnit: 'Mbps',
    bandwidth: '',
    bandwidthUnit: 'Mbps',
    userCapacity: ''
  });

  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (selectedNode) {
      // Auto-set device role to Access for PC and Server
      let deviceRole = selectedNode.data.deviceRole || '';
      if (selectedNode.type.toLowerCase() === 'pc' || selectedNode.type.toLowerCase() === 'server') {
        deviceRole = 'Access';
      }

      // Always update formData when selectedNode changes to ensure we have the latest data
      setFormData({
        label: selectedNode.data.label || '',
        deviceRole: deviceRole,
        maxThroughput: selectedNode.data.maxThroughput || '',
        throughputUnit: selectedNode.data.throughputUnit || 'Mbps',
        bandwidth: selectedNode.data.bandwidth || '',
        bandwidthUnit: selectedNode.data.bandwidthUnit || 'Mbps',
        userCapacity: selectedNode.data.userCapacity || ''
      });
      setErrors({});
    }
  }, [selectedNode, edges]); // Update whenever selectedNode or edges change

  const validate = (): boolean => {
    const newErrors: Errors = {};

    // Validate device role (ไม่บังคับสำหรับ PC, Server และ ISP เพราะ auto-set เป็น Access)
    if (selectedNode && selectedNode.type.toLowerCase() !== 'pc' && selectedNode.type.toLowerCase() !== 'server' && selectedNode.type.toLowerCase() !== 'isp' && !formData.deviceRole) {
      newErrors.deviceRole = "กรุณาเลือก Device Role";
    }

    // Validate throughput (ไม่บังคับสำหรับ PC และ ISP, อุปกรณ์อื่นๆ ต้อง validate)
    if (selectedNode && selectedNode.type.toLowerCase() !== 'pc' && selectedNode.type.toLowerCase() !== 'isp') {
      // สำหรับอุปกรณ์อื่นๆ (ไม่บังคับแต่ถ้ากรอกต้องถูกต้อง)
      if (formData.maxThroughput !== '') {
        if (
          isNaN(Number(formData.maxThroughput)) ||
          !Number.isInteger(Number(formData.maxThroughput)) ||
          Number(formData.maxThroughput) < 1
        ) {
          newErrors.maxThroughput = "Throughput ต้องเป็นจำนวนเต็มบวก (มากกว่า 0)";
        }
      }
    }

    // Validate user capacity for PC
    if (selectedNode && selectedNode.type.toLowerCase() === 'pc') {
      if (formData.userCapacity === '') {
        newErrors.userCapacity = "กรุณากรอกจำนวนผู้ใช้งาน";
      } else if (
        isNaN(Number(formData.userCapacity)) ||
        !Number.isInteger(Number(formData.userCapacity)) ||
        Number(formData.userCapacity) < 1
      ) {
        newErrors.userCapacity = "จำนวนผู้ใช้งานต้องเป็นจำนวนเต็มบวก (มากกว่า 0)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (selectedNode) {
      const updateData: any = {
        label: formData.label,
      };

      // เพิ่ม deviceRole และ throughput เฉพาะสำหรับอุปกรณ์ที่ไม่ใช่ PC หรือ auto-set สำหรับ PC/Server/ISP
      if (selectedNode.type.toLowerCase() === 'pc') {
        updateData.deviceRole = 'Access'; // Auto-set PC เป็น Access
        updateData.userCapacity = formData.userCapacity; // PC มี userCapacity
      } else if (selectedNode.type.toLowerCase() === 'server') {
        updateData.deviceRole = 'Access'; // Auto-set Server เป็น Access
        // Server มี throughput
        updateData.maxThroughput = formData.maxThroughput || '1000';
        updateData.throughputUnit = formData.throughputUnit || 'Mbps';
      } else if (selectedNode.type.toLowerCase() === 'isp') {
        // ISP ไม่มี deviceRole และไม่มี throughput
        // ไม่ต้องเซ็ต throughput สำหรับ ISP
      } else {
        updateData.deviceRole = formData.deviceRole;
        // ใช้ค่าเริ่มต้น 1000 Mbps ถ้าไม่ได้กรอก throughput
        updateData.maxThroughput = formData.maxThroughput || '1000';
        updateData.throughputUnit = formData.throughputUnit || 'Mbps';
      }

      onUpdateNode(selectedNode.id, updateData);
      onClose();
    }
  };

  // Panel slide-in animation variants
  const panelVariants = {
    hidden: { x: 400, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.35, ease: easeInOut } },
    exit: { x: 400, opacity: 0, transition: { duration: 0.2, ease: easeInOut } },
  };

  // Enter key submit (PC: userCapacity, อื่นๆ: maxThroughput)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (document.activeElement as HTMLElement)?.blur();
      // simulate submit
      const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
      handleSubmit(fakeEvent);
    }
  };

  if (!selectedNode) return null;

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'firewall': return Shield;
      case 'router': case 'switch': case 'isp': return Wifi;
      case 'edge': return Activity;
      default: return Monitor;
    }
  };
  const DeviceIcon = getDeviceIcon(selectedNode.type);

  return (
    <AnimatePresence>
      <motion.div
        key="properties-panel"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={panelVariants}
        className="fixed top-0 right-0 h-screen bg-white border-l border-gray-200 p-4 overflow-y-auto z-50 shadow-xl"
        style={{
          width: '100%',
          maxWidth: 400,
          minWidth: 0,
          boxSizing: 'border-box',
          height: '100vh',
        }}
      >
        {/* Responsive: ปรับ padding และขนาดบน mobile */}
        <div className="flex flex-col h-full w-full" style={{ minHeight: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DeviceIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">ตั้งค่าคุณสมบัติของอุปกรณ์</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  ข้อมูลพื้นฐาน
                </CardTitle>
                <button
                  className="ml-2 text-red-500 hover:text-red-700"
                  title="ลบอุปกรณ์นี้"
                  onClick={() => onDeleteNode(selectedNode.id)}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="label">ชื่ออุปกรณ์</Label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700 font-medium">
                    {formData.label || 'ไม่ระบุชื่อ'}
                  </div>
                </div>

                {/* แสดงข้อมูล Port Status เฉพาะ PC และ Server */}
                {selectedNode.type !== 'edge' && (selectedNode.type === 'pc' || selectedNode.type === 'server') && (() => {
                  const maxPorts = getDevicePortLimit(selectedNode.type);
                  const usedPorts = getUsedPorts(selectedNode.id, edges);
                  const availablePorts = maxPorts - usedPorts;



                  // กำหนดสีตามสถานะ port
                  let statusColor = 'text-green-600'; // เขียว: ปกติ
                  let bgColor = 'bg-green-50';
                  let borderColor = 'border-green-200';

                  if (usedPorts / maxPorts >= 0.8) {
                    statusColor = 'text-red-600'; // แดง: เกือบเต็ม/เต็ม
                    bgColor = 'bg-red-50';
                    borderColor = 'border-red-200';
                  } else if (usedPorts / maxPorts >= 0.6) {
                    statusColor = 'text-yellow-600'; // เหลือง: ใกล้เต็ม
                    bgColor = 'bg-yellow-50';
                    borderColor = 'border-yellow-200';
                  }

                  return (
                    <div>
                      <Label>สถานะ Port</Label>
                      <div className={`px-3 py-2 ${bgColor} border ${borderColor} rounded-md`}>
                        <div className={`text-sm font-medium ${statusColor}`}>
                          ใช้งาน: {usedPorts}/{maxPorts} Port
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Port ว่าง: {availablePorts} Port
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Node form */}
            {selectedNode.type !== 'edge' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    คุณสมบัติอุปกรณ์
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* แสดง Device Role แบบ read-only สำหรับ PC และ Server */}
                  {(selectedNode.type.toLowerCase() === 'pc' || selectedNode.type.toLowerCase() === 'server') && (
                    <div>
                      <Label>Device Role</Label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                        Access
                      </div>
                    </div>
                  )}

                  {/* Device Role selection logic by node type - ซ่อนสำหรับ PC, Server และ ISP */}
                  {selectedNode.type.toLowerCase() !== 'pc' && selectedNode.type.toLowerCase() !== 'server' && selectedNode.type.toLowerCase() !== 'isp' && (
                    <>
                      <div>
                        <Label htmlFor="deviceRole">Device Role</Label>
                        <Select
                          value={formData.deviceRole}
                          onValueChange={(value) => setFormData({ ...formData, deviceRole: value })}
                          aria-invalid={errors.deviceRole ? "true" : "false"}
                          aria-describedby="deviceRole-error"
                        >
                          <SelectTrigger className="bg-white border-gray-300 hover:bg-gray-50">
                            <SelectValue placeholder="เลือก Device Role" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg">
                            {getAllowedRoles(selectedNode.type).map(role => (
                              <SelectItem key={role} value={role} className="hover:bg-blue-50">
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <AnimatePresence>
                          {errors.deviceRole && (
                            <motion.p
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              className="text-xs text-red-600 mt-1"
                            >
                              {errors.deviceRole}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex gap-2 items-baseline">
                        <div className="flex-1">
                          <Label htmlFor="maxThroughput">Throughput</Label>
                          <Input
                            id="maxThroughput"
                            type="number"
                            min={0}
                            value={formData.maxThroughput}
                            onChange={(e) => setFormData({ ...formData, maxThroughput: e.target.value })}
                            placeholder="เช่น 1000"
                            aria-invalid={errors.maxThroughput ? "true" : "false"}
                            aria-describedby="maxThroughput-error"
                            className="bg-white border-gray-300 focus:ring-2 focus:ring-blue-400 transition-shadow"
                            onKeyDown={handleKeyDown}
                          />
                          <AnimatePresence>
                            {errors.maxThroughput && (
                              <motion.p
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                id="maxThroughput-error"
                                className="text-xs text-red-600 mt-1"
                                style={{ minHeight: 28 }}
                              >
                                {errors.maxThroughput}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="w-28">
                          <Label htmlFor="throughputUnit">หน่วย</Label>
                          <Select
                            value={formData.throughputUnit}
                            onValueChange={(value) => setFormData({ ...formData, throughputUnit: value })}
                          >
                            <SelectTrigger className="bg-white border-gray-300 hover:bg-gray-50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200 shadow-lg">
                              {THROUGHPUT_UNITS.map(unit => (
                                <SelectItem key={unit} value={unit} className="hover:bg-blue-50">
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedNode.type.toLowerCase() === 'pc' && (
                    <div>
                      <Label htmlFor="userCapacity">จำนวนผู้ใช้งาน (Users)</Label>
                      <Input
                        id="userCapacity"
                        type="number"
                        min={0}
                        value={formData.userCapacity}
                        onChange={(e) => setFormData({ ...formData, userCapacity: e.target.value })}
                        placeholder="เช่น 50"
                        aria-invalid={errors.userCapacity ? "true" : "false"}
                        aria-describedby="userCapacity-error"
                        className="bg-white border-gray-300 focus:ring-2 focus:ring-blue-400 transition-shadow"
                        onKeyDown={handleKeyDown}
                      />
                      <AnimatePresence>
                        {errors.userCapacity && (
                          <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            id="userCapacity-error"
                            className="text-xs text-red-600 mt-1"
                          >
                            {errors.userCapacity}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Server Throughput field */}
                  {selectedNode.type.toLowerCase() === 'server' && (
                    <div className="flex gap-2 items-baseline">
                      <div className="flex-1">
                        <Label htmlFor="serverThroughput">Throughput</Label>
                        <Input
                          id="serverThroughput"
                          type="number"
                          min={0}
                          value={formData.maxThroughput}
                          onChange={(e) => setFormData({ ...formData, maxThroughput: e.target.value })}
                          placeholder="เช่น 10000"
                          aria-invalid={errors.maxThroughput ? "true" : "false"}
                          aria-describedby="serverThroughput-error"
                          className="bg-white border-gray-300 focus:ring-2 focus:ring-blue-400 transition-shadow"
                          onKeyDown={handleKeyDown}
                        />
                        <AnimatePresence>
                          {errors.maxThroughput && (
                            <motion.p
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              id="serverThroughput-error"
                              className="text-xs text-red-600 mt-1"
                            >
                              {errors.maxThroughput}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="w-28">
                        <Label htmlFor="serverThroughputUnit">หน่วย</Label>
                        <Select
                          value={formData.throughputUnit}
                          onValueChange={(value) => setFormData({ ...formData, throughputUnit: value })}
                        >
                          <SelectTrigger className="bg-white border-gray-300 hover:bg-gray-50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg">
                            {THROUGHPUT_UNITS.map(unit => (
                              <SelectItem key={unit} value={unit} className="hover:bg-blue-50">
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}


                </CardContent>
              </Card>
            )}

            {/* Edge form */}
            {selectedNode.type === 'edge' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    คุณสมบัติสายเชื่อมต่อ
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Label htmlFor="bandwidth">Bandwidth</Label>
                    <Input
                      id="bandwidth"
                      type="number"
                      min={0}
                      value={formData.bandwidth}
                      onChange={(e) => setFormData({ ...formData, bandwidth: e.target.value })}
                      placeholder="เช่น 100"
                      aria-invalid={errors.bandwidth ? "true" : "false"}
                      aria-describedby="bandwidth-error"
                      className="bg-white border-gray-300 focus:ring-2 focus:ring-blue-400 transition-shadow"
                      onKeyDown={handleKeyDown}
                    />
                    <AnimatePresence>
                      {errors.bandwidth && (
                        <motion.p
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          id="bandwidth-error"
                          className="text-xs text-red-600 mt-1"
                        >
                          {errors.bandwidth}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="w-28">
                    <Label htmlFor="bandwidthUnit">หน่วย</Label>
                    <Select
                      value={formData.bandwidthUnit}
                      onValueChange={(value) => setFormData({ ...formData, bandwidthUnit: value })}
                    >
                      <SelectTrigger className="bg-white border-gray-300 hover:bg-gray-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        {BANDWIDTH_UNITS.map(unit => (
                          <SelectItem key={unit} value={unit} className="hover:bg-blue-50">
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator className="my-4" />

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-[#2F58CD] text-white hover:bg-[#2446a6] transition-colors transition-transform duration-150 active:scale-95 hover:scale-105">
                บันทึก
              </Button>
              <Button type="button" className="flex-1 border-[#2F58CD] text-[#2F58CD] bg-white hover:bg-[#E0E0E0] transition-colors transition-transform duration-150 active:scale-95 hover:scale-105" variant="outline" onClick={onClose}>
                ยกเลิก
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
