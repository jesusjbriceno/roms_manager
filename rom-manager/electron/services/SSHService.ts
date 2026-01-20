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

  private activeCommands: Map<string, any> = new Map();

  cancelCommand(id: string) {
    const stream = this.activeCommands.get(id);
    if (stream) {
        // stream is a Channel, we can close it or signal it.
        // Sending a signal might be more effective to kill the process tree.
        stream.stderr.removeAllListeners();
        stream.removeAllListeners();
        try {
            stream.signal('KILL');
            stream.close(); 
        } catch (e) {
            console.error('Error cancelling stream', e);
        }
        this.activeCommands.delete(id);
    }
  }

  async exec(command: string): Promise<string> {
    if (!this.isConnected) return Promise.reject(new Error('Not connected'));
    
    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) return reject(err);
        
        // ... (rest of exec is fine, but maybe I want to reuse logic? keeping separate for now to avoid breaking changes)
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
  
  // New method for streaming download
  async downloadStream(
    id: string,
    baseUrl: string, 
    resourcePath: string, 
    destinationFolder: string, 
    fileName: string,
    onProgress: (percentage: number) => void
  ): Promise<void> {
    const fullUrl = `${baseUrl}${resourcePath}`;
    const destinationPath = `${destinationFolder}/${fileName}`;
    
    // Use --progress=dot to ensure we get output we can parse easily, or standard bar
    // wget default bar is printed to stderr.
    // We'll use default and regex for "[ 12%]" or similar.
    // Actually, force basic parsing.
    const command = `mkdir -p "${destinationFolder}" && wget -c "${fullUrl}" -O "${destinationPath}"`;
    
    return new Promise((resolve, reject) => {
        if (!this.isConnected) return reject(new Error('Not connected'));

        this.client.exec(command, (err, stream) => {
            if (err) return reject(err);

            this.activeCommands.set(id, stream);

            let errorOutput = '';

            stream.on('close', (code: number, signal: string) => {
                this.activeCommands.delete(id);
                if (code === 0) {
                    resolve();
                } else if (signal === 'KILL') {
                    reject(new Error('Cancelled'));
                } else {
                    reject(new Error(errorOutput || `Download failed with code ${code}`));
                }
            });

            // wget writes progress to stderr
            stream.stderr.on('data', (data: Buffer) => {
                const text = data.toString();
                errorOutput += text; // keep for error reporting
                
                // Regex for standard wget specific percentage:  58% 
                const match = text.match(/(\d+)%/);
                if (match) {
                    const percent = parseInt(match[1], 10);
                    onProgress(percent);
                }
            });
            
            stream.on('data', (data: Buffer) => {
                // Stdout usage
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

  async deleteFile(path: string): Promise<void> {
    await this.exec(`rm -f "${path}"`);
  }

  async extract(zipPath: string, destinationFolder: string): Promise<void> {
    // Ensure destination exists
    await this.exec(`mkdir -p "${destinationFolder}"`);
    // Unzip forcing overwrite (-o)
    await this.exec(`unzip -o "${zipPath}" -d "${destinationFolder}"`);
  }

  async checkExists(path: string): Promise<boolean> {
      try {
          // [ -e path ] returns 0 if exists
          await this.exec(`[ -e "${path}" ]`);
          return true;
      } catch {
          return false;
      }
  }
}
