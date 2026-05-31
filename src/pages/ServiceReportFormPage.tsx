import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileDown, Save, Send } from 'lucide-react';
import api from '../lib/api';
import { type ServiceReport } from '../types';
import SignaturePad, { type SignaturePadHandle } from '../components/SignaturePad';
import { useToast } from '../context/ToastContext';

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand';
const LABEL = 'block text-xs font-medium text-gray-600 mb-1';
const SECTION = 'text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3';

type ParamValue = { actual: string; response: string };
type ParamsState = Record<string, ParamValue>;

interface FormState {
  report_date: string; company_name: string; site_person_name: string;
  site_person_number: string; site_person_mail: string;
  fabrication_number: string; compressor_model: string; site_location: string;
  amc_status: string; amc_registration_no: string; amc_visit_no: string;
  load_hmr: string; unload_hmr: string; total_hmr: string; next_service_due_on: string;
  engineer: string; engineer_contact: string; dealer: string;
  customer_feedback: string; customer_feedback_percentage: string; customer_feedback_remarks: string;
  no_of_visits: string; parts_recommended: string; work_done: string;
  service_charges_applicable: boolean; service_charges: string; engineer_remarks: string;
  signature: string;
}

const PARAMS: { key: string; label: string; hasActual: boolean; hasResponse: boolean; mandatory: boolean }[] = [
  { key: 'af_replaced',                   label: 'Is AF replaced',                                  hasActual: true,  hasResponse: true,  mandatory: true  },
  { key: 'of_replaced',                   label: 'Is OF replaced',                                  hasActual: true,  hasResponse: true,  mandatory: true  },
  { key: 'aos_replaced',                  label: 'Is AOS replaced',                                 hasActual: true,  hasResponse: true,  mandatory: true  },
  { key: 'greasing_done',                 label: 'Is Greasing done',                                hasActual: true,  hasResponse: true,  mandatory: true  },
  { key: 'valve_kit_replaced',            label: 'Is Valve kit replaced',                           hasActual: true,  hasResponse: true,  mandatory: true  },
  { key: 'pre_filter_replaced',           label: 'Is Pre filter replaced',                          hasActual: true,  hasResponse: true,  mandatory: true  },
  { key: 'fine_filter_replaced',          label: 'Is Fine filter replaced',                         hasActual: true,  hasResponse: true,  mandatory: true  },
  { key: 'carbon_filter_replaced',        label: 'Is Carbon Filter replaced',                       hasActual: true,  hasResponse: true,  mandatory: true  },
  { key: 'oil_used',                      label: 'Oil used',                                        hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'ambient_temperature',           label: 'Ambient temperature (°C)',                         hasActual: true,  hasResponse: true,  mandatory: false },
  { key: 'discharge_oil_temperature',     label: 'Discharge oil temperature (°C)',                   hasActual: true,  hasResponse: true,  mandatory: false },
  { key: 'room_temperature',              label: 'Room temperature (°C)',                            hasActual: true,  hasResponse: true,  mandatory: false },
  { key: 'aos_differential_pressure',     label: 'AOS Differential pressure (kg/cm²)',               hasActual: true,  hasResponse: true,  mandatory: false },
  { key: 'load_pressure',                 label: 'Load pressure (kg/cm²)',                           hasActual: true,  hasResponse: true,  mandatory: false },
  { key: 'unload_pressure',               label: 'Unload pressure (kg/cm²)',                         hasActual: true,  hasResponse: true,  mandatory: false },
  { key: 'working_pressure',              label: 'Working pressure (kg/cm²)',                        hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'r_load_current',                label: 'R - Load Current (amps)',                          hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'y_load_current',                label: 'Y - Load Current (amps)',                          hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'b_load_current',                label: 'B - Load Current (amps)',                          hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'r_unload_current',              label: 'R - Unload Current (amps)',                        hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'y_unload_current',              label: 'Y - Unload Current (amps)',                        hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'b_unload_current',              label: 'B - Unload Current (amps)',                        hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'fan_motor_current',             label: 'Fan Motor Current (amps)',                         hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'incoming_single_phase_current', label: 'Incoming single phase current (amps)',             hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'ry_incoming_voltage',           label: 'RY - Incoming voltage (volts)',                    hasActual: true,  hasResponse: true,  mandatory: false },
  { key: 'yb_incoming_voltage',           label: 'YB - Incoming voltage (volts)',                    hasActual: true,  hasResponse: true,  mandatory: false },
  { key: 'br_incoming_voltage',           label: 'BR - Incoming voltage (volts)',                    hasActual: true,  hasResponse: true,  mandatory: false },
  { key: 'fan_motor_voltage',             label: 'Fan Motor voltage (volts)',                        hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'incoming_single_phase_voltage', label: 'Incoming single phase voltage (volts)',            hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'earth_to_neutral_voltage',      label: 'Earth to Neutral voltage (volts)',                 hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'hmr_last_oil_changed',          label: 'HMR - Last oil changed',                          hasActual: true,  hasResponse: false, mandatory: false },
  { key: 'drive_coupling_condition',      label: 'Is the Drive Coupling condition good',             hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'cooler_condition',              label: 'Is the Cooler condition good',                     hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'pre_filter_condition',          label: 'Is the Pre filter condition good',                 hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'min_pressure_valve',            label: 'Is the Minimum pressure valve functioning',        hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'actuator_functioning',          label: 'Is the Actuator functioning',                     hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'intake_valve_functioning',      label: 'Is the Intake valve functioning',                 hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'blow_down_valve_functioning',   label: 'Is the Blow down valve functioning',               hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'pressure_regulator_valve',      label: 'Is the Pressure regulator valve functioning',     hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'thermal_valve_element',         label: 'Is the Thermal valve element functioning',         hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'safety_valve_functioning',      label: 'Is the Safety valve functioning',                 hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'solenoid_valve_functioning',    label: 'Is the Solenoid valve functioning',               hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'nrv_return_line',               label: 'Is the NRV (Return line) condition good',         hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'visual_condition_oil',          label: 'Is the Visual condition of Oil good',             hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'air_filter_condition',          label: 'Is the Air Filter condition good',                hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'mos_adv_functioning',           label: 'Is the MOS ADV functioning',                     hasActual: false, hasResponse: true,  mandatory: false },
  { key: 'load_count',                    label: 'Load count',                                      hasActual: true,  hasResponse: true,  mandatory: false },
  { key: 'unload_sump_pressure',          label: 'Unload Sump Pressure (kg/cm²)',                   hasActual: true,  hasResponse: true,  mandatory: false },
];

const emptyParams = (): ParamsState =>
  Object.fromEntries(PARAMS.map(p => [p.key, { actual: '', response: '' }]));

const loadParams = (raw: Record<string, any> | null | undefined): ParamsState => {
  const base = emptyParams();
  if (!raw) return base;
  return Object.fromEntries(
    PARAMS.map(p => [p.key, { actual: raw[p.key]?.actual ?? '', response: raw[p.key]?.response ?? '' }])
  );
};

export default function ServiceReportFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const sigRef = useRef<SignaturePadHandle>(null);

  const [form, setForm] = useState<FormState>({
    report_date: '', company_name: '', site_person_name: '', site_person_number: '',
    site_person_mail: '', fabrication_number: '', compressor_model: '', site_location: '',
    amc_status: '', amc_registration_no: '', amc_visit_no: '',
    load_hmr: '', unload_hmr: '', total_hmr: '', next_service_due_on: '',
    engineer: 'Nichael Mariya Dass A', engineer_contact: '+91 8925831890', dealer: 'Go Care Solutions',
    customer_feedback: '', customer_feedback_percentage: '', customer_feedback_remarks: '',
    no_of_visits: '', parts_recommended: '', work_done: '',
    service_charges_applicable: false, service_charges: '', engineer_remarks: '', signature: '',
  });
  const [params, setParams] = useState<ParamsState>(emptyParams());
  const [mailModal, setMailModal] = useState(false);
  const [hmrError, setHmrError] = useState('');

  const { data: report, isLoading } = useQuery({
    queryKey: ['service-report', id],
    queryFn: () => api.get<{ data: ServiceReport }>(`/service-reports/${id}`).then(r => r.data.data ?? r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (!report) return;
    setForm({
      report_date: report.report_date || '',
      company_name: report.company_name || '',
      site_person_name: report.site_person_name || '',
      site_person_number: report.site_person_number || '',
      site_person_mail: report.site_person_mail || '',
      fabrication_number: report.fabrication_number || '',
      compressor_model: report.compressor_model || '',
      site_location: report.site_location || '',
      amc_status: report.amc_status || '',
      amc_registration_no: report.amc_registration_no || '',
      amc_visit_no: report.amc_visit_no || '',
      load_hmr: String(report.load_hmr ?? ''),
      unload_hmr: String(report.unload_hmr ?? ''),
      total_hmr: String(report.total_hmr ?? ''),
      next_service_due_on: report.next_service_due_on || '',
      engineer: report.engineer || 'Nichael Mariya Dass A',
      engineer_contact: report.engineer_contact || '+91 8925831890',
      dealer: report.dealer || 'Go Care Solutions',
      customer_feedback: report.customer_feedback || '',
      customer_feedback_percentage: String(report.customer_feedback_percentage ?? ''),
      customer_feedback_remarks: report.customer_feedback_remarks || '',
      no_of_visits: String(report.no_of_visits ?? ''),
      parts_recommended: report.parts_recommended || '',
      work_done: report.work_done || '',
      service_charges_applicable: report.service_charges_applicable ?? false,
      service_charges: String(report.service_charges ?? ''),
      engineer_remarks: report.engineer_remarks || '',
      signature: report.signature || '',
    });
    setParams(loadParams(report.parameters as Record<string, any>));
  }, [report]);

  const set = (k: keyof FormState, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
  const setParam = (key: string, field: 'actual' | 'response', val: string) =>
    setParams(p => ({ ...p, [key]: { ...p[key], [field]: val } }));

  const saveMutation = useMutation({
    mutationFn: (showMail: boolean) => {
      const payload = {
        ...form,
        load_hmr: form.load_hmr || null,
        unload_hmr: form.unload_hmr || null,
        total_hmr: form.total_hmr || null,
        no_of_visits: form.no_of_visits ? Number(form.no_of_visits) : null,
        service_charges: form.service_charges || null,
        customer_feedback_percentage: form.customer_feedback_percentage || null,
        next_service_due_on: form.next_service_due_on || null,
        report_date: form.report_date || null,
        status: 'completed',
        parameters: params,
      };
      return api.put(`/service-reports/${id}`, payload).then(r => ({ data: r.data, showMail }));
    },
    onSuccess: ({ showMail }) => {
      qc.invalidateQueries({ queryKey: ['service-reports'] });
      qc.invalidateQueries({ queryKey: ['service-report', id] });
      setHmrError('');
      if (showMail) {
        setMailModal(true);
      } else {
        toast('Report saved.');
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.errors?.total_hmr?.[0] || 'Save failed.';
      setHmrError(err?.response?.data?.errors?.total_hmr?.[0] || '');
      toast(msg, 'error');
    },
  });

  const mailMutation = useMutation({
    mutationFn: () => api.post(`/service-reports/${id}/send-mail`).then(r => r.data),
    onSuccess: (data) => {
      toast(data.message || 'Report sent.');
      setMailModal(false);
    },
    onError: (err: any) => toast(err?.response?.data?.message || 'Mail failed.', 'error'),
  });

  function downloadPdf() {
    window.open(`${import.meta.env.VITE_API_BASE_URL ?? '/api'}/service-reports/${id}/pdf`, '_blank');
  }

  if (isLoading) return <div className="py-20 text-center text-gray-400 text-sm">Loading...</div>;
  if (!report) return <div className="py-20 text-center text-gray-400 text-sm">Report not found.</div>;

  return (
    <div className="max-w-4xl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/service-reports')} className="text-gray-500 hover:text-gray-800"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{report.report_number}</h1>
            <p className="text-xs text-gray-500">{report.service_type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadPdf} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
            <FileDown size={15} /> PDF
          </button>
          <button onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}
            className="flex items-center gap-2 border border-brand text-brand px-3 py-1.5 rounded-lg text-sm hover:bg-brand-light disabled:opacity-50">
            <Save size={15} /> {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}
            className="flex items-center gap-2 bg-brand text-white px-4 py-1.5 rounded-lg text-sm hover:bg-brand-dark disabled:opacity-50">
            <Send size={15} /> Save & Send
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <p className={SECTION}>Report Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={LABEL}>Report Date</label>
              <input type="date" value={form.report_date} onChange={e => set('report_date', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Company Name</label>
              <input value={form.company_name} onChange={e => set('company_name', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Site Person Name</label>
              <input value={form.site_person_name} onChange={e => set('site_person_name', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Site Person Number</label>
              <input value={form.site_person_number} onChange={e => set('site_person_number', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Site Person Email</label>
              <input type="email" value={form.site_person_mail} onChange={e => set('site_person_mail', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Fabrication Number</label>
              <input value={form.fabrication_number} onChange={e => set('fabrication_number', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Compressor Model</label>
              <input value={form.compressor_model} onChange={e => set('compressor_model', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Site Location</label>
              <input value={form.site_location} onChange={e => set('site_location', e.target.value)} className={INPUT} /></div>
          </div>
        </section>

        {/* AMC + HMR */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <p className={SECTION}>AMC & HMR Details</p>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={LABEL}>AMC Status</label>
              <select value={form.amc_status} onChange={e => set('amc_status', e.target.value)} className={INPUT}>
                <option value="">— Select —</option>
                <option>AMC</option><option>No AMC</option>
              </select></div>
            <div><label className={LABEL}>AMC Registration No</label>
              <input value={form.amc_registration_no} onChange={e => set('amc_registration_no', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>AMC Visit No</label>
              <input value={form.amc_visit_no} onChange={e => set('amc_visit_no', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Load HMR</label>
              <input type="number" min="0" step="0.01" value={form.load_hmr} onChange={e => set('load_hmr', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Unload HMR</label>
              <input type="number" min="0" step="0.01" value={form.unload_hmr} onChange={e => set('unload_hmr', e.target.value)} className={INPUT} /></div>
            <div>
              <label className={LABEL}>Total HMR {hmrError && <span className="text-red-500 normal-case font-normal">({hmrError})</span>}</label>
              <input type="number" min="0" step="0.01" value={form.total_hmr}
                onChange={e => { set('total_hmr', e.target.value); setHmrError(''); }}
                className={`${INPUT} ${hmrError ? 'border-red-400 ring-red-300' : ''}`} />
            </div>
            <div><label className={LABEL}>Next Service Due On</label>
              <input type="date" value={form.next_service_due_on} onChange={e => set('next_service_due_on', e.target.value)} className={INPUT} /></div>
          </div>
        </section>

        {/* Parameters */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <p className={SECTION}>Parameters <span className="text-amber-500 normal-case font-normal text-xs">(★ = mandatory — leave blank to show N/A)</span></p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-brand text-white">
                  <th className="px-3 py-2 text-left font-medium">Parameter</th>
                  <th className="px-3 py-2 text-center font-medium w-40">Actuals</th>
                  <th className="px-3 py-2 text-center font-medium w-32">Response</th>
                </tr>
              </thead>
              <tbody>
                {PARAMS.map((p, i) => (
                  <tr key={p.key} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${p.mandatory ? 'bg-amber-50!' : ''}`}>
                    <td className={`px-3 py-1.5 text-gray-700 ${p.mandatory ? 'font-medium' : ''}`}>
                      {p.mandatory && <span className="text-amber-500 mr-1">★</span>}{p.label}
                    </td>
                    <td className="px-2 py-1">
                      {p.hasActual ? (
                        <input
                          value={params[p.key]?.actual ?? ''}
                          onChange={e => setParam(p.key, 'actual', e.target.value)}
                          placeholder={p.mandatory ? 'N/A if blank' : ''}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      ) : <span className="text-gray-300 text-xs text-center block">—</span>}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {p.hasResponse ? (
                        <select
                          value={params[p.key]?.response ?? ''}
                          onChange={e => setParam(p.key, 'response', e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          <option value="">—</option>
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Work Done */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <p className={SECTION}>Work Done</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={LABEL}>No. of Visits Made</label>
              <input type="number" min="0" value={form.no_of_visits} onChange={e => set('no_of_visits', e.target.value)} className={INPUT} /></div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className={LABEL}>Service Charges (₹)</label>
                <input type="number" min="0" step="0.01" value={form.service_charges} onChange={e => set('service_charges', e.target.value)} className={INPUT} />
              </div>
              <label className="flex items-center gap-2 mb-2 cursor-pointer text-sm text-gray-700 whitespace-nowrap">
                <input type="checkbox" checked={form.service_charges_applicable}
                  onChange={e => set('service_charges_applicable', e.target.checked)}
                  className="accent-brand" />
                Applicable
              </label>
            </div>
            <div className="col-span-2"><label className={LABEL}>Parts Recommended for Service</label>
              <textarea rows={2} value={form.parts_recommended} onChange={e => set('parts_recommended', e.target.value)} className={INPUT} /></div>
            <div className="col-span-2"><label className={LABEL}>Work Done</label>
              <textarea rows={4} value={form.work_done} onChange={e => set('work_done', e.target.value)} className={INPUT} /></div>
          </div>
        </section>

        {/* Engineer + Feedback */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <p className={SECTION}>Engineer & Feedback</p>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={LABEL}>Engineer</label>
              <input value={form.engineer} onChange={e => set('engineer', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Contact No</label>
              <input value={form.engineer_contact} onChange={e => set('engineer_contact', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Dealer</label>
              <input value={form.dealer} onChange={e => set('dealer', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Customer Feedback</label>
              <select value={form.customer_feedback} onChange={e => set('customer_feedback', e.target.value)} className={INPUT}>
                <option value="">— Select —</option>
                <option>Satisfied</option><option>Not Satisfied</option><option>Partially Satisfied</option>
              </select></div>
            <div><label className={LABEL}>Satisfaction %</label>
              <input type="number" min="0" max="100" value={form.customer_feedback_percentage}
                onChange={e => set('customer_feedback_percentage', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Feedback Remarks</label>
              <input value={form.customer_feedback_remarks} onChange={e => set('customer_feedback_remarks', e.target.value)} className={INPUT} /></div>
            <div className="col-span-3"><label className={LABEL}>Engineer Remarks</label>
              <textarea rows={3} value={form.engineer_remarks} onChange={e => set('engineer_remarks', e.target.value)} className={INPUT} /></div>
          </div>
        </section>

        {/* Signature */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className={SECTION + ' mb-0'}>Signature</p>
            <button type="button" onClick={() => { sigRef.current?.clear(); set('signature', ''); }}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded">
              Clear
            </button>
          </div>
          <SignaturePad ref={sigRef} value={form.signature} onChange={v => set('signature', v)} />
          <p className="text-xs text-gray-400 mt-1">Draw your signature above using mouse or touch.</p>
        </section>
      </div>

      {/* Mail Confirmation Modal */}
      {mailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMailModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-gray-800 mb-2">Report saved!</h3>
            <p className="text-sm text-gray-600 mb-1">Do you want to send this report by email?</p>
            {form.site_person_mail && (
              <p className="text-sm font-medium text-brand mb-4">{form.site_person_mail}</p>
            )}
            {!form.site_person_mail && (
              <p className="text-xs text-amber-600 mb-4">No email address on this report.</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => mailMutation.mutate()}
                disabled={!form.site_person_mail || mailMutation.isPending}
                className="flex-1 bg-brand text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
              >
                {mailMutation.isPending ? 'Sending...' : 'Generate & Send'}
              </button>
              <button onClick={() => { setMailModal(false); toast('Report saved.'); }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
                No, Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
