import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Eye, FileDown, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import {
  type Customer,
  type Document,
  type DocumentStatus,
  type DocumentType,
  type Material,
  type Supplier,
} from '../../types';
import { formatIndian, numberToWords } from '../../lib/numberToWords';
import { useToast } from '../../context/ToastContext';
import SlideOver from '../../components/SlideOver';

const COMPANY = {
  name: 'GO CARE SOLUTIONS',
  address: 'Old No. 14/36-D, New No. 36-D, Mahaliamman Kovil Street, Irugur, Coimbatore - 641 402',
  mobile: '8148302081 / 9360740074',
  pan: 'GTQPD3231K',
  gstin: '33GTQPD3231K1ZM',
  state: 'Tamil Nadu',
  stateCode: '33',
  email: 'gocaresolutions01@gmail.com',
};

const TYPE_TITLE: Record<DocumentType, string> = {
  invoice: 'TAX INVOICE',
  proforma_invoice: 'PROFORMA INVOICE',
  purchase_order: 'PURCHASE ORDER',
  quotation: 'QUOTATION',
};

const TYPE_DOC_LABEL: Record<DocumentType, string> = {
  invoice: 'Invoice No.',
  proforma_invoice: 'Proforma Invoice No.',
  purchase_order: 'Purchase Order No.',
  quotation: 'Quotation No.',
};

const TYPE_ROUTE: Record<DocumentType, string> = {
  invoice: 'invoices',
  proforma_invoice: 'proforma',
  purchase_order: 'purchase-orders',
  quotation: 'quotations',
};

const GST_LABEL_PREFIX: Record<DocumentType, string> = {
  invoice: 'OUTPUT',
  proforma_invoice: 'OUTPUT',
  purchase_order: 'INPUT',
  quotation: '',
};

const UNITS = ['Nos', 'Kg', 'Ltr', 'Box', 'Set', 'Pair', 'Meter', 'Sq.Ft', 'Hours', 'MT', 'Bag'];
const GST_RATES = [0, 5, 12, 18, 28];
const GST_OPTIONS = [
  { key: 'igst-18', label: 'IGST 18%', rate: 18, mode: 'igst' },
  { key: 'gst-18', label: 'GST 18% - (CGST 9%, SGST 9%)', rate: 18, mode: 'gst' },
  { key: 'gst-10', label: 'GST 10% - (CGST 5%, SGST 5%)', rate: 10, mode: 'gst' },
] as const;

type GstOptionKey = typeof GST_OPTIONS[number]['key'];
type QuickCreate =
  | { type: 'customer'; target: 'buyer' | 'consignee' }
  | { type: 'supplier' }
  | { type: 'material'; itemKey: number }
  | null;

let itemKey = 0;

interface Props {
  type: DocumentType;
}

interface LineItem {
  _key: number;
  material_id: number | null;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  per: string;
  discount_pct: number;
  gst_rate: number;
  amount: number;
  gst_amount: number;
}

interface Header {
  doc_number: string;
  date: string;
  reference_no: string;
  reference_date: string;
  other_reference: string;
  payment_terms: string;
  delivery_note: string;
  buyers_order_no: string;
  buyers_order_date: string;
  dispatch_doc_no: string;
  delivery_note_date: string;
  dispatched_through: string;
  destination: string;
  terms_of_delivery: string;
  quotation_no: string;
  quotation_date: string;
  packing_charges: string;
  pr_no: string;
  quotation_validity: string;
  notes: string;
}

interface CustomerForm {
  name: string;
  address: string;
  mobile: string;
  email: string;
  pan_number: string;
  gstin: string;
  state_name: string;
  state_code: string;
}

interface SupplierForm extends CustomerForm {
  contact_person: string;
}

interface MaterialForm {
  material_name: string;
  unit_of_measurement: string;
  hsn_code: string;
  default_rate: string;
  gst_rate: string;
}

function emptyHeader(): Header {
  return {
    doc_number: '',
    date: new Date().toISOString().slice(0, 10),
    reference_no: '',
    reference_date: '',
    other_reference: '',
    payment_terms: '',
    delivery_note: '',
    buyers_order_no: '',
    buyers_order_date: '',
    dispatch_doc_no: '',
    delivery_note_date: '',
    dispatched_through: '',
    destination: '',
    terms_of_delivery: '',
    quotation_no: '',
    quotation_date: '',
    packing_charges: '',
    pr_no: '',
    quotation_validity: '',
    notes: '',
  };
}

function emptyCustomerForm(): CustomerForm {
  return {
    name: '',
    address: '',
    mobile: '',
    email: '',
    pan_number: '',
    gstin: '',
    state_name: '',
    state_code: '',
  };
}

function emptySupplierForm(): SupplierForm {
  return { ...emptyCustomerForm(), contact_person: '' };
}

function emptyMaterialForm(): MaterialForm {
  return {
    material_name: '',
    unit_of_measurement: 'Nos',
    hsn_code: '',
    default_rate: '',
    gst_rate: '18',
  };
}

function unwrapResource<T>(payload: T | { data: T }): T {
  return payload && typeof payload === 'object' && 'data' in payload
    ? (payload as { data: T }).data
    : payload as T;
}

function calcAmounts(item: LineItem): LineItem {
  const amount = Number(((item.quantity * item.rate) * (1 - item.discount_pct / 100)).toFixed(2));
  const gst_amount = Number((amount * item.gst_rate / 100).toFixed(2));
  return { ...item, amount, gst_amount };
}

function newItem(gstRate = 18): LineItem {
  return calcAmounts({
    _key: ++itemKey,
    material_id: null,
    description: '',
    hsn_sac: '',
    quantity: 1,
    unit: '',
    rate: 0,
    per: '',
    discount_pct: 0,
    gst_rate: gstRate,
    amount: 0,
    gst_amount: 0,
  });
}

function numberInput(value: number) {
  return value === 0 ? '' : String(value);
}

function parseNumber(value: string) {
  return value === '' ? 0 : Number(value);
}

function optionFromDocument(doc: Document): GstOptionKey {
  const firstRate = doc.items?.[0]?.gst_rate ?? 18;
  if (doc.igst_amount > 0) return 'igst-18';
  return Math.round(firstRate) === 10 ? 'gst-10' : 'gst-18';
}

function MetaRow({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </label>
  );
}

interface EntitySelectProps<T extends { id: number; name: string }> {
  label: string;
  placeholder: string;
  options: T[];
  selected: T | null;
  onSelect: (item: T | null) => void;
  onCreate?: () => void;
  createLabel?: string;
  renderDetails?: (item: T) => React.ReactNode;
}

function EntitySelect<T extends { id: number; name: string }>({
  label,
  placeholder,
  options,
  selected,
  onSelect,
  onCreate,
  createLabel = 'Add New',
  renderDetails,
}: EntitySelectProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = options.filter(o => o.name.toLowerCase().includes(query.toLowerCase())).slice(0, 12);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand">{label}</p>
        {onCreate && (
          <button type="button" onClick={onCreate} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:text-brand-dark">
            <Plus size={13} /> {createLabel}
          </button>
        )}
      </div>
      <div ref={ref} className="relative">
        <input
          value={selected ? selected.name : query}
          onChange={e => {
            onSelect(null);
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        {open && !selected && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No matches</p>}
            {filtered.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setQuery('');
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-light"
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="mt-3 text-xs leading-5 text-gray-600">
          {renderDetails ? renderDetails(selected) : selected.name}
          <button type="button" onClick={() => onSelect(null)} className="mt-2 block text-[11px] font-semibold text-brand">
            Change
          </button>
        </div>
      )}
    </div>
  );
}

interface MatSearchProps {
  value: string;
  materials: Material[];
  onChange: (value: string) => void;
  onSelect: (material: Material) => void;
  onCreate: () => void;
}

function MatSearch({ value, materials, onChange, onSelect, onCreate }: MatSearchProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = materials.filter(m => m.material_name.toLowerCase().includes(value.toLowerCase())).slice(0, 10);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="flex min-w-[260px] gap-1">
        <input
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button type="button" onClick={onCreate} className="rounded border border-gray-200 px-2 text-brand hover:bg-brand-light">
          <Plus size={13} />
        </button>
      </div>
      {open && value && (
        <div className="absolute z-[100] mt-1 max-h-64 min-w-[360px] overflow-y-auto rounded-md border border-gray-200 bg-white shadow-xl">
          {filtered.map(material => (
            <button
              key={material.id}
              type="button"
              onClick={() => {
                onSelect(material);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-xs hover:bg-brand-light"
            >
              <span className="font-medium">{material.material_name}</span>
              <span className="ml-2 text-gray-400">HSN {material.hsn_code || '-'}</span>
            </button>
          ))}
          <button type="button" onClick={onCreate} className="block w-full border-t border-gray-100 px-3 py-2 text-left text-xs font-semibold text-brand">
            Add material
          </button>
        </div>
      )}
    </div>
  );
}

function StaticCompany({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-brand">{label}</p>
      <p className="text-sm font-bold text-gray-800">{COMPANY.name}</p>
      <p className="mt-1 text-xs leading-5 text-gray-600">{COMPANY.address}</p>
      <p className="text-xs text-gray-600">GSTIN: {COMPANY.gstin}</p>
      <p className="text-xs text-gray-600">State: {COMPANY.state} ({COMPANY.stateCode})</p>
    </div>
  );
}

export default function DocumentForm({ type }: Props) {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const route = TYPE_ROUTE[type];
  const gstPrefix = GST_LABEL_PREFIX[type];

  const [header, setHeader] = useState<Header>(emptyHeader);
  const [buyer, setBuyer] = useState<Customer | null>(null);
  const [consignee, setConsignee] = useState<Customer | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [gstOptionKey, setGstOptionKey] = useState<GstOptionKey>('gst-18');
  const selectedGst = GST_OPTIONS.find(option => option.key === gstOptionKey) ?? GST_OPTIONS[1];
  const [items, setItems] = useState<LineItem[]>(() => [newItem(selectedGst.rate)]);
  const [quickCreate, setQuickCreate] = useState<QuickCreate>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplierForm);
  const [materialForm, setMaterialForm] = useState<MaterialForm>(emptyMaterialForm);
  const [pdfAction, setPdfAction] = useState<'preview' | 'download' | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedStatus, setSavedStatus] = useState<DocumentStatus | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data.data as Customer[]),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then(r => r.data.data as Supplier[]),
  });
  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get('/materials').then(r => r.data.data as Material[]),
  });
  const { data: existingDoc } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.get(`/documents/${id}`).then(r => unwrapResource<Document>(r.data)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!isEdit) {
      api.get('/documents/next-number', { params: { type } })
        .then(r => setHeader(h => ({ ...h, doc_number: r.data.doc_number })))
        .catch(() => undefined);
    }
  }, [isEdit, type]);

  useEffect(() => {
    if (!existingDoc) return;
    setHeader({
      doc_number: existingDoc.doc_number || '',
      date: existingDoc.date || new Date().toISOString().slice(0, 10),
      reference_no: existingDoc.reference_no || '',
      reference_date: existingDoc.reference_date || '',
      other_reference: existingDoc.other_reference || '',
      payment_terms: existingDoc.payment_terms || '',
      delivery_note: existingDoc.delivery_note || '',
      buyers_order_no: existingDoc.buyers_order_no || '',
      buyers_order_date: existingDoc.buyers_order_date || '',
      dispatch_doc_no: existingDoc.dispatch_doc_no || '',
      delivery_note_date: existingDoc.delivery_note_date || '',
      dispatched_through: existingDoc.dispatched_through || '',
      destination: existingDoc.destination || '',
      terms_of_delivery: existingDoc.terms_of_delivery || '',
      quotation_no: existingDoc.quotation_no || '',
      quotation_date: existingDoc.quotation_date || '',
      packing_charges: existingDoc.packing_charges != null ? String(existingDoc.packing_charges) : '',
      pr_no: existingDoc.pr_no || '',
      quotation_validity: existingDoc.quotation_validity || '',
      notes: existingDoc.notes || '',
    });
    setBuyer(existingDoc.customer ?? null);
    setConsignee(existingDoc.consignee ?? null);
    setSupplier(existingDoc.supplier ?? null);
    setSavedStatus(existingDoc.status);
    setHasUnsavedChanges(false);
    const optionKey = optionFromDocument(existingDoc);
    const option = GST_OPTIONS.find(o => o.key === optionKey) ?? GST_OPTIONS[1];
    setGstOptionKey(optionKey);
    setItems((existingDoc.items?.length ? existingDoc.items : []).map(it => calcAmounts({
      _key: ++itemKey,
      material_id: it.material_id,
      description: it.description,
      hsn_sac: it.hsn_sac || '',
      quantity: it.quantity,
      unit: it.unit || '',
      rate: it.rate,
      per: it.per || '',
      discount_pct: it.discount_pct,
      gst_rate: option.rate,
      amount: 0,
      gst_amount: 0,
    })));
  }, [existingDoc]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const gstGroups: Record<number, number> = {};
    items.forEach(item => {
      if (item.gst_rate > 0) gstGroups[item.gst_rate] = (gstGroups[item.gst_rate] || 0) + item.gst_amount;
    });
    const totalGst = Object.values(gstGroups).reduce((sum, value) => sum + value, 0);
    const actual = subtotal + totalGst;
    const grandTotal = Math.round(actual);
    const roundOff = Number((grandTotal - actual).toFixed(2));
    const useIGST = selectedGst.mode === 'igst';
    return {
      subtotal,
      gstGroups,
      totalGst,
      grandTotal,
      roundOff,
      useIGST,
      cgst: useIGST ? 0 : totalGst / 2,
      sgst: useIGST ? 0 : totalGst / 2,
      igst: useIGST ? totalGst : 0,
      totalQty: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [items, selectedGst.mode]);

  function setH(field: keyof Header, value: string) {
    setHasUnsavedChanges(true);
    setHeader(prev => ({ ...prev, [field]: value }));
  }

  function updateItem(key: number, patch: Partial<LineItem>) {
    setHasUnsavedChanges(true);
    setItems(prev => prev.map(item => item._key === key ? calcAmounts({ ...item, ...patch }) : item));
  }

  function changeGstOption(key: GstOptionKey) {
    setHasUnsavedChanges(true);
    const option = GST_OPTIONS.find(o => o.key === key) ?? GST_OPTIONS[1];
    setGstOptionKey(key);
    setItems(prev => prev.map(item => calcAmounts({ ...item, gst_rate: option.rate })));
  }

  function addItem() {
    setHasUnsavedChanges(true);
    setItems(prev => [...prev, newItem(selectedGst.rate)]);
  }

  function removeItem(key: number) {
    setHasUnsavedChanges(true);
    setItems(prev => prev.length > 1 ? prev.filter(item => item._key !== key) : prev);
  }

  function selectMaterial(key: number, material: Material) {
    updateItem(key, {
      material_id: material.id,
      description: material.material_name,
      hsn_sac: material.hsn_code || '',
      unit: material.unit_of_measurement,
      per: material.unit_of_measurement,
      rate: material.default_rate,
      gst_rate: selectedGst.rate,
    });
  }

  function openQuickCustomer(target: 'buyer' | 'consignee') {
    setCustomerForm(emptyCustomerForm());
    setQuickCreate({ type: 'customer', target });
  }

  function openQuickSupplier() {
    setSupplierForm(emptySupplierForm());
    setQuickCreate({ type: 'supplier' });
  }

  function openQuickMaterial(itemKeyValue: number, name: string) {
    setMaterialForm({ ...emptyMaterialForm(), material_name: name });
    setQuickCreate({ type: 'material', itemKey: itemKeyValue });
  }

  const saveMutation = useMutation({
    mutationFn: async (status: DocumentStatus) => {
      const payload = {
        type,
        status,
        doc_number: header.doc_number,
        date: header.date,
        customer_id: type !== 'purchase_order' ? (buyer?.id ?? null) : null,
        consignee_id: type === 'invoice' || type === 'proforma_invoice' ? (consignee?.id ?? null) : null,
        supplier_id: type === 'purchase_order' ? (supplier?.id ?? null) : null,
        reference_no: header.reference_no || null,
        reference_date: header.reference_date || null,
        other_reference: header.other_reference || null,
        payment_terms: header.payment_terms || null,
        delivery_note: header.delivery_note || null,
        buyers_order_no: header.buyers_order_no || null,
        buyers_order_date: header.buyers_order_date || null,
        dispatch_doc_no: header.dispatch_doc_no || null,
        delivery_note_date: header.delivery_note_date || null,
        dispatched_through: header.dispatched_through || null,
        destination: header.destination || null,
        terms_of_delivery: header.terms_of_delivery || null,
        quotation_no: header.quotation_no || null,
        quotation_date: header.quotation_date || null,
        packing_charges: header.packing_charges ? parseFloat(header.packing_charges) : null,
        pr_no: header.pr_no || null,
        quotation_validity: header.quotation_validity || null,
        notes: header.notes || null,
        subtotal: totals.subtotal,
        cgst_amount: totals.cgst,
        sgst_amount: totals.sgst,
        igst_amount: totals.igst,
        round_off: totals.roundOff,
        grand_total: totals.grandTotal,
        items: items.map((item, index) => ({
          sl_no: index + 1,
          material_id: item.material_id,
          description: item.description,
          hsn_sac: item.hsn_sac || null,
          quantity: item.quantity,
          unit: item.unit || null,
          rate: item.rate,
          per: item.per || null,
          discount_pct: item.discount_pct,
          amount: item.amount,
          gst_rate: selectedGst.rate,
          gst_amount: item.gst_amount,
          sort_order: index,
        })),
      };
      return isEdit
        ? api.put(`/documents/${id}`, payload).then(r => unwrapResource<Document>(r.data))
        : api.post('/documents', payload).then(r => unwrapResource<Document>(r.data));
    },
    onSuccess: (doc, status) => {
      toast(`Document ${status === 'draft' ? 'saved as draft' : 'confirmed'}.`);
      qc.invalidateQueries({ queryKey: ['documents'] });
      setSavedStatus(status);
      setHasUnsavedChanges(false);
      if (!isEdit) navigate(`/${route}/${doc.id}`);
    },
    onError: (error: any) => {
      toast(error?.response?.data?.message || 'Save failed.', 'error');
    },
  });

  const quickCustomerMutation = useMutation({
    mutationFn: (payload: CustomerForm) => api.post('/customers', payload).then(r => unwrapResource<Customer>(r.data)),
    onSuccess: customer => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setHasUnsavedChanges(true);
      if (quickCreate?.type === 'customer' && quickCreate.target === 'consignee') setConsignee(customer);
      else setBuyer(customer);
      setQuickCreate(null);
      toast('Customer added.');
    },
    onError: () => toast('Customer save failed.', 'error'),
  });

  const quickSupplierMutation = useMutation({
    mutationFn: (payload: SupplierForm) => api.post('/suppliers', payload).then(r => unwrapResource<Supplier>(r.data)),
    onSuccess: createdSupplier => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setHasUnsavedChanges(true);
      setSupplier(createdSupplier);
      setQuickCreate(null);
      toast('Supplier added.');
    },
    onError: () => toast('Supplier save failed.', 'error'),
  });

  const quickMaterialMutation = useMutation({
    mutationFn: (payload: MaterialForm) => api.post('/materials', {
      ...payload,
      default_rate: parseFloat(payload.default_rate) || 0,
      gst_rate: parseFloat(payload.gst_rate) || 0,
      is_active: true,
    }).then(r => unwrapResource<Material>(r.data)),
    onSuccess: material => {
      qc.invalidateQueries({ queryKey: ['materials'] });
      if (quickCreate?.type === 'material') selectMaterial(quickCreate.itemKey, material);
      setQuickCreate(null);
      toast('Material added.');
    },
    onError: () => toast('Material save failed.', 'error'),
  });

  async function downloadPdf() {
    if (!id || pdfAction || !canGeneratePdf) return;
    setPdfAction('download');
    try {
      const response = await api.get(`/documents/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${header.doc_number || id}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      toast('Failed to download PDF.', 'error');
    } finally {
      setPdfAction(null);
    }
  }

  async function previewPdf() {
    if (!id || pdfAction || !canGeneratePdf) return;
    setPdfAction('preview');
    try {
      const response = await api.get(`/documents/${id}/preview`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      toast('Failed to open PDF preview.', 'error');
    } finally {
      setPdfAction(null);
    }
  }

  const canGeneratePdf = isEdit && savedStatus === 'confirmed' && !hasUnsavedChanges && !saveMutation.isPending;
  const pdfDisabledReason = hasUnsavedChanges
    ? 'Confirm the latest changes before generating the PDF.'
    : savedStatus !== 'confirmed'
      ? 'Confirm the document before generating the PDF.'
      : '';

  const customerDetails = (customer: Customer) => (
    <>
      <p className="font-semibold text-gray-800">{customer.name}</p>
      <p>{customer.address}</p>
      <p>Mobile: {customer.mobile}</p>
      {customer.gstin && <p>GSTIN: {customer.gstin}</p>}
      {customer.state_name && <p>State: {customer.state_name} ({customer.state_code || '-'})</p>}
    </>
  );

  const supplierDetails = (item: Supplier) => (
    <>
      <p className="font-semibold text-gray-800">{item.name}</p>
      <p>{item.address}</p>
      <p>Mobile: {item.mobile}</p>
      {item.gstin && <p>GSTIN: {item.gstin}</p>}
      {item.state_name && <p>State: {item.state_name} ({item.state_code || '-'})</p>}
    </>
  );

  return (
    <div className="mx-auto max-w-[1280px] pb-24">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">{isEdit ? 'Edit document' : 'Create document'}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-wide text-gray-900">{TYPE_TITLE[type]}</h1>
          <p className="mt-1 text-sm text-gray-500">{header.doc_number || 'Document number will be generated automatically'}</p>
        </div>
        <div className="rounded-md bg-brand px-5 py-3 text-right text-white shadow-sm">
          <p className="text-sm font-bold">{COMPANY.name}</p>
          <p className="mt-1 text-xs opacity-90">PAN: {COMPANY.pan} | GSTIN: {COMPANY.gstin} | {COMPANY.state} ({COMPANY.stateCode})</p>
        </div>
      </div>

      <div className="space-y-5">
        <section className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetaRow label={TYPE_DOC_LABEL[type]} value={header.doc_number} onChange={value => setH('doc_number', value)} />
            <MetaRow label="Dated" value={header.date} onChange={value => setH('date', value)} type="date" />
            {type === 'purchase_order' && (
              <>
                <MetaRow label="Quotation No." value={header.quotation_no} onChange={value => setH('quotation_no', value)} />
                <MetaRow label="Quotation Date" value={header.quotation_date} onChange={value => setH('quotation_date', value)} type="date" />
              </>
            )}
            {(type === 'invoice' || type === 'proforma_invoice') && (
              <>
                <MetaRow label="Delivery Note" value={header.delivery_note} onChange={value => setH('delivery_note', value)} />
                <MetaRow label="Mode/Terms of payment" value={header.payment_terms} onChange={value => setH('payment_terms', value)} />
              </>
            )}
            {type === 'quotation' && (
              <>
                <MetaRow label="PR No." value={header.pr_no} onChange={value => setH('pr_no', value)} />
                <MetaRow label="Mode/Terms of payment" value={header.payment_terms} onChange={value => setH('payment_terms', value)} />
              </>
            )}
            <MetaRow label="Reference No." value={header.reference_no} onChange={value => setH('reference_no', value)} />
            <MetaRow label="Reference Date" value={header.reference_date} onChange={value => setH('reference_date', value)} type="date" />
            <MetaRow label="Other Reference" value={header.other_reference} onChange={value => setH('other_reference', value)} />
            {type === 'purchase_order' && (
              <>
                <MetaRow label="Mode/Terms of payment" value={header.payment_terms} onChange={value => setH('payment_terms', value)} />
                <MetaRow label="Packing & Forwarding Charges" value={header.packing_charges} onChange={value => setH('packing_charges', value)} type="number" />
              </>
            )}
            {(type === 'invoice' || type === 'proforma_invoice') && (
              <>
                <MetaRow label="Buyer's Order No." value={header.buyers_order_no} onChange={value => setH('buyers_order_no', value)} />
                <MetaRow label="Buyer's Order Date" value={header.buyers_order_date} onChange={value => setH('buyers_order_date', value)} type="date" />
                <MetaRow label="Dispatch Doc No." value={header.dispatch_doc_no} onChange={value => setH('dispatch_doc_no', value)} />
                <MetaRow label="Delivery Note Date" value={header.delivery_note_date} onChange={value => setH('delivery_note_date', value)} type="date" />
              </>
            )}
            {type !== 'quotation' && (
              <>
                <MetaRow label="Dispatched Through" value={header.dispatched_through} onChange={value => setH('dispatched_through', value)} />
                <MetaRow label="Destination" value={header.destination} onChange={value => setH('destination', value)} />
              </>
            )}
            {type === 'quotation' && (
              <>
                <MetaRow label="Delivery" value={header.delivery_note} onChange={value => setH('delivery_note', value)} />
                <MetaRow label="Quotation Validity" value={header.quotation_validity} onChange={value => setH('quotation_validity', value)} />
              </>
            )}
            <MetaRow label="Terms of Delivery" value={header.terms_of_delivery} onChange={value => setH('terms_of_delivery', value)} />
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-sm font-bold text-gray-800">Parties</h2>
            <p className="text-xs text-gray-500">Select billing, shipping, buyer or supplier details</p>
          </div>
          <div className={`grid gap-4 ${type === 'purchase_order' ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {(type === 'invoice' || type === 'proforma_invoice') && (
              <>
                <EntitySelect<Customer> label="Consignee (Ship To)" placeholder="Search customer..." options={customers} selected={consignee} onSelect={value => { setHasUnsavedChanges(true); setConsignee(value); }} onCreate={() => openQuickCustomer('consignee')} createLabel="Add Customer" renderDetails={customerDetails} />
                <EntitySelect<Customer> label="Buyer (Bill To)" placeholder="Search customer..." options={customers} selected={buyer} onSelect={value => { setHasUnsavedChanges(true); setBuyer(value); }} onCreate={() => openQuickCustomer('buyer')} createLabel="Add Customer" renderDetails={customerDetails} />
              </>
            )}
            {type === 'purchase_order' && (
              <>
                <StaticCompany label="Invoice To" />
                <StaticCompany label="Consignee (Ship To)" />
                <EntitySelect<Supplier> label="Supplier (Bill From)" placeholder="Search supplier..." options={suppliers} selected={supplier} onSelect={value => { setHasUnsavedChanges(true); setSupplier(value); }} onCreate={openQuickSupplier} createLabel="Add Supplier" renderDetails={supplierDetails} />
              </>
            )}
            {type === 'quotation' && (
              <EntitySelect<Customer> label="Buyer" placeholder="Search customer..." options={customers} selected={buyer} onSelect={value => { setHasUnsavedChanges(true); setBuyer(value); }} onCreate={() => openQuickCustomer('buyer')} createLabel="Add Customer" renderDetails={customerDetails} />
            )}
          </div>
        </section>

        <section className="overflow-visible rounded-md border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div>
              <p className="text-xs text-gray-500">Add materials, quantity, rate and discount</p>
            </div>
            <button type="button" onClick={addItem} className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-dark">
              <Plus size={14} /> Add Row
            </button>
          </div>
          <div className="overflow-visible">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-brand text-white">
                  <th className="w-12 border border-brand-dark px-2 py-2 text-center">S.No</th>
                  <th className="min-w-[180px] border border-brand-dark px-2 py-2 text-left">Description of Goods</th>
                  <th className="w-20 border border-brand-dark px-2 py-2 text-center">HSN/SAC</th>
                  <th className="w-16 border border-brand-dark px-2 py-2 text-center">Qty</th>
                  <th className="w-20 border border-brand-dark px-2 py-2 text-center">Rate (Rs.)</th>
                  <th className="w-16 border border-brand-dark px-2 py-2 text-center">Per</th>
                  <th className="w-14 border border-brand-dark px-2 py-2 text-center">Disc.%</th>
                  <th className="w-24 border border-brand-dark px-2 py-2 text-right">Amount (Rs.)</th>
                  <th className="w-6 border border-brand-dark px-1 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item._key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-200 px-2 py-1 text-center text-gray-500">{index + 1}</td>
                    <td className="border border-gray-200 px-1 py-1">
                      <MatSearch value={item.description} materials={materials} onChange={value => updateItem(item._key, { description: value, material_id: null })} onSelect={material => selectMaterial(item._key, material)} onCreate={() => openQuickMaterial(item._key, item.description)} />
                    </td>
                    <td className="border border-gray-200 px-1 py-1">
                      <input value={item.hsn_sac} onChange={e => updateItem(item._key, { hsn_sac: e.target.value })} className="w-full rounded border border-gray-200 px-2 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-brand" />
                    </td>
                    <td className="border border-gray-200 px-1 py-1">
                      <input type="number" min="0" step="0.001" value={numberInput(item.quantity)} onChange={e => updateItem(item._key, { quantity: parseNumber(e.target.value) })} className="w-full rounded border border-gray-200 px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-brand" />
                    </td>
                    <td className="border border-gray-200 px-1 py-1">
                      <input type="number" min="0" step="0.01" value={numberInput(item.rate)} onChange={e => updateItem(item._key, { rate: parseNumber(e.target.value) })} className="w-full rounded border border-gray-200 px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-brand" />
                    </td>
                    <td className="border border-gray-200 px-1 py-1">
                      <input value={item.per} onChange={e => updateItem(item._key, { per: e.target.value, unit: e.target.value })} className="w-full rounded border border-gray-200 px-2 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-brand" />
                    </td>
                    <td className="border border-gray-200 px-1 py-1">
                      <input type="number" min="0" max="100" step="0.01" value={numberInput(item.discount_pct)} onChange={e => updateItem(item._key, { discount_pct: parseNumber(e.target.value) })} className="w-full rounded border border-gray-200 px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-brand" />
                    </td>
                    <td className="border border-gray-200 px-2 py-1 text-right font-medium text-gray-700">{formatIndian(item.amount)}</td>
                    <td className="border border-gray-200 px-1 py-1 text-center">
                      <button type="button" onClick={() => removeItem(item._key)} className="text-brand hover:text-brand-dark">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">GST Percentage</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {GST_OPTIONS.map(option => (
              <label key={option.key} className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
                <input
                  type="radio"
                  name="gst-option"
                  checked={gstOptionKey === option.key}
                  onChange={() => changeGstOption(option.key)}
                  className="h-4 w-4 accent-brand"
                />
                <span className="font-medium text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-800">Totals</h2>
            <p className="text-xs text-gray-500">Live calculation for quantity, tax and amount</p>
          </div>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2 text-gray-600">Subtotal</td>
                <td className="px-4 py-2 text-right font-medium">Rs. {formatIndian(totals.subtotal)}</td>
              </tr>
              {Object.entries(totals.gstGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, gstAmt]) => (
                totals.useIGST ? (
                  <tr key={rate} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-600">IGST Tax @ {rate}%</td>
                    <td className="px-4 py-2 text-right font-medium">Rs. {formatIndian(gstAmt)}</td>
                  </tr>
                ) : (
                  <tr key={rate} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-600">{gstPrefix} GST @ {rate}% (CGST {Number(rate) / 2}% + SGST {Number(rate) / 2}%)</td>
                    <td className="px-4 py-2 text-right font-medium">Rs. {formatIndian(gstAmt)}</td>
                  </tr>
                )
              ))}
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2 text-gray-600">Round Off</td>
                <td className="px-4 py-2 text-right">{totals.roundOff >= 0 ? '+' : ''}{formatIndian(totals.roundOff)}</td>
              </tr>
              <tr className="bg-brand-light">
                <td className="px-4 py-2.5 font-bold text-gray-800">
                  Total
                  <span className="ml-3 text-xs font-normal text-gray-500">Qty: {totals.totalQty.toFixed(2)}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-brand">Rs. {formatIndian(totals.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Amount Chargeable (in words)</p>
            <p className="text-xs font-medium text-gray-700">{numberToWords(totals.grandTotal)} <span className="text-gray-400">(E. &amp; O.E)</span></p>
            <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Tax Amount (in words)</p>
            <p className="text-xs text-gray-700">{numberToWords(totals.totalGst)}</p>
          </div>
        </section>

        <section className="rounded-md border border-gray-200 bg-white p-5 shadow-sm">
          <label className="mb-1 block text-sm font-bold text-gray-800">Notes / Terms &amp; Conditions</label>
          <textarea rows={3} value={header.notes} onChange={e => setH('notes', e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" placeholder="Any additional notes or terms..." />
        </section>

        <div className="flex flex-wrap gap-3 no-print">
          <button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate('draft')} className="flex items-center gap-2 rounded-lg bg-gray-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            <Save size={16} /> {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
          </button>
          <button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate('confirmed')} className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
            <CheckCircle size={16} /> Confirm
          </button>
          {isEdit && (
            <>
              <button type="button" disabled={Boolean(pdfAction) || !canGeneratePdf} onClick={previewPdf} title={pdfDisabledReason} className="flex items-center gap-2 rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50">
                {pdfAction === 'preview' ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                {pdfAction === 'preview' ? 'Opening...' : 'Preview PDF'}
              </button>
              <button type="button" disabled={Boolean(pdfAction) || !canGeneratePdf} onClick={downloadPdf} title={pdfDisabledReason} className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
                {pdfAction === 'download' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                {pdfAction === 'download' ? 'Generating...' : 'Generate PDF'}
              </button>
              {pdfDisabledReason && <p className="basis-full text-xs font-medium text-amber-700">{pdfDisabledReason}</p>}
            </>
          )}
        </div>
      </div>

      <SlideOver open={quickCreate?.type === 'customer'} onClose={() => setQuickCreate(null)} title="Add Customer">
        <form onSubmit={e => { e.preventDefault(); quickCustomerMutation.mutate(customerForm); }} className="space-y-4">
          {([
            ['name', 'Name *', true],
            ['mobile', 'Mobile *', true],
            ['email', 'Email', false],
            ['state_name', 'State Name', false],
            ['state_code', 'State Code', false],
          ] as const).map(([field, label, required]) => (
            <div key={field}>
              <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
              <input required={required} value={customerForm[field]} onChange={e => setCustomerForm(f => ({ ...f, [field]: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Address *</label>
            <textarea required rows={3} value={customerForm.address} onChange={e => setCustomerForm(f => ({ ...f, address: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">PAN Number</label>
            <input value={customerForm.pan_number} onChange={e => setCustomerForm(f => ({ ...f, pan_number: e.target.value.toUpperCase() }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">GSTIN</label>
            <input value={customerForm.gstin} onChange={e => setCustomerForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={quickCustomerMutation.isPending} className="flex-1 rounded-lg bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">{quickCustomerMutation.isPending ? 'Saving...' : 'Save Customer'}</button>
            <button type="button" onClick={() => setQuickCreate(null)} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      </SlideOver>

      <SlideOver open={quickCreate?.type === 'supplier'} onClose={() => setQuickCreate(null)} title="Add Supplier">
        <form onSubmit={e => { e.preventDefault(); quickSupplierMutation.mutate(supplierForm); }} className="space-y-4">
          {([
            ['name', 'Name *', true],
            ['contact_person', 'Contact Person', false],
            ['mobile', 'Mobile *', true],
            ['email', 'Email', false],
            ['state_name', 'State Name', false],
            ['state_code', 'State Code', false],
          ] as const).map(([field, label, required]) => (
            <div key={field}>
              <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
              <input required={required} value={supplierForm[field]} onChange={e => setSupplierForm(f => ({ ...f, [field]: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Address *</label>
            <textarea required rows={3} value={supplierForm.address} onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">PAN Number</label>
            <input value={supplierForm.pan_number} onChange={e => setSupplierForm(f => ({ ...f, pan_number: e.target.value.toUpperCase() }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">GSTIN</label>
            <input value={supplierForm.gstin} onChange={e => setSupplierForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={quickSupplierMutation.isPending} className="flex-1 rounded-lg bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">{quickSupplierMutation.isPending ? 'Saving...' : 'Save Supplier'}</button>
            <button type="button" onClick={() => setQuickCreate(null)} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      </SlideOver>

      <SlideOver open={quickCreate?.type === 'material'} onClose={() => setQuickCreate(null)} title="Add Material">
        <form onSubmit={e => { e.preventDefault(); quickMaterialMutation.mutate(materialForm); }} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Material Name *</label>
            <input required value={materialForm.material_name} onChange={e => setMaterialForm(f => ({ ...f, material_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Unit of Measurement *</label>
            <select required value={materialForm.unit_of_measurement} onChange={e => setMaterialForm(f => ({ ...f, unit_of_measurement: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              {UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">HSN Code</label>
            <input value={materialForm.hsn_code} onChange={e => setMaterialForm(f => ({ ...f, hsn_code: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Default Rate *</label>
            <input required type="number" step="0.01" min="0" value={materialForm.default_rate} onChange={e => setMaterialForm(f => ({ ...f, default_rate: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">GST Rate *</label>
            <select required value={materialForm.gst_rate} onChange={e => setMaterialForm(f => ({ ...f, gst_rate: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              {GST_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={quickMaterialMutation.isPending} className="flex-1 rounded-lg bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">{quickMaterialMutation.isPending ? 'Saving...' : 'Save Material'}</button>
            <button type="button" onClick={() => setQuickCreate(null)} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
