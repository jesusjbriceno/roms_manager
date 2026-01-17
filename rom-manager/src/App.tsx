import { useState, useEffect } from 'react';
import { ConnectionModal } from './components/ConnectionModal';
import { RomList } from './components/RomList';

interface Rom {
  title: string;
  size: string;
  target: string;
  filename: string;
}

function App() {
  const [sources, setSources] = useState<Record<string, Rom[]>>({});
  const [activeTab, setActiveTab] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [config, setConfig] = useState<any>({});
  const [installedFiles, setInstalledFiles] = useState<Set<string>>(new Set());
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [remoteFolders, setRemoteFolders] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
        try {
            const srcs = await (window as any).ipcRenderer.invoke('app:get-sources');
            setSources(srcs);
            const keys = Object.keys(srcs);
            if (keys.length > 0) setActiveTab(keys[0]);
            
            const cfg = await (window as any).ipcRenderer.invoke('config:get');
            setConfig(cfg);
            if (cfg.targetFolders) setRemoteFolders(cfg.targetFolders);
        } catch (err) {
            console.error(err);
        }
    })();
  }, []);

  useEffect(() => {
      if (!isConnected || !activeTab) return;
      const folder = remoteFolders[activeTab];
      if (!folder) {
          setInstalledFiles(new Set());
          return; 
      }
      
      loadInstalledFiles(folder);
  }, [isConnected, activeTab, remoteFolders]);

  const loadInstalledFiles = async (folder: string) => {
      try {
          const files = await (window as any).ipcRenderer.invoke('ssh:list-files', folder);
          setInstalledFiles(new Set(files));
      } catch (e) {
          console.error(e);
          setInstalledFiles(new Set());
      }
  };

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

  const handleDownload = async (rom: Rom) => {
      if (!remoteFolders[activeTab]) {
          alert('Please set a destination folder for this emulator first.');
          return;
      }
      setDownloadingFiles(prev => new Set(prev).add(rom.filename));
      try {
          // Hardcoded base URL for now as per analysis of target paths
          const baseUrl = 'https://archive.org';
          await (window as any).ipcRenderer.invoke('ssh:download', {
              baseUrl,
              resourcePath: rom.target,
              destinationFolder: remoteFolders[activeTab],
              fileName: rom.filename
          });
          loadInstalledFiles(remoteFolders[activeTab]);
      } catch (e) {
          console.error(e);
          alert('Download failed');
      } finally {
          setDownloadingFiles(prev => {
              const next = new Set(prev);
              next.delete(rom.filename);
              return next;
          });
      }
  };

  const handleDelete = async (rom: Rom) => {
       if (!confirm('Delete ' + rom.filename + '?')) return;
       try {
           await (window as any).ipcRenderer.invoke('ssh:delete', {
               folder: remoteFolders[activeTab],
               fileName: rom.filename
           });
           loadInstalledFiles(remoteFolders[activeTab]);
       } catch (e) {
           alert('Delete failed');
       }
  };

  const updateRemoteFolder = (folder: string) => {
      const newFolders = { ...remoteFolders, [activeTab]: folder };
      setRemoteFolders(newFolders);
      const newConfig = { ...config, targetFolders: newFolders };
      setConfig(newConfig);
      (window as any).ipcRenderer.invoke('config:save', newConfig);
  };

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
                {Object.keys(sources).map(key => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`w-full text-left px-3 py-2 rounded mb-1 text-sm transition-colors ${activeTab === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#333]'}`}
                    >
                        {key.replace('_roms', '').toUpperCase().replace(/_/g, ' ')}
                        <span className="float-right text-xs opacity-50 bg-black/20 px-1.5 rounded-full">{sources[key]?.length}</span>
                    </button>
                ))}
            </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
            {activeTab ? (
                <>
                   <div className="p-4 border-b border-gray-700 bg-[#2a2a2a] flex items-center gap-4 shadow-sm z-10">
                       <h2 className="text-lg font-semibold">{activeTab.replace('_roms', '').toUpperCase().replace(/_/g, ' ')}</h2>
                       <div className="flex-1 flex items-center gap-2 ml-4">
                           <label className="text-xs text-gray-400 whitespace-nowrap">Remote Folder:</label>
                           <input 
                              type="text" 
                              value={remoteFolders[activeTab] || ''}
                              onChange={(e) => updateRemoteFolder(e.target.value)}
                              className="bg-[#1a1a1a] border border-gray-600 rounded px-3 py-1.5 text-sm flex-1 text-gray-300 focus:border-blue-500 outline-none transition-colors max-w-lg"
                              placeholder="/home/user/roms/..."
                            />
                       </div>
                   </div>
                   
                   <RomList 
                      roms={sources[activeTab] || []}
                      installedFiles={installedFiles}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                      downloadingFiles={downloadingFiles}
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
