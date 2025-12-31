export interface ElectronAPI {
  openFile: (options?: any) => Promise<{ path: string; name: string; size: number } | null>;
  openDirectory: () => Promise<{ path: string; name: string; files: string[]; pmxFiles: string[] } | null>;
  isElectron: boolean;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}
