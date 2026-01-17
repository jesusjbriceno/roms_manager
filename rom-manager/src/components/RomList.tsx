import { useMemo } from 'react';

interface Rom {
  title: string;
  size: string;
  target: string; // The URL part
  filename: string;
}

interface RomListProps {
  roms: Rom[];
  installedFiles: Set<string>; // Set of filenames
  onDownload: (rom: Rom) => void;
  onDelete: (rom: Rom) => void;
  downloadingFiles: Set<string>; // Set of filenames currently downloading
}

export const RomList = ({ roms, installedFiles, onDownload, onDelete, downloadingFiles }: RomListProps) => {
  const sortedRoms = useMemo(() => {
    return [...roms].sort((a, b) => a.title.localeCompare(b.title));
  }, [roms]);

  if (roms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <p className="text-lg">No ROMs found for this emulator.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedRoms.map((rom) => {
          const isInstalled = installedFiles.has(rom.filename);
          const isDownloading = downloadingFiles.has(rom.filename);

          return (
            <div 
              key={rom.title} 
              className={`bg-[#1e1e1e] p-4 rounded-lg border flex flex-col justify-between group hover:border-blue-500/50 transition-all ${isInstalled ? 'border-green-800/50' : 'border-gray-800'}`}
            >
              <div>
                <h3 className="font-medium text-white mb-1 truncate" title={rom.title}>{rom.title}</h3>
                <span className="text-xs text-gray-500 inline-block bg-[#111] px-2 py-0.5 rounded border border-gray-800">
                  {rom.size}
                </span>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isInstalled ? 'bg-green-500' : isDownloading ? 'bg-yellow-500 animate-pulse' : 'bg-gray-600'}`}></div>
                  <span className={`text-xs ${isInstalled ? 'text-green-500' : isDownloading ? 'text-yellow-500' : 'text-gray-500'}`}>
                    {isInstalled ? 'Installed' : isDownloading ? 'Downloading...' : 'Not Installed'}
                  </span>
                </div>

                <div className="flex gap-2">
                   {isInstalled && (
                    <button
                      onClick={() => onDelete(rom)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2 rounded transition-colors text-xs"
                      title="Delete from device"
                    >
                      Delete
                    </button>
                  )}
                  {(!isInstalled || isInstalled) && ( 
                      // Allow re-download? Or just hide if installed? 
                      // User said: "comprobar si se encuentra ya descargado y si lo está, dar la posibilidad de eliminarlo."
                      // Implicitly, if not installed, give possibility to download.
                      !isInstalled && (
                        <button
                          onClick={() => onDownload(rom)}
                          disabled={isDownloading}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                            isDownloading 
                              ? 'bg-yellow-600/20 text-yellow-500 cursor-wait' 
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                          }`}
                        >
                          {isDownloading ? 'Wait' : 'Download'}
                        </button>
                      )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
