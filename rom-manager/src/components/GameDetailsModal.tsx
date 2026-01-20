import { useEffect } from 'react';
import { Game, GameStatus } from '../types';
 
// Note: I need to check if icons are exported from RomList or a separate file. 
// Looking at RomList.tsx, icons seem to be defined locally or imported.
// I will check RomList.tsx content again to see where icons come from.
// They seem to be defined at the bottom of RomList usually or imported.
// Wait, I saw <DownloadIcon /> in RomList.tsx in the context. 
// I'll assume they are available or I might need to move them to a shared file. 
// To be safe and quick, I will define them here as well or export them from a common place.
// Actually, I'll update RomList to export them or move them to `src/components/Icons.tsx` first.
// Let's first create the modal and allow passing these icons or just re-define them for now to avoid refactoring hell.
// Better yet, I'll modify RomList to export them or create a new file `src/components/Icons.tsx`.

// Let's create `src/components/Icons.tsx` first to keep things clean.
// But the user didn't ask for refactoring.
// I'll just check if they are in RomList.tsx and if I can export them.

// STARTING WITH MODAL CODE
// I'll assume I can pass children or just duplicate the SVG code for now to ensure it works immediately without breaking changes elsewhere.




export interface GameDetailsModalProps {
    game: Game | null;
    isOpen: boolean;
    onClose: () => void;
    status: GameStatus;
    isProcessing: boolean;
    onDownload: (game: Game) => void;
    onExtract: (game: Game) => void;
    onDelete: (game: Game, deleteZip: boolean, deleteGame: boolean) => void;
    onCancelDownload: (game: Game) => void;
    downloadProgress: Record<string, number>;
}

const ModalCancelIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);

const ModalDownloadIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
);
const ModalUnboxIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
);
const ModalTrashIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);
const ModalZipIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);


export const GameDetailsModal = ({ 
    game, isOpen, onClose, status, isProcessing,
    onDownload, onExtract, onDelete, onCancelDownload, downloadProgress
}: GameDetailsModalProps) => {
    
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen || !game) return null;

    const isDownloaded = status === 'DOWNLOADED';
    const isExtracted = status === 'EXTRACTED';
    const isExtractedNoZip = status === 'EXTRACTED_NO_ZIP';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-[#1f1f1f] rounded-2xl border border-gray-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
                
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
                >
                    <CloseIcon />
                </button>

                {/* Left: Image */}
                <div className="w-full md:w-2/5 h-64 md:h-auto bg-[#111] relative group">
                     {game.imageSrc ? (
                        <img 
                            src={game.imageSrc} 
                            alt={game.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-4"
                        />
                     ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-600">
                             No Image
                         </div>
                     )}
                </div>

                {/* Right: Info */}
                <div className="flex-1 p-8 flex flex-col overflow-y-auto">
                    
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-3xl font-bold text-white mb-2 leading-tight">{game.name}</h2>
                        
                        <div className="flex items-center gap-3">
                            <span 
                                className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border
                                    ${isExtracted || isExtractedNoZip ? 'text-green-400 bg-green-400/10 border-green-400/20' : ''}
                                    ${isDownloaded ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : ''}
                                    ${status === 'NOT_INSTALLED' ? 'text-gray-400 bg-gray-400/10 border-gray-600' : ''}
                                    ${isProcessing ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' : ''}
                                `}
                            >
                                {isProcessing 
                                    ? (status === 'DOWNLOADING' 
                                        ? `DOWNLOADING ${downloadProgress[game.id] || 0}%` 
                                        : 'EXTRACTING...') 
                                    : status.replace(/_/g, ' ')
                                }
                            </span>
                            <span className="text-gray-500 text-xs font-mono">ID: {game.id}</span>
                            {game.size && (
                                <span className="text-gray-500 text-xs font-mono border-l border-gray-700 pl-3">Size: {game.size}</span>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="prose prose-invert prose-sm max-w-none text-gray-300 mb-8 flex-1">
                        <p className="whitespace-pre-wrap leading-relaxed">
                            {game.description || "No description available."}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="pt-6 border-t border-gray-700/50 mt-auto">
                         <div className="flex flex-wrap gap-4">
                            
                            {/* 1. If Not Installed -> Download */}
                            {status === 'NOT_INSTALLED' && (
                                <button
                                    onClick={() => onDownload(game)}
                                    disabled={isProcessing}
                                    className="flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-bold uppercase tracking-wide bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all hover:scale-[1.02]"
                                >
                                    <ModalDownloadIcon /> 
                                    <span>Download Zip</span>
                                </button>
                            )}
                            
                            {/* 1.5 If Downloading -> Progress and Cancel */}
                            {status === 'DOWNLOADING' && (
                                <div className="flex-1 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-500 transition-all duration-300"
                                                style={{ width: `${downloadProgress[game.id] || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-blue-400 min-w-[3ch]">
                                            {downloadProgress[game.id] || 0}%
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => onCancelDownload(game)}
                                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold uppercase tracking-wide bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all"
                                    >
                                        <ModalCancelIcon />
                                        <span>Cancel Download</span>
                                    </button>
                                </div>
                            )}

                            {/* 2. If Downloaded -> Unzip */}
                            {status === 'DOWNLOADED' && (
                                <button
                                    onClick={() => onExtract(game)}
                                    disabled={isProcessing}
                                    className="flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-bold uppercase tracking-wide bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all hover:scale-[1.02]"
                                >
                                    <ModalUnboxIcon /> 
                                    <span>Unzip / Install</span>
                                </button>
                            )}

                            {/* 3. Delete Actions */}
                            {(status !== 'NOT_INSTALLED') && (
                                <div className="flex gap-2 ml-auto">
                                    {(status === 'EXTRACTED' || status === 'EXTRACTED_NO_ZIP') && (
                                        <button
                                            onClick={() => onDelete(game, true, true)}
                                            disabled={isProcessing}
                                            className="px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all flex items-center gap-2"
                                            title="Delete Everything (Game & Zip)"
                                        >
                                            <ModalTrashIcon />
                                            <span className="hidden sm:inline">Delete Data</span>
                                        </button>
                                    )}

                                    {(status === 'DOWNLOADED' || status === 'EXTRACTED') && (
                                         <button
                                            onClick={() => onDelete(game, true, false)}
                                            disabled={isProcessing}
                                            className="px-4 py-3 rounded-xl bg-[#2a2a2a] text-gray-400 hover:bg-yellow-500/20 hover:text-yellow-400 border border-gray-700 transition-all flex items-center gap-2"
                                            title="Delete Zip Only"
                                         >
                                            <ModalZipIcon />
                                            <span className="hidden sm:inline">Delete Zip</span>
                                         </button>
                                    )}
                                </div>
                            )}

                        </div>
                        
                        {(status === 'EXTRACTED' || status === 'EXTRACTED_NO_ZIP') && (
                             <div className="mt-4 text-center">
                                 <div className="inline-block px-4 py-1 rounded bg-green-500/20 text-green-400 font-mono text-xs border border-green-500/30">
                                     ✓ READY TO PLAY
                                 </div>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
