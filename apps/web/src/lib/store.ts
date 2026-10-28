import { create } from 'zustand';
import { Role, GreenSpace, Ward } from './types';

interface AppState {
  // Role & User
  activeRole: Role;
  setActiveRole: (role: Role) => void;
  
  // Map State
  selectedWardId: string | null;
  setSelectedWardId: (id: string | null) => void;
  selectedGreenSpace: GreenSpace | null;
  setSelectedGreenSpace: (gs: GreenSpace | null) => void;
  
  // Layer Toggles
  activeLayers: {
    greenSpaces: boolean;
    wards: boolean;
    treeDensity: boolean;
    heatRisk: boolean;
    reports: boolean;
    priorityZones: boolean;
  };
  toggleLayer: (layer: keyof AppState['activeLayers']) => void;
  
  // Filters
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  healthFilter: number;
  setHealthFilter: (min: number) => void;

  // Authenticated User
  currentUser: any | null;
  setCurrentUser: (user: any | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeRole: 'CITIZEN',
  setActiveRole: (role) => set({ activeRole: role }),
  
  selectedWardId: null,
  setSelectedWardId: (id) => set({ selectedWardId: id }),
  selectedGreenSpace: null,
  setSelectedGreenSpace: (gs) => set({ selectedGreenSpace: gs }),
  
  activeLayers: {
    greenSpaces: true,
    wards: true,
    treeDensity: false,
    heatRisk: false,
    reports: true,
    priorityZones: false,
  },
  toggleLayer: (layer) => set((state) => ({
    activeLayers: {
      ...state.activeLayers,
      [layer]: !state.activeLayers[layer],
    }
  })),

  categoryFilter: 'ALL',
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  healthFilter: 0,
  setHealthFilter: (min) => set({ healthFilter: min }),

  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user, activeRole: user?.role || 'CITIZEN' }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('greencity_token');
    }
    set({ currentUser: null, activeRole: 'CITIZEN' });
  },
}));
