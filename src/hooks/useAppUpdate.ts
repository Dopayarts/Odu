import { useState, useEffect, useCallback } from 'react';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

interface UpdateState {
  status: UpdateStatus;
  version: string | null;
  progress: number;
  error: string | null;
}

interface ElectronUpdaterAPI {
  onUpdateAvailable: (cb: (info: { version: string }) => void) => void;
  onDownloadProgress: (cb: (progress: { percent: number }) => void) => void;
  onUpdateDownloaded: (cb: (info: { version: string }) => void) => void;
  onUpdateError: (cb: (error: string) => void) => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

declare global {
  interface Window {
    electronUpdater?: ElectronUpdaterAPI;
  }
}

export function useAppUpdate() {
  const [state, setState] = useState<UpdateState>({
    status: 'idle',
    version: null,
    progress: 0,
    error: null,
  });

  useEffect(() => {
    const api = window.electronUpdater;
    if (!api) return;

    api.onUpdateAvailable((info) => {
      setState({ status: 'available', version: info.version, progress: 0, error: null });
    });

    api.onDownloadProgress((progress) => {
      setState((prev) => ({ ...prev, status: 'downloading', progress: Math.round(progress.percent) }));
    });

    api.onUpdateDownloaded((info) => {
      setState({ status: 'downloaded', version: info.version, progress: 100, error: null });
    });

    api.onUpdateError((error) => {
      setState((prev) => ({ ...prev, status: 'error', error }));
    });
  }, []);

  const checkForUpdates = useCallback(() => {
    const api = window.electronUpdater;
    if (!api) return;
    setState((prev) => ({ ...prev, status: 'checking', error: null }));
    api.checkForUpdates();
  }, []);

  const downloadUpdate = useCallback(() => {
    const api = window.electronUpdater;
    if (!api) return;
    setState((prev) => ({ ...prev, status: 'downloading', progress: 0 }));
    api.downloadUpdate();
  }, []);

  const installUpdate = useCallback(() => {
    const api = window.electronUpdater;
    if (!api) return;
    api.installUpdate();
  }, []);

  return {
    ...state,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  };
}
