import React from 'react';
import type { Edge } from '@xyflow/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Activity, X, Settings, Trash2 } from 'lucide-react';
import { BANDWIDTH_UNITS } from '@/types/network';
import { useNetworkDiagram } from '@/hooks/useNetworkDiagram';
import { motion, AnimatePresence, easeInOut } from 'framer-motion';

interface TempEdgeData {
  id: string;
  label: string;
  bandwidth: string;
  bandwidthUnit: string;
}

interface EdgePropertiesPanelProps {
  selectedEdge: Edge;
  tempEdgeData: TempEdgeData;
  onSave: () => void;
  onCancel: () => void;
  onUpdateTempData: (data: TempEdgeData) => void;
  onDeleteEdge: (edgeId: string) => void;
}

export const EdgePropertiesPanel: React.FC<EdgePropertiesPanelProps> = ({
  selectedEdge,
  tempEdgeData,
  onSave,
  onCancel,
  onUpdateTempData,
  onDeleteEdge,
}) => {

  const { nodes } = useNetworkDiagram();
  const [errors, setErrors] = React.useState<{ bandwidth?: string }>({});

  // Helper to get node label by id
  const getNodeLabel = (id: string): string => {
    const node = nodes.find((n: any) => n.id === id);
    if (node && typeof node.data?.label === 'string') {
      return node.data.label;
    }
    if (typeof id === 'string') return id;
    return '';
  };

  // Initialize tempEdgeData when selectedEdge changes
  React.useEffect(() => {
    if (selectedEdge) {
      onUpdateTempData({
        id: selectedEdge.id,
        label: (selectedEdge.data?.label as string) || '',
        bandwidth: (selectedEdge.data?.bandwidth as string) || '',
        bandwidthUnit: (selectedEdge.data?.bandwidthUnit as string) || 'Mbps'
      });
    }
  }, [selectedEdge, onUpdateTempData]);

  const handleInputChange = (field: string, value: string) => {
    onUpdateTempData({
      ...tempEdgeData,
      [field]: value
    });
    
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: { bandwidth?: string } = {};
    const bandwidth = tempEdgeData?.bandwidth;
    // ตรวจสอบว่าเป็นตัวเลขจำนวนเต็มบวก >= 1 เท่านั้น
    if (!bandwidth || isNaN(Number(bandwidth)) || !Number.isInteger(Number(bandwidth)) || Number(bandwidth) < 1) {
      newErrors.bandwidth = "กรุณากรอก Bandwidth เป็นจำนวนเต็มบวก (มากกว่า 0)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave();
    }
  };

  // เพิ่ม handleKeyDown ให้ Enter ที่ input สุดท้าย submit ฟอร์ม
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  // Panel slide-in animation variants
  const panelVariants = {
    hidden: { x: 400, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.35, ease: easeInOut } },
    exit: { x: 400, opacity: 0, transition: { duration: 0.2, ease: easeInOut } },
  };

  return (
    <AnimatePresence>
      <motion.div
        key="edge-properties-panel"
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
        <div className="flex flex-col h-full w-full" style={{ minHeight: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">ตั้งค่าคุณสมบัติของสาย</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  ข้อมูลพื้นฐาน
                </CardTitle>
                <button
                  className="ml-2 text-red-500 hover:text-red-700"
                  title="ลบสายนี้"
                  onClick={() => onDeleteEdge(selectedEdge.id)}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edgeLabel">ชื่อสาย</Label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700 font-medium">
                      {tempEdgeData?.label || 'ไม่ระบุชื่อ'}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="bandwidth">Bandwidth</Label>
                    <div className="flex gap-2">
                      <Input
                        id="bandwidth"
                        type="number"
                        value={tempEdgeData?.bandwidth || ''}
                        onChange={(e) => handleInputChange('bandwidth', e.target.value)}
                        placeholder="1000"
                        min="0"
                        className={`bg-white border-gray-300 focus:ring-2 focus:ring-blue-400 transition-shadow ${errors.bandwidth ? 'border-red-500' : ''}`}
                        aria-invalid={errors.bandwidth ? "true" : "false"}
                        onKeyDown={handleKeyDown}
                      />
                      <Select
                        value={tempEdgeData?.bandwidthUnit || 'Mbps'}
                        onValueChange={(value) => handleInputChange('bandwidthUnit', value)}
                      >
                        <SelectTrigger className="w-24 bg-white border-gray-300 hover:bg-gray-50">
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
                    <AnimatePresence>
                      {errors.bandwidth && (
                        <motion.p
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="text-xs text-red-600 mt-1"
                        >
                          {errors.bandwidth}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  ข้อมูลการเชื่อมต่อ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">

                  <div>จาก: {getNodeLabel(selectedEdge.source)}</div>
                  <div>ไปยัง: {getNodeLabel(selectedEdge.target)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSave}
                className="flex-1 bg-[#2F58CD] text-white hover:bg-[#2446a6] transition-colors transition-transform duration-150 active:scale-95 hover:scale-105"
                variant="default"
              >
                บันทึก
              </Button>
              <Button 
                onClick={onCancel}
                className="flex-1 border-[#2F58CD] text-[#2F58CD] bg-white hover:bg-[#E0E0E0] transition-colors transition-transform duration-150 active:scale-95 hover:scale-105"
                variant="outline"
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 