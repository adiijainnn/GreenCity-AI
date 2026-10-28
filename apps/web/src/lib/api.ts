import { Ward, GreenSpace, CitizenReport, MaintenanceTask, AIRecommendation, AuditLog, Dataset, Role } from './types';

const API_BASE = '/api/v1';

async function fetcher<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('greencity_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.detail || errorData?.error?.message || `API Error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (credentials: any) => fetcher<{ access_token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data: any) => fetcher<{ access_token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => fetcher<any>('/auth/me'),

  // Wards
  getWards: () => fetcher<Ward[]>('/wards'),
  getWardGeoJSON: () => fetcher<any>('/wards/geojson'),
  getWardById: (id: string) => fetcher<Ward>(`/wards/${id}`),

  // Green Spaces
  getGreenSpaces: (params?: { category?: string; ward_id?: string; min_health?: number; bbox?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.ward_id) query.append('ward_id', params.ward_id);
    if (params?.min_health !== undefined) query.append('min_health', params.min_health.toString());
    if (params?.bbox) query.append('bbox', params.bbox);
    return fetcher<GreenSpace[]>(`/green-spaces?${query.toString()}`);
  },
  getGreenSpaceGeoJSON: (params?: { ward_id?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.ward_id) query.append('ward_id', params.ward_id);
    if (params?.category) query.append('category', params.category);
    return fetcher<any>(`/green-spaces/geojson?${query.toString()}`);
  },
  getGreenSpaceById: (id: string) => fetcher<GreenSpace>(`/green-spaces/${id}`),
  createGreenSpace: (data: any) => fetcher<GreenSpace>('/green-spaces', { method: 'POST', body: JSON.stringify(data) }),

  // Citizen Reports
  getReports: (params?: { ward_id?: string; category?: string; status?: string; priority?: string; mine_only?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.ward_id) query.append('ward_id', params.ward_id);
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.mine_only) query.append('mine_only', 'true');
    return fetcher<CitizenReport[]>(`/reports?${query.toString()}`);
  },
  submitReport: (data: any) => fetcher<CitizenReport>('/reports', { method: 'POST', body: JSON.stringify(data) }),
  getReportById: (id: string) => fetcher<CitizenReport>(`/reports/${id}`),
  updateReportStatus: (id: string, data: any) => fetcher<CitizenReport>(`/reports/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Maintenance
  getMaintenanceTasks: (params?: { status?: string; green_space_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.green_space_id) query.append('green_space_id', params.green_space_id);
    return fetcher<MaintenanceTask[]>(`/maintenance?${query.toString()}`);
  },
  createMaintenanceTask: (data: any) => fetcher<MaintenanceTask>('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  updateMaintenanceTask: (id: string, data: any) => fetcher<MaintenanceTask>(`/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Analytics
  getCityAnalytics: () => fetcher<any>('/analytics/city'),
  compareWards: (wardAId: string, wardBId: string) => fetcher<any>(`/analytics/compare?ward_a_id=${wardAId}&ward_b_id=${wardBId}`),

  // Insights
  getInsights: (params?: { ward_id?: string; priority?: string }) => {
    const query = new URLSearchParams();
    if (params?.ward_id) query.append('ward_id', params.ward_id);
    if (params?.priority) query.append('priority', params.priority);
    return fetcher<AIRecommendation[]>(`/insights?${query.toString()}`);
  },
  regenerateInsights: () => fetcher<any>('/insights/generate', { method: 'POST' }),

  // Datasets & Admin
  getDatasets: () => fetcher<Dataset[]>('/datasets'),
  importDataset: (data: any) => fetcher<Dataset>('/datasets/import', { method: 'POST', body: JSON.stringify(data) }),
  getAuditLogs: () => fetcher<AuditLog[]>('/admin/audit-logs'),
  getSystemHealth: () => fetcher<any>('/admin/system-health'),
  getUsers: () => fetcher<any[]>('/users'),
  updateUserRole: (userId: string, role: Role) => fetcher<any>(`/users/${userId}/role?role=${role}`, { method: 'PATCH' }),

  // Live Environmental Intelligence
  getLiveEnvironment: (lat = 17.6599, lng = 75.9064, forceRefresh = false) =>
    fetcher<any>(`/environment/live?lat=${lat}&lng=${lng}&force_refresh=${forceRefresh}`),
  getEnvironmentalHistory: (lat = 17.6599, lng = 75.9064) =>
    fetcher<any>(`/environment/history?lat=${lat}&lng=${lng}`),
  getVisitSuitability: (lat = 17.6599, lng = 75.9064, purpose = 'walking') =>
    fetcher<any>(`/environment/suitability?lat=${lat}&lng=${lng}&purpose=${encodeURIComponent(purpose)}`),
  getFestivalIntelligence: (lat = 17.6599, lng = 75.9064) =>
    fetcher<any>(`/environment/festival?lat=${lat}&lng=${lng}`),
  getParkVisitTimes: (params?: { park_id?: string; lat?: number; lng?: number; date?: string; force_refresh?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.park_id) query.append('park_id', params.park_id);
    if (params?.lat !== undefined) query.append('lat', params.lat.toString());
    if (params?.lng !== undefined) query.append('lng', params.lng.toString());
    if (params?.date) query.append('date', params.date);
    if (params?.force_refresh) query.append('force_refresh', 'true');
    return fetcher<any>(`/environment/park-visit-times?${query.toString()}`);
  },

  // Live Navigation & Routing
  // Always routes through the FastAPI backend via /api/v1/routing/directions (Next.js rewrites this).
  // The optional /api/routes/compute Next.js handler is available for Google Maps key isolation
  // but is NOT used here to avoid NEXT_PUBLIC_API_URL being undefined in the Node.js server context.
  getDirections: (params: { startLat: number; startLng: number; destLat: number; destLng: number; mode?: 'driving' | 'walking'; alternatives?: boolean }) => {
    const query = new URLSearchParams({
      start_lat: params.startLat.toString(),
      start_lng: params.startLng.toString(),
      dest_lat: params.destLat.toString(),
      dest_lng: params.destLng.toString(),
      mode: params.mode || 'driving',
      alternatives: params.alternatives !== false ? 'true' : 'false',
    });
    return fetcher<any>(`/routing/directions?${query.toString()}`);
  },

  // Places & Discovery
  searchPlaces: (q: string, limit = 10, centerLat?: number, centerLng?: number) => {
    const params = new URLSearchParams({
      q,
      limit: limit.toString(),
    });
    if (centerLat !== undefined && centerLng !== undefined) {
      params.append('lat', centerLat.toString());
      params.append('lng', centerLng.toString());
    }
    return fetcher<any[]>(`/places/search?${params.toString()}`);
  },
  getNearbyPlaces: (lat: number, lng: number, radiusKm = 3.0, category?: string) => {
    const query = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius_km: radiusKm.toString(),
    });
    if (category && category !== 'ALL') query.append('category', category);
    return fetcher<any[]>(`/places/nearby?${query.toString()}`);
  },
  comparePlaces: (places: any[]) =>
    fetcher<any[]>('/places/compare', { method: 'POST', body: JSON.stringify(places) }),

  // Multilingual AI Voice Assistant
  assistantChat: (data: { query: string; language?: string; latitude?: number; longitude?: number }) =>
    fetcher<any>('/assistant/chat', { method: 'POST', body: JSON.stringify(data) }),
};

