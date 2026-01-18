import { useMemo } from 'react';

interface Rom {
  title: string;
  size: string;
  target: string;
  filename: string;
}

interface RomListProps {
  roms: Rom[];
  installedFiles: Set<string>;
  onDownload: (rom: Rom) => void;
  onDelete: (rom: Rom) => void;
  downloadingFiles: Set<string>;
}

// Icons
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export const RomList = ({ roms, installedFiles, onDownload, onDelete, downloadingFiles }: RomListProps) => {
  const sortedRoms = useMemo(() => {
    return [...roms].sort((a, b) => a.title.localeCompare(b.title));
  }, [roms]);

  if (roms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
        </div>
        <p className="text-lg font-medium text-gray-400">No ROMs found</p>
        <p className="text-sm text-gray-600">This emulator list seems to be empty.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#181818] custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedRoms.map((rom) => {
          const isInstalled = installedFiles.has(rom.filename);
          const isDownloading = downloadingFiles.has(rom.filename);

          return (
            <div 
              key={rom.title} 
              className={`
                group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200
                ${isInstalled 
                    ? 'bg-[#1a2e22] border-green-900/30 hover:border-green-700/50' 
                    : 'bg-[#252525] border-gray-800 hover:border-gray-600 hover:shadow-lg hover:shadow-black/50 hover:-translate-y-0.5'
                }
              `}
            >
              <div className="flex justify-between items-start mb-3">
                 <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-gray-400 font-bold text-xs border border-white/5">
                    {rom.filename.slice(0, 3).toUpperCase()}
                 </div>
                 {isInstalled ? (
                     <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-400/10 px-2 py-1 rounded-full border border-green-400/20">
                        <CheckIcon /> Installed
                     </span>
                 ) : (
                     <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-500/10 px-2 py-1 rounded-full border border-gray-500/20">
                        {isDownloading ? 'Downloading...' : 'Not Installed'}
                     </span>
                 )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-100 text-sm leading-tight mb-2 line-clamp-2 min-h-[2.5rem]" title={rom.title}>
                    {rom.title.replace('.zip', '')}
                </h3>
                <div className="flex items-center text-xs text-gray-500 font-mono">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 opacity-70">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {rom.size}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                 {isInstalled && (
                    <button
                        onClick={() => onDelete(rom)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete ROM"
                    >
                        <TrashIcon />
                    </button>
                 )}
                 
                 {!isInstalled && (
                     <button
                        onClick={() => onDownload(rom)}
                        disabled={isDownloading}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all w-full justify-center
                            ${isDownloading 
                                ? 'bg-yellow-500/10 text-yellow-500 cursor-wait border border-yellow-500/20' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30'
                            }
                        `}
                     >
                        {isDownloading ? (
                            <>
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                Downloading
                            </>
                        ) : (
                            <>
                                <DownloadIcon />
                                Download
                            </>
                        )}
                     </button>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
