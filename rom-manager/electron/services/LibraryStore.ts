import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

export type GameStatus = 'NOT_INSTALLED' | 'DOWNLOADING' | 'DOWNLOADED' | 'EXTRACTING' | 'EXTRACTED' | 'EXTRACTED_NO_ZIP'

export interface GameState {
  id: string
  status: GameStatus
  lastUpdated: number
}

export interface LibraryData {
  games: Record<string, GameState>
}

export class LibraryStore {
  private path: string
  private data: LibraryData = { games: {} }

  constructor() {
    this.path = path.join(app.getPath('userData'), 'library-store.json')
  }

  async load() {
    try {
      const content = await fs.readFile(this.path, 'utf-8')
      this.data = JSON.parse(content)
      
      // Cleanup stale states
      let changed = false;
      for (const key in this.data.games) {
          const game = this.data.games[key];
          if (game.status === 'DOWNLOADING' || game.status === 'EXTRACTING') {
              game.status = 'NOT_INSTALLED';
              changed = true;
          }
      }
      
      if (changed) {
          await this.save();
      }

    } catch (error) {
      // If file doesn't exist or is invalid, start with empty
      this.data = { games: {} }
    }
  }

  async save() {
    await fs.writeFile(this.path, JSON.stringify(this.data, null, 2))
  }

  getGameStatus(id: string): GameStatus {
    return this.data.games[id]?.status || 'NOT_INSTALLED'
  }

  async updateGameStatus(id: string, status: GameStatus) {
    this.data.games[id] = {
      id,
      status,
      lastUpdated: Date.now()
    }
    await this.save()
  }

  getAllStates(): Record<string, GameState> {
    return this.data.games
  }
}
