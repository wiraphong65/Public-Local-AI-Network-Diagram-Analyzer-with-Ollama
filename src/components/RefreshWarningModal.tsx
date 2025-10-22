import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle, Save, X } from 'lucide-react';

interface RefreshWarningModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  onLeave: () => void;
  hasUnsavedChanges: boolean;
}

export const RefreshWarningModal: React.FC<RefreshWarningModalProps> = ({
  open,
  onClose,
  onSave,
  onLeave,
  hasUnsavedChanges
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-5 h-5" />
            แจ้งเตือนการเปลี่ยนแปลง
          </DialogTitle>
          <DialogDescription>
            คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึกหรือกำลังจะออกจากหน้าเว็บ
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            {hasUnsavedChanges 
              ? "คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการทำอย่างไร?"
              : "คุณกำลังจะออกจากหน้าเว็บ ต้องการทำอย่างไร?"
            }
          </div>
          
          <div className="flex flex-col gap-2">
            {hasUnsavedChanges && (
              <Button 
                onClick={onSave}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                บันทึกและออกจากหน้า
              </Button>
            )}
            
            <Button 
              onClick={onLeave}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              ออกจากหน้าโดยไม่บันทึก
            </Button>
            
            <Button 
              onClick={onClose}
              variant="ghost"
              className="w-full"
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 