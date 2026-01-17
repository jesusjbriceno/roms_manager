import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigService } from './ConfigService';
import fs from 'fs/promises';
import path from 'path';

vi.mock('fs/promises');

describe('ConfigService', () => {
    const userDataPath = '/tmp/userdata';
    const configPath = path.join(userDataPath, 'config.json');
    let service: ConfigService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new ConfigService(userDataPath);
    });

    it('should load configuration successfully', async () => {
        const mockConfig = { sshHost: '192.168.1.100' };
        (fs.readFile as any).mockResolvedValue(JSON.stringify(mockConfig));

        const config = await service.getConfig();
        expect(config).toEqual(mockConfig);
        expect(fs.readFile).toHaveBeenCalledWith(configPath, 'utf-8');
    });

    it('should return empty object on load failure', async () => {
        (fs.readFile as any).mockRejectedValue(new Error('File not found'));

        const config = await service.getConfig();
        expect(config).toEqual({});
    });

    it('should save configuration successfully', async () => {
        const mockConfig = { sshHost: '192.168.1.101', sshUser: 'pi' };
        
        await service.saveConfig(mockConfig);
        
        expect(fs.writeFile).toHaveBeenCalledWith(
            configPath, 
            JSON.stringify(mockConfig, null, 2), 
            'utf-8'
        );
    });
});
