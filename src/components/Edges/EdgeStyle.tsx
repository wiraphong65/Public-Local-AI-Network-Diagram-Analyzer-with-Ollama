import React from 'react';
import { BaseEdge } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

interface EdgeData {
  label?: string;
  curveIntensity?: number; // ความโค้งของเส้น (0-1)
}

export const EdgeStyle: React.FC<EdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  data,
  markerEnd,
}) => {
  // ปรับค่าความโค้งและระยะห่างจุดควบคุม
  const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
  const curveIntensity = isObj(data) && 'curveIntensity' in data && typeof data.curveIntensity === 'number' ? data.curveIntensity : 0.5;
  // สร้าง cubic Bézier curve แบบกำหนด 4 จุด
  function getCubicBezierPath(sx: number, sy: number, tx: number, ty: number, intensity: number) {
    // เวกเตอร์ทิศทาง
    const dx = tx - sx;
    const dy = ty - sy;
    // ระยะห่าง
    const distance = Math.sqrt(dx * dx + dy * dy);
    // offset สำหรับ control point
    const offset = (intensity ?? 0.5) * Math.max(distance * 0.4, 40);
    // Control point 1: ใกล้ source
    const c1x = sx + (dx === 0 ? 0 : (dx > 0 ? 1 : -1) * offset);
    const c1y = sy + (dy === 0 ? 0 : (dy > 0 ? 1 : -1) * offset);
    // Control point 2: ใกล้ target
    const c2x = tx - (dx === 0 ? 0 : (dx > 0 ? 1 : -1) * offset);
    const c2y = ty - (dy === 0 ? 0 : (dy > 0 ? 1 : -1) * offset);
    return {
      path: `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`
    };
  }

  const { path: cubicPath } = getCubicBezierPath(sourceX, sourceY, targetX, targetY, curveIntensity);
  

  
  return (
    <>
      {/* Invisible thick stroke for easier clicking */}
      <BaseEdge
        path={cubicPath}
        markerEnd={undefined}
        style={{
          stroke: 'transparent',
          strokeWidth: 18,
          cursor: 'pointer',
        }}
        className="react-flow__edge-click-area"
      />
      {/* Visible edge */}
      <BaseEdge
        path={cubicPath}
        markerEnd={markerEnd}
        style={{
          ...(isObj(style) ? style : {}),
          stroke: '#97e30b',
          strokeWidth: '3px',
        }}
        className="react-flow__edge"
      />
      {/* แสดง bandwidth กลางสาย ถ้ามี */}
      {(() => {
        const bw = data?.bandwidth;
        const unit = data?.bandwidthUnit;
        if (!(typeof bw === 'string' && typeof unit === 'string' && bw && unit)) return null;
        const label = `${bw} ${unit}`;
        return (
          <foreignObject
            x={(sourceX + targetX) / 2 - 60}
            y={(sourceY + targetY) / 2 - 16}
            width={120}
            height={32}
            style={{ pointerEvents: 'none' }}
          >
            <span style={{ fontSize: '11px', color: '#222' }}>{label}</span>
          </foreignObject>
        );
      })()}
    </>
  );
};


export const createSmoothEdge = (props: Partial<EdgeData> = {}) => ({
  curveIntensity: 100,
  ...props,
});


export const edgeTypes = {
  smooth: EdgeStyle,
};