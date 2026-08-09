// Hand-written to match supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` once a real project exists,
// and diff against this file rather than blindly overwriting it.

export type CallStatus = "not_booked" | "booked" | "completed";
export type ProgressStatus = "not_started" | "in_progress" | "complete";
export type ResourceType = "checklist" | "toolkit" | "guide" | "script";
export type AccessSource = "stripe_purchase" | "manual_comp";
export type BonusStatus = "locked_missed" | "reactivated" | "included_at_purchase";

export interface Student {
  id: string;
  email: string;
  name: string | null;
  call_status: CallStatus;
  created_at: string;
}

export interface Module {
  id: string;
  title: string;
  description: string | null;
  dubb_url: string;
  duration_seconds: number;
  display_order: number;
  created_at: string;
}

export interface Resource {
  id: string;
  module_id: string;
  title: string;
  type: ResourceType;
  file_url: string;
  display_order: number;
}

export interface Progress {
  id: string;
  student_id: string;
  module_id: string;
  status: ProgressStatus;
  watch_position_seconds: number;
  completed_at: string | null;
  updated_at: string;
}

export interface AccessGrant {
  id: string;
  email: string;
  source: AccessSource;
  granted_by: string | null;
  stripe_session_id: string | null;
  granted_at: string;
}

export interface Order {
  id: string;
  stripe_session_id: string;
  stripe_customer_id: string | null;
  email: string;
  amount_cents: number;
  created_at: string;
}

export interface Bonus {
  id: string;
  title: string;
  description: string | null;
  value_prop: string | null;
  display_order: number;
}

export interface StudentBonusStatus {
  id: string;
  student_email: string;
  bonus_id: string;
  status: BonusStatus;
  reactivated_at: string | null;
}

export interface Testimonial {
  id: string;
  client_name: string;
  quote: string;
  result_stat: string | null;
  photo_url: string | null;
  display_order: number;
  active: boolean;
}

export interface Database {
  public: {
    Tables: {
      students: { Row: Student; Insert: Partial<Student> & Pick<Student, "id" | "email">; Update: Partial<Student> };
      modules: { Row: Module; Insert: Partial<Module> & Pick<Module, "title" | "dubb_url" | "duration_seconds">; Update: Partial<Module> };
      resources: { Row: Resource; Insert: Partial<Resource> & Pick<Resource, "module_id" | "title" | "type" | "file_url">; Update: Partial<Resource> };
      progress: { Row: Progress; Insert: Partial<Progress> & Pick<Progress, "student_id" | "module_id">; Update: Partial<Progress> };
      access_grants: { Row: AccessGrant; Insert: Partial<AccessGrant> & Pick<AccessGrant, "email" | "source">; Update: Partial<AccessGrant> };
      orders: { Row: Order; Insert: Partial<Order> & Pick<Order, "stripe_session_id" | "email" | "amount_cents">; Update: Partial<Order> };
      bonuses: { Row: Bonus; Insert: Partial<Bonus> & Pick<Bonus, "title">; Update: Partial<Bonus> };
      student_bonus_status: { Row: StudentBonusStatus; Insert: Partial<StudentBonusStatus> & Pick<StudentBonusStatus, "student_email" | "bonus_id">; Update: Partial<StudentBonusStatus> };
      testimonials: { Row: Testimonial; Insert: Partial<Testimonial> & Pick<Testimonial, "client_name" | "quote">; Update: Partial<Testimonial> };
    };
  };
}
