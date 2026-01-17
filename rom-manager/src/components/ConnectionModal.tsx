import { useState, useEffect } from 'react';

interface ConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
}

interface ConnectionModalProps {
  isOpen: boolean;
  onConnect: (config: ConnectionConfig) => void;
  isLoading: boolean;
  error?: string;
  savedConfig?: Partial<ConnectionConfig>;
}

export const ConnectionModal = ({ isOpen, onConnect, isLoading, error, savedConfig }: ConnectionModalProps) => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (savedConfig) {
      if (savedConfig.host) setHost(savedConfig.host);
      if (savedConfig.port) setPort(savedConfig.port);
      if (savedConfig.username) setUsername(savedConfig.username);
    }
  }, [savedConfig]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect({ host, port, username, password });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-[#2a2a2a] rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Connect to Arcade Machine</h2>
        
        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-100 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Host / IP</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="192.168.1.x"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="22"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="root"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
};
