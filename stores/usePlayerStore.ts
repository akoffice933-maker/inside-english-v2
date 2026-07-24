import { create } from 'zustand';

// Interfaces based on Inside English v2.0 Architecture
export interface Token {
  id: number;
  start: number;
  end: number;
  russian: string;
  english: string;
  mixed: string;
}

export interface Track {
  id: string;
  title: string;
  description: string;
  type: 'mindtrack' | 'hypno';
  level: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  state: 'relax' | 'energy' | 'sleep';
  audio_url: string;
  duration: number;
  cover_gradient: string;
  is_premium: boolean;
  tokens: Token[];
}

interface PlayerState {
  // Playback State
  activeTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  languageMode: 'russian' | 'mixed' | 'english';
  
  // Audio Element Ref (maintained globally for background play & page persistent state)
  audio: HTMLAudioElement | null;
  
  // UI Panels
  shadowingOpen: boolean;
  isRecordingShadowing: boolean;

  // Actions / Methods
  setTrack: (track: Track) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  seek: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setLanguageMode: (mode: 'russian' | 'mixed' | 'english') => void;
  toggleShadowing: () => void;
  setRecordingShadowing: (isRecording: boolean) => void;
  
  // API Syncing
  syncProgressToServer: () => Promise<void>;
  lastSyncedTime: number; // Prevent spamming backend API
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  
  // Helper to initialize HTML5 Audio on the client side safely
  const getOrInitAudio = (url: string) => {
    if (typeof window === 'undefined') return null;
    
    const { audio } = get();
    if (audio) {
      audio.pause();
      audio.src = url;
      audio.load();
      return audio;
    }

    const newAudio = new Audio(url);
    
    // Wire up native audio events to update Zustand state
    newAudio.addEventListener('timeupdate', () => {
      const current = newAudio.currentTime;
      set({ currentTime: current });
      
      // Throttle server sync: sync progress every 10 seconds of active playback
      const { lastSyncedTime, activeTrack } = get();
      if (activeTrack && Math.abs(current - lastSyncedTime) >= 10) {
        get().syncProgressToServer();
      }
    });

    newAudio.addEventListener('durationchange', () => {
      set({ duration: newAudio.duration });
    });

    newAudio.addEventListener('ended', () => {
      set({ isPlaying: false });
      get().syncProgressToServer(); // Sync final completed state
    });

    return newAudio;
  };

  return {
    // Initial State Values
    activeTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    languageMode: 'mixed',
    audio: null,
    shadowingOpen: false,
    isRecordingShadowing: false,
    lastSyncedTime: 0,

    // Core Controls
    setTrack: (track: Track) => {
      const audioEl = getOrInitAudio(track.audio_url);
      
      if (audioEl) {
        audioEl.playbackRate = get().playbackRate;
      }

      set({
        activeTrack: track,
        currentTime: 0,
        duration: track.duration || 0,
        isPlaying: false,
        audio: audioEl,
        lastSyncedTime: 0
      });

      // Automatically play if user initiates from a click
      get().play();
    },

    play: () => {
      const { audio, isPlaying } = get();
      if (audio && !isPlaying) {
        audio.play()
          .then(() => set({ isPlaying: true }))
          .catch((err) => console.warn("Media playback blocked by browser. User gesture required first.", err));
      }
    },

    pause: () => {
      const { audio, isPlaying } = get();
      if (audio && isPlaying) {
        audio.pause();
        set({ isPlaying: false });
        // Sync progress when user pauses
        get().syncProgressToServer();
      }
    },

    togglePlay: () => {
      const { isPlaying } = get();
      if (isPlaying) {
        get().pause();
      } else {
        get().play();
      }
    },

    setCurrentTime: (time: number) => {
      set({ currentTime: time });
    },

    seek: (seconds: number) => {
      const { audio, duration } = get();
      if (audio) {
        const newTime = Math.min(duration, Math.max(0, seconds));
        audio.currentTime = newTime;
        set({ currentTime: newTime });
      }
    },

    setPlaybackRate: (rate: number) => {
      const { audio } = get();
      if (audio) {
        audio.playbackRate = rate;
      }
      set({ playbackRate: rate });
    },

    setLanguageMode: (mode) => {
      set({ languageMode: mode });
    },

    toggleShadowing: () => {
      set((state) => ({ shadowingOpen: !state.shadowingOpen }));
    },

    setRecordingShadowing: (isRecording: boolean) => {
      set({ isRecordingShadowing: isRecording });
    },

    // Syncing logic to invoke POST /api/tracks/[id]/progress
    syncProgressToServer: async () => {
      const { activeTrack, currentTime, duration } = get();
      if (!activeTrack) return;

      // Update last synced marker before request is completed to block race conditions
      set({ lastSyncedTime: currentTime });

      try {
        const response = await fetch(`/api/tracks/${activeTrack.id}/progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentTime,
            duration: duration || activeTrack.duration
          }),
        });

        if (!response.ok) {
          throw new Error(`Sync failed with status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Progress synced successfully:', data);
        
        // If progress completed, we can trigger local notifications, toast banners, or UI updates.
        if (data.data?.newlyCompleted) {
          console.log('🎉 Track completed! Metics updated:', data.data.updatedStats);
        }
      } catch (err) {
        console.error('Failed to sync progress with the backend database:', err);
      }
    }
  };
});
