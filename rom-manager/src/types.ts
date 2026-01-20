export interface Game {
  id: string;
  name: string;
  zip: string;
  url: string;
  folder: string; // The specific folder name for the game (extracted)
  imageSrc?: string;
  image?: string;
  description?: string;
  size?: string;
}

// Library Status from Electron
export type GameStatus = 'NOT_INSTALLED' | 'DOWNLOADING' | 'DOWNLOADED' | 'EXTRACTING' | 'EXTRACTED' | 'EXTRACTED_NO_ZIP';

export interface LibraryState {
    id: string;
    status: GameStatus;
    lastUpdated: number;
}
