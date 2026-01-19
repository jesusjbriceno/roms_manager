import { useState } from 'react';
import { GameDetailsModal } from './GameDetailsModal';

// Types must match App.tsx
interface Game {
  id: string;
  name: string;
  zip: string;
  url: string;
  folder: string;
  imageSrc?: string;
  image?: string;
  description?: string;
}

type GameStatus = 'NOT_INSTALLED' | 'DOWNLOADING' | 'DOWNLOADED' | 'EXTRACTING' | 'EXTRACTED' | 'EXTRACTED_NO_ZIP';

interface LibraryState {
    id: string;
    status: GameStatus;
    lastUpdated: number;
}

interface RomListProps {
  roms: Game[];
  library: Record<string, LibraryState>;
  onDownload: (game: Game) => void;
  onExtract: (game: Game) => void;
  onDelete: (game: Game, deleteZip: boolean, deleteGame: boolean) => void;
  processing: Set<string>;
}

// Icons
const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
);
const UnboxIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
);
const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);
const ZipIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);

export const RomList = ({ roms, library, onDownload, onExtract, onDelete, processing }: RomListProps) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const sortedRoms = [...roms].sort((a, b) => a.name.localeCompare(b.name));

  if (roms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <p className="text-lg font-medium text-gray-400">No ROMs found</p>
      </div>
    );
  }

  const handleScrollToLetter = (letter: string) => {
      const target = sortedRoms.find(g => {
          if (letter === '#') return /^\d/.test(g.name);
          return g.name.toUpperCase().startsWith(letter);
      });
      
      if (target) {
          const el = document.getElementById(`game-${target.id}`);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
        {/* Main Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#181818] custom-scrollbar scroll-smooth">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-4">
                {sortedRoms.map((game) => {
                const status = library[game.id]?.status || 'NOT_INSTALLED';
                const isProcessing = processing.has(game.id);

                // Derived states
                const isDownloaded = status === 'DOWNLOADED';
                const isExtracted = status === 'EXTRACTED';
                const isExtractedNoZip = status === 'EXTRACTED_NO_ZIP';

                return (
                    <div 
                    key={game.id} 
                    id={`game-${game.id}`}
                    className={`
                        group relative flex flex-col p-4 rounded-xl border transition-all duration-200
                        ${isExtracted || isExtractedNoZip
                            ? 'bg-[#1a2e22] border-green-900/30' 
                            : isDownloaded
                                ? 'bg-[#2a2a35] border-blue-900/30'
                                : 'bg-[#252525] border-gray-800 hover:border-gray-600'
                        }
                    `}
                    >
                    {/* Image Cover - Clickable for Modal */}
                    {game.imageSrc && (
                        <div 
                            className="relative w-full h-40 mb-3 overflow-hidden rounded-lg bg-black/20 group-hover:shadow-inner cursor-pointer"
                            onClick={() => setSelectedGame(game)}
                            title="Click for details"
                        >
                            <img 
                                src={game.imageSrc} 
                                alt={game.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => {
                                    console.warn('Image load failed', game.imageSrc);
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            {/* Hover Overlay Hint */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-white text-xs font-bold uppercase tracking-wider border border-white/50 px-2 py-1 rounded-full">View Details</span>
                            </div>
                        </div>
                    )}

                    {/* Header: Title & Status Badge */}
                    <div className="flex justify-between items-start mb-3 gap-2">
                        <button onClick={() => setSelectedGame(game)} className="text-left">
                             <h3 className="font-bold text-gray-100 text-sm leading-tight line-clamp-2 hover:text-blue-400 transition-colors" title={game.name}>
                                {game.name}
                             </h3>
                        </button>
                        
                        {status !== 'NOT_INSTALLED' && (
                            <span 
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border whitespace-nowrap
                                    ${isExtracted || isExtractedNoZip ? 'text-green-400 bg-green-400/10 border-green-400/20' : ''}
                                    ${isDownloaded ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : ''}
                                    ${isProcessing ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' : ''}
                                `}
                            >
                                {isProcessing 
                                    ? (status === 'DOWNLOADING' ? 'DOWNLOADING...' : 'EXTRACTING...') 
                                    : status.replace(/_/g, ' ')
                                }
                            </span>
                        )}
                    </div>

                    {/* Description - Clickable */}
                    {game.description && (
                        <p 
                            className="text-xs text-gray-400 line-clamp-3 mb-4 flex-1 cursor-pointer hover:text-gray-300"
                            onClick={() => setSelectedGame(game)}
                            title="Click for full description"
                        >
                            {game.description}
                        </p>
                    )}

                    {/* Actions Footer */}
                    <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-end gap-2 mt-auto">
                        
                        {/* 1. If Not Installed -> Download */}
                        {status === 'NOT_INSTALLED' && (
                            <button
                                onClick={() => onDownload(game)}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide bg-blue-600 hover:bg-blue-500 text-white shadow-lg w-full justify-center"
                            >
                                <DownloadIcon /> Download Zip
                            </button>
                        )}

                        {/* 2. If Downloaded -> Unzip or Delete */}
                        {status === 'DOWNLOADED' && (
                            <>
                                <button
                                    onClick={() => onDelete(game, true, false)}
                                    disabled={isProcessing}
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete Zip"
                                >
                                    <TrashIcon />
                                </button>
                                <button
                                    onClick={() => onExtract(game)}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex-1 justify-center"
                                >
                                    <UnboxIcon /> Unzip
                                </button>
                            </>
                        )}

                        {/* 3. If Extracted -> Play (Placeholder), Delete Data, Delete Zip */}
                        {(status === 'EXTRACTED' || status === 'EXTRACTED_NO_ZIP') && (
                            <>
                                <button
                                    onClick={() => {
                                        onDelete(game, true, true);
                                    }}
                                    disabled={isProcessing}
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete All Data"
                                >
                                    <TrashIcon />
                                </button>
                                
                                {/* If we have zip, we can delete just zip */}
                                {status === 'EXTRACTED' && (
                                    <button
                                        onClick={() => onDelete(game, true, false)}
                                        disabled={isProcessing}
                                        className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                        title="Delete Zip Only (Keep Game)"
                                    >
                                        <ZipIcon />
                                    </button>
                                )}

                                <div className="flex-1 text-center text-xs font-mono text-gray-500 select-none">
                                    READY
                                </div>
                            </>
                        )}
                    </div>
                    </div>
                );
                })}
            </div>
        </div>
        
        {/* Alphabet Sidebar */}
        <div className="w-6 flex flex-col items-center justify-center bg-[#111] text-[10px] font-bold text-gray-500 select-none z-10 border-l border-white/5 py-4">
            <div className="flex flex-col gap-0.5 h-full justify-center">
                {['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(char => (
                    <button 
                        key={char}
                        onClick={() => handleScrollToLetter(char)}
                        className="hover:text-blue-400 hover:scale-125 transition-all cursor-pointer w-4 text-center"
                    >
                        {char}
                    </button>
                ))}
            </div>
        </div>

        {/* Global Modal */}
        <GameDetailsModal 
            game={selectedGame}
            isOpen={!!selectedGame}
            onClose={() => setSelectedGame(null)}
            status={selectedGame ? (library[selectedGame.id]?.status || 'NOT_INSTALLED') : 'NOT_INSTALLED'}
            isProcessing={selectedGame ? processing.has(selectedGame.id) : false}
            onDownload={onDownload}
            onExtract={onExtract}
            onDelete={onDelete}
        />
    </div>
  );
};
