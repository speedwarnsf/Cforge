import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StoredConcept } from '@/lib/conceptStorage';
import { X, Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BoardItem {
  id: string;
  conceptId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

interface MoodBoardProps {
  concepts: StoredConcept[];
  onClose: () => void;
}

const BOARD_STORAGE_KEY = 'cforge_moodboard';

function loadBoard(): BoardItem[] {
  try {
    const raw = localStorage.getItem(BOARD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBoard(items: BoardItem[]): void {
  localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(items));
}

export default function MoodBoard({ concepts, onClose }: MoodBoardProps) {
  const [boardItems, setBoardItems] = useState<BoardItem[]>(() => loadBoard());
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [resizeState, setResizeState] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [maxZ, setMaxZ] = useState(() => Math.max(1, ...loadBoard().map(i => i.zIndex)));
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  const conceptMap = new Map(concepts.map(c => [c.id, c]));

  // Available concepts not yet on board
  const availableConcepts = concepts.filter(c => !boardItems.some(bi => bi.conceptId === c.id));

  useEffect(() => {
    saveBoard(boardItems);
  }, [boardItems]);

  const addToBoard = (conceptId: string) => {
    const newZ = maxZ + 1;
    setMaxZ(newZ);
    const item: BoardItem = {
      id: `board-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conceptId,
      x: 100 + Math.random() * 400,
      y: 100 + Math.random() * 300,
      width: 320,
      height: 220,
      zIndex: newZ,
    };
    setBoardItems(prev => [...prev, item]);
  };

  const removeFromBoard = (id: string) => {
    setBoardItems(prev => prev.filter(i => i.id !== id));
  };

  const bringToFront = (id: string) => {
    const newZ = maxZ + 1;
    setMaxZ(newZ);
    setBoardItems(prev => prev.map(i => i.id === id ? { ...i, zIndex: newZ } : i));
  };

  const handleMouseDown = (e: React.MouseEvent, itemId: string) => {
    if ((e.target as HTMLElement).closest('[data-resize]')) return;
    e.preventDefault();
    bringToFront(itemId);
    const item = boardItems.find(i => i.id === itemId);
    if (!item) return;
    setDragState({
      id: itemId,
      offsetX: e.clientX / scale - item.x,
      offsetY: e.clientY / scale - item.y,
    });
  };

  const handleResizeDown = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const item = boardItems.find(i => i.id === itemId);
    if (!item) return;
    setResizeState({
      id: itemId,
      startX: e.clientX,
      startY: e.clientY,
      startW: item.width,
      startH: item.height,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragState) {
      setBoardItems(prev => prev.map(i =>
        i.id === dragState.id
          ? { ...i, x: e.clientX / scale - dragState.offsetX, y: e.clientY / scale - dragState.offsetY }
          : i
      ));
    }
    if (resizeState) {
      const dx = e.clientX - resizeState.startX;
      const dy = e.clientY - resizeState.startY;
      setBoardItems(prev => prev.map(i =>
        i.id === resizeState.id
          ? { ...i, width: Math.max(200, resizeState.startW + dx), height: Math.max(120, resizeState.startH + dy) }
          : i
      ));
    }
  }, [dragState, resizeState, scale]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setResizeState(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const clearBoard = () => {
    setBoardItems([]);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-gray-950 flex">
      {/* Sidebar - available concepts */}
      <div className="w-72 bg-black border-r border-gray-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Mood Board</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-gray-800 flex gap-2">
          <Button variant="outline" size="sm" className="text-[10px] h-7 border-gray-700 text-gray-400 bg-transparent hover:bg-gray-800 flex-1" onClick={clearBoard}>
            Clear Board
          </Button>
          <Button variant="outline" size="sm" className="text-[10px] h-7 border-gray-700 text-gray-400 bg-transparent hover:bg-gray-800" onClick={() => setScale(s => Math.min(2, s + 0.1))}>
            <ZoomIn className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" className="text-[10px] h-7 border-gray-700 text-gray-400 bg-transparent hover:bg-gray-800" onClick={() => setScale(s => Math.max(0.3, s - 0.1))}>
            <ZoomOut className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" className="text-[10px] h-7 border-gray-700 text-gray-400 bg-transparent hover:bg-gray-800" onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}>
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-gray-600 mb-2">
            Drag concepts to board ({availableConcepts.length} available)
          </div>
          {availableConcepts.map(c => (
            <button
              key={c.id}
              onClick={() => addToBoard(c.id)}
              className="w-full text-left p-3 bg-gray-900 border border-gray-800 hover:border-gray-600 transition-colors"
            >
              <div className="text-xs font-bold text-white truncate">{c.headlines[0] || 'Untitled'}</div>
              {c.tagline && <div className="text-[10px] text-cyan-400 italic truncate mt-0.5">{c.tagline}</div>}
              <div className="text-[10px] text-gray-600 font-mono mt-1">{c.rhetoricalDevice}</div>
            </button>
          ))}
          {availableConcepts.length === 0 && (
            <div className="text-xs text-gray-600 text-center py-8">All concepts are on the board</div>
          )}
        </div>

        <div className="p-3 border-t border-gray-800">
          <div className="text-[10px] text-gray-600 font-mono">
            {boardItems.length} on board -- Click to add, drag to arrange
          </div>
        </div>
      </div>

      {/* Board canvas */}
      <div
        ref={boardRef}
        className="flex-1 overflow-hidden relative"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          cursor: dragState ? 'grabbing' : 'default',
        }}
      >
        <div
          style={{
            transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {boardItems.map(item => {
            const c = conceptMap.get(item.conceptId);
            if (!c) return null;
            return (
              <div
                key={item.id}
                className="absolute bg-gray-900 border border-gray-700 hover:border-gray-500 shadow-2xl overflow-hidden select-none group"
                style={{
                  left: item.x,
                  top: item.y,
                  width: item.width,
                  height: item.height,
                  zIndex: item.zIndex,
                  cursor: dragState?.id === item.id ? 'grabbing' : 'grab',
                }}
                onMouseDown={e => handleMouseDown(e, item.id)}
              >
                {/* Header bar */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-950 border-b border-gray-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <Move className="w-3 h-3 text-gray-600 shrink-0" />
                    <span className="text-[10px] font-mono text-gray-500 truncate">{c.rhetoricalDevice}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeFromBoard(item.id); }}
                    className="p-0.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-3 overflow-hidden" style={{ height: item.height - 36 }}>
                  <h3 className="text-sm font-black text-white leading-tight mb-1">
                    {c.headlines[0] || 'Untitled'}
                  </h3>
                  {c.tagline && (
                    <p className="text-[11px] text-cyan-400 italic mb-2 line-clamp-1">{c.tagline}</p>
                  )}
                  {c.bodyCopy && (
                    <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">{c.bodyCopy}</p>
                  )}
                  {c.tags && c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-gray-500 border border-gray-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {c.awardsScore && c.awardsScore > 0 && (
                    <div className="absolute bottom-2 right-2 text-[10px] font-mono text-blue-400/60">
                      {c.awardsScore}
                    </div>
                  )}
                </div>

                {/* Resize handle */}
                <div
                  data-resize
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={e => handleResizeDown(e, item.id)}
                  style={{
                    background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.15) 50%)',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
