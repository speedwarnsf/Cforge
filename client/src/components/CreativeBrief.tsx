// ================== SINGLE CUT-PASTE REACT INPUT + BUTTON FIX ==================

import { useState } from "react";

interface CreativeBriefProps {
  query: string;
  onQueryChange: (query: string) => void;
  mode?: "single" | "multivariant";
  onModeChange?: (mode: "single" | "multivariant") => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export default function CreativeBrief({
  query,
  onQueryChange,
  mode = "single",
  onModeChange,
  placeholder = "Type your creative brief here...",
  maxLength = 500,
  className = ""
}: CreativeBriefProps) {
  
  return (
    <div className={`creative-brief-container ${className}`}>
      {/* Mode Toggle Buttons */}
      {onModeChange && (
        <div className="mode-buttons flex space-x-2 mb-4">
          <button
            onClick={() => onModeChange("single")}
            className={`px-4 py-2 text-sm font-medium border transition-colors ${
              mode === "single" 
                ? "bg-black text-white border-black" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Single Concept
          </button>
          <button
            onClick={() => onModeChange("multivariant")}
            className={`px-4 py-2 text-sm font-medium border transition-colors ${
              mode === "multivariant" 
                ? "bg-black text-white border-black" 
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Multi-Variant
          </button>
        </div>
      )}

      {/* Text Input Area */}
      <div className="relative">
        <textarea
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="creative-brief-input w-full px-4 py-3 border border-gray-600 focus:border-gray-500 focus:outline-none resize-none transition-colors duration-200 text-white placeholder-gray-400 bg-gray-800 leading-relaxed rounded-none min-h-[120px] text-sm"
          maxLength={maxLength}
        />
        
        {/* Character Counter */}
        <div className={`absolute text-xs font-mono rounded-none border border-gray-300 ${
          query.length > maxLength * 0.8 ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-500'
        }`} style={{ right: '20px', bottom: '20px', padding: '4px 8px', width: '72px' }}>
          {query.length}/{maxLength}
        </div>
      </div>

      {/* Status Line */}
      <div className="status-line mt-2 text-xs text-gray-500">
        {query.length > 0 ? `${query.length} characters` : "Start typing your brief..."}
      </div>
    </div>
  );
}