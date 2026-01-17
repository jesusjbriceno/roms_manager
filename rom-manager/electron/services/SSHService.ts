import { Client, ConnectConfig } from 'ssh2';

export class SSHService {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Client();
  }

  connect(config: ConnectConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create a new client instance for each connection to avoid reuse issues
      this.client = new Client();
      
      this.client
        .on('ready', () => {
          this.isConnected = true;
          resolve();
        })
        .on('error', (err) => {
          this.isConnected = false;
          reject(err);
        })
        .on('end', () => {
          this.isConnected = false;
        })
        .connect(config);
    });
  }

  disconnect() {
    if (this.isConnected) {
      this.client.end();
      this.isConnected = false;
    }
  }

  exec(command: string): Promise<string> {
    if (!this.isConnected) return Promise.reject(new Error('Not connected'));
    
    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) return reject(err);
        
        let output = '';
        let errorOutput = '';

        stream.on('close', (code: number) => {
          if (code === 0) {
            resolve(output);
          } else {
            console.error('Command failed:', command, errorOutput);
            reject(new Error(errorOutput || `Command failed with code ${code}`));
          }
        })
        .on('data', (data: Buffer) => {
          output += data.toString();
        })
        .stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });
      });
    });
  }

  async listFiles(folder: string): Promise<string[]> {
    try {
      // ls -1 returns one file per line
      const output = await this.exec(`ls -1 "${folder}"`);
      return output.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    } catch (error) {
      // If folder doesn't exist or empty, return empty array (or handle error)
      return [];
    }
  }

  async download(baseUrl: string, resourcePath: string, destinationFolder: string, fileName: string): Promise<void> {
    const fullUrl = `${baseUrl}${resourcePath}`;
    const destinationPath = `${destinationFolder}/${fileName}`;
    
    // Create directory if not exists, then wget
    // -c: continue getting a partially-downloaded file
    // -O: output document file
    await this.exec(`mkdir -p "${destinationFolder}" && wget -c "${fullUrl}" -O "${destinationPath}"`);
  }

  async deleteFile(folder: string, fileName: string): Promise<void> {
    const path = `${folder}/${fileName}`;
    await this.exec(`rm -f "${path}"`);
  }
}
