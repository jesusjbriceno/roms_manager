import fs from 'fs/promises';
import path from 'path';

export interface AppConfig {
  sshHost?: string;
  sshPort?: number;
  sshUser?: string;
  // Password not stored
  targetFolders?: Record<string, string>;
}

export class ConfigService {
  private configPath: string;

  constructor(userDataPath: string) {
    this.configPath = path.join(userDataPath, 'config.json');
  }

  async getConfig(): Promise<AppConfig> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}
