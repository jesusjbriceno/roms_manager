import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSHService } from './SSHService';

// 1. Define the mock client methods
const mockConnect = vi.fn();
const mockEnd = vi.fn();
const mockExec = vi.fn();
const mockOn = vi.fn().mockReturnThis();

// 2. Mock 'ssh2' module using a class so `new Client()` works naturally
vi.mock('ssh2', () => {
  return {
    Client: class MockClient {
      connect = mockConnect;
      end = mockEnd;
      exec = mockExec;
      on = mockOn;
    }
  };
});

describe('SSHService', () => {
    let service: SSHService;
    let eventHandlers: Record<string, Function> = {};

    beforeEach(() => {
        vi.clearAllMocks();
        eventHandlers = {};

        // 3. Setup the 'on' handler to capture callbacks
        mockOn.mockImplementation((event, callback) => {
            eventHandlers[event] = callback;
            return { on: mockOn, connect: mockConnect, end: mockEnd, exec: mockExec }; // Allow chaining
        });
        
        service = new SSHService();
    });

    it('should connect successfully', async () => {
        // Trigger connection
        const connectPromise = service.connect({ host: 'localhost' });
        
        // Simulate 'ready' event
        if (eventHandlers['ready']) {
            eventHandlers['ready']();
        }

        await connectPromise;
        
        expect(mockConnect).toHaveBeenCalledWith({ host: 'localhost' });
    });

    it('should handle connection errors', async () => {
        const connectPromise = service.connect({ host: 'badhost' });

        // Simulate 'error' event
        if (eventHandlers['error']) {
            eventHandlers['error'](new Error('Connection refused'));
        }

        await expect(connectPromise).rejects.toThrow('Connection refused');
    });

    it('should list files', async () => {
        // 1. Connect first
        const connectPromise = service.connect({});
        if (eventHandlers['ready']) eventHandlers['ready']();
        await connectPromise;

        // 2. Mock exec behavior
        mockExec.mockImplementation((cmd, callback) => {
            const handlers: Record<string, Function> = {};
            const stream = {
                on: vi.fn().mockImplementation((event, cb) => {
                    handlers[event] = cb;
                    return stream;
                }),
                stderr: {
                    on: vi.fn()
                }
            };
            
            callback(null, stream);
            
            // Emit events asynchronously to allow listeners to be attached
            setTimeout(() => {
                if (handlers['data']) handlers['data'](Buffer.from('file1.zip\nfile2.zip\n'));
                if (handlers['close']) handlers['close'](0);
            }, 10);
        });

        const files = await service.listFiles('/roms');
        
        expect(files).toEqual(['file1.zip', 'file2.zip']);
        expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('ls -1'), expect.any(Function));
    });
});
