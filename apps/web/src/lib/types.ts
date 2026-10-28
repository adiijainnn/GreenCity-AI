export type Role = 'CITIZEN' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone?: string;
  organization_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface Ward {
  id: string;
  ward_number: number;
  name: string;
  code: string;
  geometry: string;
  area_km2: number;
  population: number;
  target_green_coverage_pct: number;
  current_green_coverage_pct: number;
  green_space_count: number;
  health_score: number;
  priority_score: number;
}

export interface GreenSpace {
  id: string;
  name: string;
  description?: string;
  category: string;
  geometry: string;
  latitude: number;
  longitude: number;
  area_m2: number;
  ward_id: string;
  ownership_type: string;
  status: string;
  vegetation_density: number;
  tree_count: number;
  canopy_percentage: number;
  health_score: number;
  accessibility_score: number;
  biodiversity_score: number;
  carbon_estimate: number;
  last_assessed_at: string;
  created_at: string;
}

export interface CitizenReport {
  id: string;
  report_number: string;
  category: string;
  title: string;
  description: string;
  ward_id: string;
  green_space_id?: string;
  latitude: number;
  longitude: number;
  status: 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed' | 'Rejected';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  reported_by?: string;
  assigned_to?: string;
  public_response?: string;
  internal_notes?: string;
  resolution_evidence_url?: string;
  created_at: string;
  updated_at: string;
  images?: { id: string; image_url: string }[];
}

export interface MaintenanceTask {
  id: string;
  green_space_id: string;
  report_id?: string;
  task_type: string;
  description: string;
  priority: string;
  assigned_to?: string;
  scheduled_date?: string;
  due_date?: string;
  status: 'Planned' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
  created_at: string;
}

export interface AIRecommendation {
  id: string;
  ward_id?: string;
  green_space_id?: string;
  title: string;
  description: string;
  reason: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  affected_area: string;
  supporting_metrics: Record<string, any>;
  confidence: number;
  generated_at: string;
}

export interface CityAnalyticsSummary {
  total_wards: number;
  total_green_spaces: number;
  total_city_area_km2: number;
  total_green_area_m2: number;
  city_green_coverage_pct: number;
  total_estimated_trees: number;
  average_health_score: number;
  total_carbon_stored_ton: number;
  open_reports_count: number;
  resolved_reports_count: number;
  pending_maintenance_tasks: number;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_email?: string;
  action: string;
  resource: string;
  resource_id?: string;
  metadata_json?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  dataset_type: string;
  source?: string;
  license: string;
  uploaded_by?: string;
  processing_status: string;
  record_count: number;
  created_at: string;
}
