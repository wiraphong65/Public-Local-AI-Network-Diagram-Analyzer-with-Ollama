import React from 'react';

interface AIEntryIconProps {
  onClick?: () => void;
  currentProject?: {
    id: number;
    name: string;
  } | null;
}

export const AIEntryIcon: React.FC<AIEntryIconProps> = ({ onClick, currentProject }) => (
  <div className="fixed z-50" style={{ right: 66, bottom: 66 }}>
    {/* Pulse animation style (scoped) */}
    <style>{`
      @keyframes pulse-once {
        0% { transform: scale(1); }
        30% { transform: scale(1.12); }
        60% { transform: scale(0.96); }
        100% { transform: scale(1); }
      }
      .animate-pulse-once {
        animation: pulse-once 1.2s cubic-bezier(0.4,0,0.6,1) infinite;
      }
      .group:hover .animate-pulse-once {
        animation: none !important;
      }
    `}</style>
    <div
      className="p-[3px] rounded-xl"
      style={{
        background: 'linear-gradient(135deg, #a78bfa 0%, #3b82f6 50%, #38bdf8 100%)',
        display: 'inline-block'
      }}
    >
      <button
        className="group animate-pulse-once bg-black rounded-xl p-4 flex items-center justify-center shadow-xl hover:scale-110 hover:shadow-2xl focus:ring-4 focus:ring-blue-300 transition-all duration-300 ease-in-out outline-none relative"
        onClick={onClick}
        aria-label="Open AI Panel"
        tabIndex={0}
        style={{ display: 'inline-flex' }}
      >
        <img src={import.meta.env.BASE_URL + "img/menu-tools/icons8-ai-48.png"} alt="AI Icon" width={30} height={30} className="object-contain" />
        
        {/* Project indicator */}
        {currentProject && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        )}
      </button>
    </div>
    <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap shadow-lg select-none">
      <div className="text-center">
        <div className="font-medium">AI Assistant</div>
        {currentProject ? (
          <div className="text-xs text-gray-300 mt-1">
            โปรเจกต์: {currentProject.name}
          </div>
        ) : (
          <div className="text-xs text-yellow-300 mt-1">
            ไม่มีโปรเจกต์ที่เลือก
          </div>
        )}
      </div>
    </div>
  </div>
);

export default AIEntryIcon; 