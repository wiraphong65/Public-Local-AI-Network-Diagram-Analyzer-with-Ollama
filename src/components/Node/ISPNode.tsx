import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface NodeData {
  label?: string;
  selected?: boolean;
}

const ISPNode = ({ data }: { data: NodeData }) => {
  const isSelected = !!data?.selected;
  return (
    <div
      className={
        `relative flex flex-col items-center ` +
        (isSelected ? ' ring-4 ring-yellow-400 ring-offset-2 animate-glow' : '')
      }
      style={isSelected ? { boxShadow: '0 0 16px 4px #ffe066, 0 0 0 4px #ffd700 inset' } : {}}
    >
      <img
        src={import.meta.env.BASE_URL + 'img/node/isp.png'}
        alt="ISP"
        className="w-24 h-24 object-contain"
        draggable={false}
      />
      <div className="text-xs font-bold -mt-4 text-center">{data?.label || 'ISP'}</div>
      {/* Invisible handles for connections */}
      <Handle
        type="source"
        position={Position.Top} // ใส่อะไรก็ได้ เพราะเราจะ override ด้วย style
        className="w-0 h-0 opacity-0" // ถ้าอยากให้มองไม่เห็นก็เปลี่ยนเป็น w-0 h-0 opacity-0
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <Handle
        type="target"
        position={Position.Top}
        className="w-0 h-0 opacity-0" // หรือทำให้ invisible ได้
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
};

export default memo(ISPNode);