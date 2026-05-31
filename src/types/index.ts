export interface Unit {
  id: number;
  name: string;
  is_active: boolean;
}

export interface Material {
  id: number;
  material_name: string;
  unit_of_measurement: string;
  hsn_code: string | null;
  default_rate: number;
  gst_rate: number;
  is_active: boolean;
}

export interface Customer {
  id: number;
  name: string;
  address: string;
  mobile: string;
  email: string | null;
  pan_number: string | null;
  gstin: string | null;
  state_name: string | null;
  state_code: string | null;
}

export interface CustomerAsset {
  id: number;
  customer_id: number;
  customer?: { id: number; name: string };
  fabrication_number: string;
  compressor_model: string;
  service_dealer: string;
  product: string;
  compressor_make: string;
  service_engineer: string | null;
  contact_person_name: string | null;
  contact_person_mail: string | null;
  contact_person_number: string | null;
  alternate_person_name: string | null;
  alternate_person_mail: string | null;
  alternate_person_number: string | null;
  hours_meter_reading: string | null;
  hmr_date: string | null;
  amc: boolean;
  amc_start_date: string | null;
  amc_end_date: string | null;
  is_active: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  address: string;
  mobile: string;
  email: string | null;
  pan_number: string | null;
  gstin: string | null;
  state_name: string | null;
  state_code: string | null;
  contact_person: string | null;
}

export interface DocumentItem {
  id?: number;
  material_id: number | null;
  sl_no: number;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  per: string;
  discount_pct: number;
  amount: number;
  gst_rate: number;
  gst_amount: number;
  sort_order?: number;
}

export type DocumentType = 'invoice' | 'proforma_invoice' | 'purchase_order' | 'quotation';
export type DocumentStatus = 'draft' | 'confirmed' | 'cancelled';
export type PaymentStatus = 'paid' | 'unpaid' | 'pending' | 'approved' | 'rejected';

export interface Document {
  id: number;
  type: DocumentType;
  doc_number: string;
  date: string;
  status: DocumentStatus;
  payment_status: PaymentStatus | null;
  customer_id: number | null;
  consignee_id: number | null;
  supplier_id: number | null;
  reference_no: string | null;
  reference_date: string | null;
  other_reference: string | null;
  delivery_note: string | null;
  payment_terms: string | null;
  buyers_order_no: string | null;
  buyers_order_date: string | null;
  dispatch_doc_no: string | null;
  delivery_note_date: string | null;
  dispatched_through: string | null;
  destination: string | null;
  terms_of_delivery: string | null;
  quotation_no: string | null;
  quotation_date: string | null;
  packing_charges: number | null;
  pr_no: string | null;
  quotation_validity: string | null;
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  round_off: number | null;
  grand_total: number;
  notes: string | null;
  annexure_items?: { filename: string; headers: string[]; rows: string[][] } | null;
  customer?: Customer;
  consignee?: Customer;
  supplier?: Supplier;
  items?: DocumentItem[];
}

export interface DashboardStats {
  invoice: { count: number; total: number };
  proforma_invoice: { count: number; total: number };
  purchase_order: { count: number; total: number };
  quotation: { count: number; total: number };
}

export interface DocumentCounter {
  id: number;
  type: DocumentType;
  prefix: string;
  last_number: number;
  financial_year: string;
}

export interface ServiceReport {
  id: number;
  report_number: string;
  report_date: string | null;
  service_type: string;
  status: 'draft' | 'completed';
  customer_id: number | null;
  customer_asset_id: number | null;
  company_name: string | null;
  fabrication_number: string | null;
  compressor_model: string | null;
  site_location: string | null;
  site_person_name: string | null;
  site_person_number: string | null;
  site_person_mail: string | null;
  amc_status: string | null;
  amc_registration_no: string | null;
  amc_visit_no: string | null;
  next_service_due_on: string | null;
  load_hmr: string | null;
  unload_hmr: string | null;
  total_hmr: string | null;
  dealer: string | null;
  parameters: Record<string, { actual?: string; response?: string }> | null;
  no_of_visits: number | null;
  service_charges_applicable: boolean;
  service_charges: string | null;
  parts_recommended: string | null;
  work_done: string | null;
  engineer: string | null;
  engineer_contact: string | null;
  customer_feedback: string | null;
  customer_feedback_percentage: number | null;
  customer_feedback_remarks: string | null;
  engineer_remarks: string | null;
  signature: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}
