// Response shapes of the backend (see backend/app/serializers.py).

export type Role = 'admin' | 'head_nurse' | 'nurse' | 'doctor' | 'iv_team';
export type Condition = 'infiltration' | 'phlebitis';
export type ScheduleStatus = 'overdue' | 'due' | 'upcoming';

export interface UserBrief {
  id: number;
  full_name: string;
  role: Role;
  role_label: string;
  position: string;
}

export interface User extends UserBrief {
  username: string;
  employee_code: string;
  email: string | null;
  scope: string;
  mfa_enabled: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface PatientBrief {
  id: number;
  hn: string;
  an: string | null;
  full_name: string;
  gender: string | null;
  age_text: string | null;
  ward: string;
  room: string | null;
  bed: string | null;
  status: 'admitted' | 'discharged';
}

export interface Review {
  id: number;
  condition: Condition;
  finding: 'no_observation' | 'observation_found';
  grade: number;
  risk_level: string;
  has_pain: boolean | null;
  note: string | null;
  reviewer: UserBrief | null;
  created_at: string;
  updated_at: string;
}

export interface ConditionView {
  condition: Condition;
  flagged: boolean;
  probability: number | null;
  ai_grade: number | null;
  ai_risk_level: string | null;
  review: Review | null;
}

export interface AnalysisBrief {
  id: number;
  status: 'OK' | 'QUALITY_HOLD' | 'PREPROCESSING_HOLD' | string;
  prediction_issued: boolean;
  condition_prediction: 'INF' | 'PHL' | null;
  grade_prediction: number | null;
  confidence: number | null;
  review_status: 'pending_review' | 'reviewed' | 'not_applicable';
  image_url: string;
  created_at: string;
  conditions: Record<Condition, ConditionView>;
}

export interface RoundBrief {
  id: number;
  round_no: number;
  due_at: string;
  status: 'pending' | 'completed' | 'skipped' | 'missed' | 'cancelled';
  completed_at: string | null;
  skip_reason: string | null;
  performed_by: UserBrief | null;
  image_url: string | null;
}

export interface NextRound extends RoundBrief {
  schedule_status: ScheduleStatus;
}

export interface SiteBrief {
  id: number;
  needle_no: number;
  label: string;
  body_side: string;
  location: string;
  vein: string;
  interval_hours: number;
  duration_hours: number;
  started_at: string;
  status: 'active' | 'removed' | 'completed';
  removed_at: string | null;
  removal_reason: string | null;
  baseline_image_url: string | null;
}

export interface Site extends SiteBrief {
  elapsed_hours: number;
  total_rounds: number;
  completed_rounds: number;
  skipped_rounds: number;
  missed_rounds: number;
  next_round: NextRound | null;
  latest_analysis: AnalysisBrief | null;
  ends_at: string;
}

export interface BoardRow extends Site {
  patient: PatientBrief;
}

export interface Patient extends PatientBrief {
  birth_date: string | null;
  weight_kg: number | null;
  diagnosis: string | null;
  admitted_at: string;
  discharged_at: string | null;
  attending_nurse: UserBrief | null;
  sites: Site[];
  active_sites: number;
}

export interface Quality {
  status: 'PASS' | 'MANUAL_REVIEW' | 'RETAKE' | null;
  reasons: string[];
  warnings: string[];
  checks: Record<string, string>;
}

export interface ArmCandidate {
  arm_id: string;
  preview_data_url: string;
}

export interface Analysis extends AnalysisBrief {
  prob_inf: number | null;
  prob_phl: number | null;
  grade_probabilities: Record<string, number> | null;
  model_version: string | null;
  model_status: string | null;
  processing_ms: number | null;
  quality: Quality;
  preprocessing_reason: string | null;
  image_url: string;
  baseline_image_url: string | null;
  baseline_taken_at: string | null;
  previous_image_url: string | null;
  previous_taken_at: string | null;
  round: RoundBrief | null;
  site: SiteBrief;
  patient: PatientBrief;
  assigned_reviewer: UserBrief | null;
  assigned_at: string | null;
  manual_review_candidates?: ArmCandidate[];
}

export interface QueueItem {
  key: string;
  condition: Condition;
  analysis: Analysis;
}

export interface HistoryItem {
  id: number;
  condition: Condition;
  finding: Review['finding'];
  grade: number;
  risk_level: string;
  has_pain: boolean | null;
  note: string | null;
  reviewer: UserBrief | null;
  reviewed_at: string;
  ai_probability: number | null;
  ai_flagged: boolean;
  ai_grade: number | null;
  analysis_id: number;
  analyzed_at: string;
  image_url: string;
  site: SiteBrief;
  patient: PatientBrief;
}

export interface TrackingRow extends BoardRow {
  latest_review: Review;
  grade_history: { grade: number; reviewed_at: string; analysis_id: number }[];
}

export interface CompletedRow extends BoardRow {
  final_reviews: Record<Condition, Review | null>;
}

export interface OverviewStats {
  admitted_patients: number;
  active_sites: number;
  overdue: number;
  due: number;
  upcoming: number;
  pending_reviews: number;
  infiltration_active: number;
  phlebitis_active: number;
  inspections_today: number;
  skipped_today: number;
}

export interface Notification {
  id: number;
  category: 'due' | 'ai' | 'system';
  title: string;
  body: string | null;
  link: string | null;
  patient_id: number | null;
  analysis_id: number | null;
  round_id: number | null;
  created_at: string;
  read: boolean;
}

export interface AuditEntry {
  id: number;
  code: string;
  created_at: string;
  actor_name: string;
  event_type: string;
  category: 'schedule' | 'ai' | 'permission' | 'system';
  event: string;
  target: string | null;
  details: string | null;
  ip_address: string | null;
}

export interface Paged<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface SystemSettings {
  due_window_minutes: number;
  overdue_grace_minutes: number;
  default_interval_hours: number;
  post_removal_interval_hours: number;
  tracking_duration_hours: number;
  ai_enabled: boolean;
  allow_manual_quality_review: boolean;
  notify_overdue: boolean;
  notify_ai_findings: boolean;
  notify_skipped_rounds: boolean;
  skip_reasons: string[];
  removal_reasons: string[];
  auto_retrain_enabled: boolean;
  auto_retrain_interval_days: number;
  auto_retrain_min_new_labels: number;
}

export interface ReportSummary {
  range: string;
  from: string;
  to: string;
  analyses_total: number;
  analyses_issued: number;
  analyses_held: number;
  avg_processing_ms: number | null;
  reviews_total: number;
  reviews_pending: number;
  found: Record<Condition, number>;
  grade_distribution: Record<Condition, Record<string, number>>;
  ai_agreement_rate: number | null;
  rounds: { completed: number; skipped: number; missed: number };
  compliance_rate: number | null;
  sites_started: number;
  sites_removed: number;
  daily: { date: string; analyses: number; infiltration: number; phlebitis: number }[];
}

export interface SystemStatus {
  database: 'UP' | 'DOWN';
  ai: { status: string; model_version?: string; model_warning?: string | null; provider?: string; error?: string };
  his: { status: string };
  server_time: string;
}

// ---- AI model versions / retraining ----

export type TrainingState = 'queued' | 'preprocessing' | 'training' | 'evaluating' | 'exporting' | 'succeeded' | 'failed';

export interface ClassMetrics {
  n?: number;
  accuracy: number | null;
  balanced_accuracy: number | null;
  macro_f1: number | null;
  confusion_matrix: number[][];
}

export interface EvalMetrics {
  condition: ClassMetrics;
  grade: ClassMetrics;
}

export interface LabelCounts {
  condition: Record<string, number>;
  grade: Record<string, number>;
  patients: number;
}

export interface ModelMetadata {
  version: string;
  status?: string;
  base_version?: string;
  trained_at_utc?: string;
  duration_seconds?: number;
  device?: string;
  architecture?: string;
  config?: { epochs: number; batch_size: number; learning_rate: number; test_fraction: number; seed: number };
  dataset?: {
    received: number;
    usable: number;
    skipped: Record<string, number>;
    train: number;
    test: number;
    train_labels: LabelCounts;
    test_labels: LabelCounts;
    split: string;
  };
  history?: { epoch: number; loss: number; train_condition_accuracy: number; train_grade_accuracy: number }[];
  test_metrics?: EvalMetrics;
  base_test_metrics?: EvalMetrics;
  // Built-in model: out-of-fold cross-validation on its original 109 images.
  development_n?: number;
  oof_condition?: ClassMetrics;
  oof_grade?: ClassMetrics;
}

export interface TrainingDataSummary {
  labelled: number;
  patients: number;
  condition: Record<string, number>;
  grade: Record<string, number>;
  excluded: Record<string, number>;
  new_since_last_training: number;
  min_required: number;
}

export interface ModelVersion {
  id: number;
  version: string;
  state: TrainingState | string;
  progress: number | null;
  message: string | null;
  error: string | null;
  is_builtin: boolean;
  is_active: boolean;
  base_version: string | null;
  trigger: 'manual' | 'schedule' | 'builtin' | string;
  notes: string | null;
  dataset: TrainingDataSummary | null;
  metadata: ModelMetadata | null;
  created_at: string;
  finished_at: string | null;
  activated_at: string | null;
  started_by: UserBrief | null;
  activated_by: UserBrief | null;
  log?: string | null;
}

export interface ModelVersionsPage {
  ai_reachable: boolean;
  ai_error: string | null;
  active: string | null;
  loaded: string | null;
  training_running: boolean;
  dataset: TrainingDataSummary;
  schedule: { auto_retrain_enabled: boolean; auto_retrain_interval_days: number; auto_retrain_min_new_labels: number };
  versions: ModelVersion[];
}
