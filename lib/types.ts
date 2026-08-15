// Hand-written to match supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` once a real project exists,
// and diff against this file rather than blindly overwriting it.
//
// The `Database` type below is NOT currently passed as a generic to any
// Supabase client (see lib/supabase/{client,server,admin}.ts). Doing so broke
// type inference on .insert()/.eq().single() chains against this project's
// installed @supabase/supabase-js@2.112 + typescript@5.9 combination — traced
// to a repro as small as a 2-table schema, so it's a version-specific
// inference issue, not a mistake in this schema's shape. Clients are
// untyped (implicit `any` schema) for now; call sites in lib/ type their own
// function signatures against the interfaces below instead. Revisit once a
// real project exists and `supabase gen types` output can be diffed against
// this — if generated types hit the same issue, it's worth a supabase-js
// version bump or an upstream issue, not more time spent here.

export type CallStatus = "not_booked" | "booked" | "completed";
export type ProgressStatus = "not_started" | "in_progress" | "complete";
export type ResourceType = "checklist" | "toolkit" | "guide" | "script";
export type AccessSource = "stripe_purchase" | "manual_comp";
export type BonusStatus = "locked_missed" | "reactivated" | "included_at_purchase";
export type ContentStatus = "published" | "coming_soon";

export interface Student {
  id: string;
  email: string;
  name: string | null;
  call_status: CallStatus;
  last_nudged_at: string | null;
  created_at: string;
}

export interface Module {
  id: string;
  title: string;
  description: string | null;
  /** Full Dubb embed HTML snippet (wrapper div + iframe), not a bare URL. */
  dubb_url: string;
  duration_seconds: number;
  display_order: number;
  status: ContentStatus;
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
  /** Where the unlocked bonus actually lives (PDF, video, external link). Null until an admin sets it. */
  content_url: string | null;
  display_order: number;
  status: ContentStatus;
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

export interface CheckoutAttempt {
  id: string;
  email: string;
  stripe_session_id: string;
  created_at: string;
}

// `Relationships: []` and the empty `Views`/`Functions` maps are boilerplate
// required to structurally match supabase-js's GenericSchema/GenericTable —
// without them every query falls back to `never` row types.
type Table<Row, RequiredInsertKeys extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, RequiredInsertKeys>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      students: Table<Student, "id" | "email">;
      modules: Table<Module, "title" | "dubb_url" | "duration_seconds">;
      resources: Table<Resource, "module_id" | "title" | "type" | "file_url">;
      progress: Table<Progress, "student_id" | "module_id">;
      access_grants: Table<AccessGrant, "email" | "source">;
      orders: Table<Order, "stripe_session_id" | "email" | "amount_cents">;
      bonuses: Table<Bonus, "title">;
      student_bonus_status: Table<StudentBonusStatus, "student_email" | "bonus_id">;
      testimonials: Table<Testimonial, "client_name" | "quote">;
      checkout_attempts: Table<CheckoutAttempt, "email" | "stripe_session_id">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
