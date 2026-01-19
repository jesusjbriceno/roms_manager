import { useState, useEffect } from 'react';
import { ConnectionModal } from './components/ConnectionModal';
import { RomList } from './components/RomList';

// Types matching the new JSON structure
interface Game {
  id: string;
  name: string;
  zip: string;
  url: string;
  folder: string; // The specific folder name for the game (extracted)
  imageSrc?: string;
  image?: string;
  description?: string;
}

interface EmulatorSource {
  basePath: string;
  zipPath: string;
  games: Game[];
}

// Library Status from Electron
type GameStatus = 'NOT_INSTALLED' | 'DOWNLOADING' | 'DOWNLOADED' | 'EXTRACTING' | 'EXTRACTED' | 'EXTRACTED_NO_ZIP';

interface LibraryState {
    id: string;
    status: GameStatus;
    lastUpdated: number;
}

function App() {
  const [sources, setSources] = useState<Record<string, EmulatorSource>>({});
  const [activeTab, setActiveTab] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [config, setConfig] = useState<any>({});
  
  // Library state (from persistent store)
  const [library, setLibrary] = useState<Record<string, LibraryState>>({});
  
  // Temporary state for UI loading feedbacks
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
        try {
            const srcs = await (window as any).ipcRenderer.invoke('app:get-sources');
            setSources(srcs);
            const keys = Object.keys(srcs);
            if (keys.length > 0) setActiveTab(keys[0]);
            
            const cfg = await (window as any).ipcRenderer.invoke('config:get');
            setConfig(cfg);
            
            // Load library state
            const lib = await (window as any).ipcRenderer.invoke('library:get-all');
            setLibrary(lib.games || lib);
        } catch (err) {
            console.error('Failed to init', err);
        }
    })();
  }, []);

  const refreshLibrary = async () => {
      const lib = await (window as any).ipcRenderer.invoke('library:get-all');
      setLibrary(lib.games || lib);
  }

  // Update a single game status
  const updateStatus = async (id: string, status: GameStatus) => {
      await (window as any).ipcRenderer.invoke('library:update-status', { id, status });
      await refreshLibrary();
  }

  const handleConnect = async (connConfig: any) => {
      setIsConnecting(true);
      setConnectError('');
      try {
          const res = await (window as any).ipcRenderer.invoke('ssh:connect', connConfig);
          if (res.success) {
              setIsConnected(true);
              setIsModalOpen(false);
              const newConfig = { ...config, sshHost: connConfig.host, sshPort: connConfig.port, sshUser: connConfig.username };
              setConfig(newConfig);
              await (window as any).ipcRenderer.invoke('config:save', newConfig);
          } else {
              setConnectError(res.error || 'Connection failed');
          }
      } catch (e: any) {
          setConnectError(e.message || 'Connection error');
      } finally {
          setIsConnecting(false);
      }
  };

  const handleDownload = async (game: Game) => {
      const source = sources[activeTab];
      if (!source) return;

      setProcessing(prev => new Set(prev).add(game.id));
      await updateStatus(game.id, 'DOWNLOADING');

      try {
          // Use 'https://archive.org' as base if url starts with /
          const baseUrl = game.url.startsWith('http') ? '' : 'https://archive.org';
          
          await (window as any).ipcRenderer.invoke('ssh:download', {
              baseUrl,
              resourcePath: game.url,
              destinationFolder: source.zipPath,
              fileName: game.zip
          });

          await updateStatus(game.id, 'DOWNLOADED');
      } catch (e) {
          console.error(e);
          alert('Download failed');
          await updateStatus(game.id, 'NOT_INSTALLED');
      } finally {
          setProcessing(prev => {
              const next = new Set(prev);
              next.delete(game.id);
              return next;
          });
      }
  };

  const handleExtract = async (game: Game) => {
      const source = sources[activeTab];
      if (!source) return;

      setProcessing(prev => new Set(prev).add(game.id));
      await updateStatus(game.id, 'EXTRACTING');

      try {
          const zipFullPath = `${source.zipPath}/${game.zip}`;
          // Extract to basePath (e.g. /data/games/scummvm)
          // The game usually has its own internal folder structure or we might need to handle it?
          // Looking at the JSON, "folder" field suggests the game name. 
          // If the zip contains the folder, we extract to basePath.
          // If the zip contains loose files, we might strictly need to extract to basePath/game.folder
          // For now, let's assume valid romsets usually have the folder inside, but let's be safe:
          // We will extract to basePath.
          
          await (window as any).ipcRenderer.invoke('ssh:extract', {
              zipPath: zipFullPath,
              destinationFolder: source.basePath
          });

          await updateStatus(game.id, 'EXTRACTED');
      } catch (e) {
          console.error(e);
          alert('Extraction failed');
          // Revert to downloaded if extract failed
          await updateStatus(game.id, 'DOWNLOADED');
      } finally {
          setProcessing(prev => {
              const next = new Set(prev);
              next.delete(game.id);
              return next;
          });
      }
  };

  const handleDeleteData = async (game: Game, deleteZip: boolean, deleteGame: boolean) => {
      if (!confirm(`Are you sure you want to delete data for ${game.name}?`)) return;
      const source = sources[activeTab];
      if (!source) return;

      setProcessing(prev => new Set(prev).add(game.id));

      try {
          if (deleteZip) {
              const zipFullPath = `${source.zipPath}/${game.zip}`;
              await (window as any).ipcRenderer.invoke('ssh:delete', { path: zipFullPath });
          }

          if (deleteGame) {
              // Be careful with recursive delete!
              const gameFullPath = `${source.basePath}/${game.folder}`;
              if (game.folder && game.folder.length > 2) { // Safety check
                  await (window as any).ipcRenderer.invoke('ssh:delete', { path: gameFullPath });
                  // Also delete .scummvm file if it exists? 
                  // Usually scummvm games might be just a folder.
              }
          }

          // Determine new status
          // If we deleted everything -> NOT_INSTALLED
          // If we deleted Zip but kept Game -> EXTRACTED_NO_ZIP
          // If we deleted Game but kept Zip -> DOWNLOADED
          
          let newStatus: GameStatus = 'NOT_INSTALLED';
          
          const currentStatus = library[game.id]?.status;

          if (deleteZip && deleteGame) {
              newStatus = 'NOT_INSTALLED';
          } else if (deleteZip && !deleteGame) {
              newStatus = 'EXTRACTED_NO_ZIP';
          } else if (!deleteZip && deleteGame) {
              newStatus = 'DOWNLOADED';
          }

          await updateStatus(game.id, newStatus);

      } catch (e) {
          console.error(e);
          alert('Delete failed');
      } finally {
          setProcessing(prev => {
              const next = new Set(prev);
              next.delete(game.id);
              return next;
          });
      }
  };

  // Helper to sync status (check if files actually exist)
  // This could be heavy, so maybe only run on demand or specific button?
  const handleSyncForTab = async () => {
      const source = sources[activeTab];
      if (!source || !isConnected) return;
      
      setProcessing(prev => new Set(prev).add('SYNC'));
      
      try {
        // 1. List Zips
        const zips = await (window as any).ipcRenderer.invoke('ssh:list-files', source.zipPath);
        const zipSet = new Set(zips);

        // 2. List Game Folders
        const folders = await (window as any).ipcRenderer.invoke('ssh:list-files', source.basePath);
        const folderSet = new Set(folders);

        // 3. Update Statuses
        for (const game of source.games) {
            const hasZip = zipSet.has(game.zip);
            const hasFolder = folderSet.has(game.folder);

            let status: GameStatus = 'NOT_INSTALLED';
            if (hasFolder && hasZip) status = 'EXTRACTED';
            else if (hasFolder && !hasZip) status = 'EXTRACTED_NO_ZIP';
            else if (!hasFolder && hasZip) status = 'DOWNLOADED';
            
            // Only update if changed
            if (library[game.id]?.status !== status) {
                await (window as any).ipcRenderer.invoke('library:update-status', { id: game.id, status });
            }
        }
        await refreshLibrary();
         
      } catch (e) {
          console.error(e);
      } finally {
           setProcessing(prev => {
              const next = new Set(prev);
              next.delete('SYNC');
              return next;
          });
      }
  }

  return (
    <div className="flex h-screen bg-[#242424] text-white overflow-hidden font-sans">
        {/* Sidebar */}
        <div className="w-64 bg-[#1a1a1a] flex flex-col border-r border-gray-800">
            <div className="p-4 border-b border-gray-800">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">RetroManager</h1>
                <div className="mt-2 text-xs flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    {isConnected ? 'Connected' : 'Disconnected'}
                    {!isConnected && <button onClick={() => setIsModalOpen(true)} className="underline ml-auto text-gray-400 hover:text-white">Connect</button>}
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
                {Object.keys(sources).map(key => {
                    const games = sources[key]?.games || [];
                    
                    // Calculate stats from library state
                    let zipCount = 0;
                    let extractedCount = 0;
                    
                    games.forEach(g => {
                        const status = library[g.id]?.status || 'NOT_INSTALLED';
                        if (status === 'DOWNLOADED' || status === 'EXTRACTED' || status === 'DOWNLOADING' || status === 'EXTRACTING') {
                            zipCount++;
                        }
                        if (status === 'EXTRACTED' || status === 'EXTRACTED_NO_ZIP') {
                            extractedCount++;
                        }
                    });

                    return (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`w-full text-left px-3 py-3 rounded mb-2 text-sm transition-all group border border-transparent 
                                ${activeTab === key 
                                    ? 'bg-blue-600 border-blue-400/50 shadow-md' 
                                    : 'text-gray-400 hover:bg-[#252525] hover:border-gray-700'
                                }`}
                        >
                            <div className={`font-bold mb-1.5 ${activeTab === key ? 'text-white' : 'text-gray-300'}`}>
                                {key.replace('_roms', '').toUpperCase().replace(/_/g, ' ')}
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs opacity-90">
                                {/* Total Games */}
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${activeTab === key ? 'bg-black/30' : 'bg-[#333]'}`}>
                                    <span className="text-sm">🎮</span>
                                    <span>{games.length}</span>
                                </div>
                                
                                {/* Downloaded (Zips) */}
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${activeTab === key ? 'bg-blue-900/50 text-blue-100' : 'bg-blue-900/20 text-blue-400'}`}>
                                    <span className="text-sm">📦</span>
                                    <span>{zipCount}</span>
                                </div>

                                {/* Extracted (Folders) */}
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${activeTab === key ? 'bg-green-900/50 text-green-100' : 'bg-green-900/20 text-green-400'}`}>
                                    <span className="text-sm">📂</span>
                                    <span>{extractedCount}</span>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
            {activeTab && sources[activeTab] ? (
                <>
                   <div className="p-4 border-b border-gray-700 bg-[#2a2a2a] flex items-center justify-between shadow-sm z-10">
                       <h2 className="text-lg font-semibold">{activeTab.replace('_roms', '').toUpperCase().replace(/_/g, ' ')}</h2>
                       <div className="flex items-center gap-4">
                            <div className="text-xs text-gray-400">
                                Path: <span className="text-gray-200 font-mono bg-black/20 px-1 rounded">{sources[activeTab].basePath}</span>
                            </div>
                            <button 
                                onClick={handleSyncForTab}
                                disabled={processing.has('SYNC') || !isConnected}
                                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                                {processing.has('SYNC') ? 'Syncing...' : 'Sync Status'}
                            </button>
                       </div>
                   </div>
                   
                   <RomList 
                      roms={sources[activeTab].games || []}
                      library={library}
                      onDownload={handleDownload}
                      onExtract={handleExtract}
                      onDelete={handleDeleteData}
                      processing={processing}
                   />
                </>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    Select an emulator to browse ROMs
                </div>
            )}
        </div>

        <ConnectionModal
            isOpen={isModalOpen}
            onConnect={handleConnect}
            isLoading={isConnecting}
            error={connectError}
            savedConfig={config}
        />
    </div>
  )
}

export default App;
