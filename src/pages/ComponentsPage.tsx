import { useEffect, useMemo, useRef, useState } from "react";
import DataTable, { type Column } from "@/components/data-display/DataTable";
import EmptyState from "@/components/data-display/EmptyState";
import KpiCard from "@/components/data-display/KpiCard";
import Stepper from "@/components/data-display/Stepper";
import Timeline from "@/components/data-display/Timeline";
import Alert from "@/components/feedback/Alert";
import Drawer from "@/components/feedback/Drawer";
import Modal from "@/components/feedback/Modal";
import Checkbox from "@/components/forms/Checkbox";
import { FormActions, SelectField, TextAreaField, TextField } from "@/components/forms/Field";
import Radio from "@/components/forms/Radio";
import Switch from "@/components/forms/Switch";
import Upload from "@/components/forms/Upload";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Button, { IconButton } from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import Tabs from "@/components/ui/Tabs";
import { branches, quotations } from "@/data/mockData";
import useEscapeKey from "@/hooks/useEscapeKey";
import { useToast } from "@/hooks/useToast";
import type { Quotation, QuotationStatus } from "@/types";
import { formatINR, isCertificateNumber, isPhone } from "@/utils";

const categories = ["Overview", "Forms", "Data display", "Feedback"];
const statusTone: Record<QuotationStatus, BadgeTone> = {
  Approved: "emerald",
  Review: "amber",
  Draft: "neutral",
  Expired: "danger",
};
const allStatuses: QuotationStatus[] = ["Approved", "Review", "Draft", "Expired"];

interface QuotationForm {
  name: string;
  branch: string;
  date: string;
  phone: string;
  value: string;
  certificate: string;
}

const initialForm: QuotationForm = {
  name: "Aarav Mehta Distributors",
  branch: "jaipur",
  date: "2026-03-08",
  phone: "9820145872",
  value: "4,85,000",
  certificate: "NABL-6247119928",
};

export default function ComponentsPage() {
  const toast = useToast();
  const [tab, setTab] = useState("Overview");
  const show = (category: string) => tab === "Overview" || tab === category;

  // Actions demo state
  const [checked, setChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("selected");
  const [notifOn, setNotifOn] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);

  // Form demo state
  const [savedForm, setSavedForm] = useState<QuotationForm>(initialForm);
  const [form, setForm] = useState<QuotationForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof QuotationForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const timersRef = useRef<number[]>([]);
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(t => window.clearTimeout(t));
  }, []);
  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const setField = (key: keyof QuotationForm, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const validate = (): typeof errors => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Customer name is required";
    if (!isPhone(form.phone)) next.phone = "Enter a valid 10-digit phone number";
    if (!form.certificate.trim()) next.certificate = "Certificate number is required";
    else if (!isCertificateNumber(form.certificate)) next.certificate = "Certificate number is not recognised";
    return next;
  };

  const saveForm = () => {
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      toast({ tone: "error", title: "Please review the form", message: "Some fields need attention before saving." });
      return;
    }
    setSaving(true);
    later(() => {
      setSaving(false);
      setSavedForm(form);
      toast({ tone: "success", title: "Draft saved", message: "Customer quotation details were updated." });
    }, 900);
  };

  const cancelForm = () => {
    setForm(savedForm);
    setErrors({});
  };

  // Table state
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatus[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  useEscapeKey(() => setFilterOpen(false), filterOpen);
  const [selected, setSelected] = useState<string[]>(["QT-260184"]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotations.filter(row => {
      if (statusFilter.length && !statusFilter.includes(row.status)) return false;
      if (!q) return true;
      return `${row.id} ${row.customer} ${row.product} ${row.owner}`.toLowerCase().includes(q);
    });
  }, [query, statusFilter]);

  const columns: Column<Quotation>[] = [
    {
      key: "id",
      label: "Quotation ID",
      sortable: true,
      hideable: false,
      sortValue: r => r.id,
      render: r => <b className="link">{r.id}</b>,
    },
    { key: "customer", label: "Customer", sortable: true, sortValue: r => r.customer },
    { key: "product", label: "Product" },
    {
      key: "value",
      label: "Value",
      sortable: true,
      sortValue: r => r.value,
      render: r => <strong>{formatINR(r.value)}</strong>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      sortValue: r => r.status,
      render: r => <Badge tone={statusTone[r.status]}>{r.status}</Badge>,
    },
    { key: "owner", label: "Owner" },
    { key: "created", label: "Created" },
  ];

  // Overlay demo state
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");

  const submitApproval = () => {
    setModalOpen(false);
    setApprovalNote("");
    toast({ tone: "success", title: "Sent for approval", message: "QT-260184 was routed to the Shop Manager." });
  };

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">REUSABLE COMPONENT LIBRARY</p>
          <h1>Built for confident operations.</h1>
          <p>Tactile, accessible primitives composed for complex CRM and ERP workflows.</p>
        </div>
        <div className="version-pill">v1.5 <span>Complete</span></div>
      </div>
      <Tabs tabs={categories} active={tab} onChange={setTab} label="Component categories" />

      {show("Forms") && (
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="kicker">ACTIONS</p>
              <h2>Buttons & controls</h2>
            </div>
            <Badge tone="emerald">12 variants</Badge>
          </div>
          <div className="component-line">
            <Button>Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="gold"><Icon name="gem" /> Premium</Button>
            <Button variant="danger">Delete</Button>
            <Button variant="ghost">Ghost action</Button>
            <Button disabled>Disabled</Button>
            <Button
              loading={demoLoading}
              onClick={() => {
                setDemoLoading(true);
                later(() => {
                  setDemoLoading(false);
                  toast({ tone: "success", title: "Action completed" });
                }, 1400);
              }}
            >
              {demoLoading ? "Saving..." : "Loading button"}
            </Button>
            <IconButton label="More actions"><Icon name="more" /></IconButton>
          </div>
          <div className="control-line">
            <Checkbox label="Remember selection" checked={checked} onChange={setChecked} />
            <Radio name="demo-radio" label="Selected" checked={radioValue === "selected"} onChange={() => setRadioValue("selected")} />
            <Radio name="demo-radio" label="Default" checked={radioValue === "default"} onChange={() => setRadioValue("default")} />
            <Switch on={notifOn} onChange={setNotifOn} label="Notifications enabled" />
            <span className="muted">{notifOn ? "Notifications enabled" : "Notifications paused"}</span>
            <span className="muted inline-spinner"><Spinner size={14} label="Loading example" /> Inline loading</span>
          </div>
        </section>
      )}

      {show("Forms") && (
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="kicker">FORM CONTROLS</p>
              <h2>Inputs, selects & upload</h2>
            </div>
            <span>Validation · inset depth · visible focus</span>
          </div>
          <div className="form-grid">
            <TextField
              label="Customer name"
              required
              value={form.name}
              onChange={e => setField("name", e.target.value)}
              error={errors.name}
              helper="As shown on official documents"
            />
            <SelectField label="Branch" value={form.branch} onChange={e => setField("branch", e.target.value)}>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </SelectField>
            <TextField
              label="Valuation date"
              type="date"
              icon="calendar"
              value={form.date}
              onChange={e => setField("date", e.target.value)}
            />
            <TextField
              label="Phone number"
              prefix="+91"
              inputMode="numeric"
              value={form.phone}
              onChange={e => setField("phone", e.target.value)}
              error={errors.phone}
              success={!errors.phone && isPhone(form.phone) ? "Verified number" : undefined}
            />
            <TextField
              label="Quotation value"
              prefix="₹"
              value={form.value}
              onChange={e => setField("value", e.target.value)}
            />
            <TextField
              label="Certificate number"
              required
              value={form.certificate}
              onChange={e => setField("certificate", e.target.value)}
              error={errors.certificate}
              helper="Format: NABL-6247119928"
            />
          </div>
          <Upload onFile={name => toast({ tone: "info", title: "File attached", message: name })} />
          <FormActions dirty={dirty} saving={saving} onSave={saveForm} onCancel={cancelForm} saveLabel="Save draft" />
        </section>
      )}

      {show("Data display") && (
        <div className="kpi-grid">
          <KpiCard label="Inventory value" value="₹8.42 Cr" note="↑ 8.4% this month" noteTone="up" icon="gem" iconTone="royal" />
          <KpiCard label="Active quotations" value="28" note="₹32.8L potential value" icon="check" iconTone="emerald" />
          <KpiCard label="Tasks due today" value="12" note="4 need attention" noteTone="warning" icon="calendar" iconTone="gold" />
          <KpiCard label="Supplier payables" loading />
        </div>
      )}

      {show("Data display") && (
        <section className="panel table-panel">
          <div className="section-head">
            <div>
              <p className="kicker">DATA TABLE</p>
              <h2>Recent quotations</h2>
            </div>
            <div className="table-actions">
              <div className="small-search">
                <Icon name="search" />
                <input
                  placeholder="Search quotations"
                  aria-label="Search quotations"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div className="filter-anchor">
                <Button variant="secondary" onClick={() => setFilterOpen(o => !o)} aria-expanded={filterOpen}>
                  <Icon name="filter" /> Filter{statusFilter.length > 0 && ` · ${statusFilter.length}`}
                </Button>
                {filterOpen && (
                  <>
                    <div className="popover-backdrop" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                    <div className="filter-pop" role="group" aria-label="Filter by status">
                      <p>FILTER BY STATUS</p>
                      {allStatuses.map(status => (
                        <Checkbox
                          key={status}
                          label={status}
                          checked={statusFilter.includes(status)}
                          onChange={on =>
                            setStatusFilter(f => (on ? [...f, status] : f.filter(s => s !== status)))
                          }
                        />
                      ))}
                      <button type="button" className="link-btn" onClick={() => setStatusFilter([])}>
                        Clear filter
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {selected.length > 0 && (
            <div className="bulk-bar">
              <strong>{selected.length} selected</strong>
              <button
                type="button"
                onClick={() => toast({ tone: "success", title: "Export started", message: `${selected.length} quotations queued as PDF.` })}
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => toast({ tone: "info", title: "Assign owner", message: "Owner assignment ships with the Sales phase." })}
              >
                Assign owner
              </button>
              <button type="button" onClick={() => setSelected([])}>Clear</button>
            </div>
          )}
          <DataTable
            columns={columns}
            rows={filteredRows}
            rowKey={r => r.id}
            rowLabel={r => `quotation ${r.id}`}
            pageSize={5}
            selected={selected}
            onSelectedChange={setSelected}
            emptyState={
              <EmptyState
                icon="search"
                title="No matching quotations"
                description="Try another keyword or clear the status filter."
                mini
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setStatusFilter([]);
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            }
          />
        </section>
      )}

      {show("Data display") && (
        <div className="two-col">
          <section className="panel">
            <div className="section-head">
              <div>
                <p className="kicker">TIMELINE</p>
                <h2>Activity history</h2>
              </div>
            </div>
            <Timeline
              items={[
                { title: "Quotation approved", meta: "Today, 10:24 AM", state: "done" },
                { title: "Customer notified", meta: "Today, 10:27 AM", state: "done" },
                { title: "Awaiting advance payment", meta: "Due 12 Mar 2026", state: "current" },
              ]}
            />
          </section>
          <section className="panel">
            <div className="section-head">
              <div>
                <p className="kicker">STEPPER</p>
                <h2>Create customer</h2>
              </div>
            </div>
            <Stepper steps={["Basic details", "Contact", "Preferences", "Review"]} current={2} />
            <EmptyState
              icon="gem"
              title="No preferences added"
              description="Add product-category interests so the account manager can target the right range."
              mini
              action={
                <Button variant="secondary" onClick={() => toast({ tone: "info", title: "Preferences", message: "Customer preferences arrive with the CRM phase." })}>
                  <Icon name="plus" /> Add preference
                </Button>
              }
            />
          </section>
        </div>
      )}

      {show("Feedback") && (
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="kicker">FEEDBACK & OVERLAYS</p>
              <h2>Alerts, modal, drawer & toast</h2>
            </div>
          </div>
          <div className="alert-grid">
            <Alert tone="info" title="Information">GST rate is inherited from the product category.</Alert>
            <Alert tone="success" title="Certificate verified">GIA record matched successfully.</Alert>
            <Alert tone="warning" title="Approval required">Margin is below the permitted threshold.</Alert>
            <Alert tone="danger" title="Stock unavailable">Choose another branch to continue.</Alert>
          </div>
          <div className="component-line">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
            <Button
              variant="secondary"
              onClick={() => toast({ tone: "success", title: "Quotation saved", message: "QT-260184 was updated successfully." })}
            >
              Show toast
            </Button>
          </div>
        </section>
      )}

      {show("Feedback") && (
        <div className="two-col">
          <EmptyState
            className="panel"
            icon="search"
            title="No matching results"
            description="Try another keyword or remove some filters."
            action={<Button variant="secondary">Clear filters</Button>}
          />
          <EmptyState
            className="panel"
            icon="error"
            tone="error"
            title="We couldn’t load this view"
            description="Check your connection and try again. Your work is safe."
            action={<Button>Try again</Button>}
          />
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} labelledBy="approval-modal-title">
        <div className="modal-icon"><Icon name="warning" /></div>
        <h2 id="approval-modal-title">Submit quotation for approval?</h2>
        <p>
          The margin is 2.4% below your permitted threshold. A Shop Manager must approve it before
          sending.
        </p>
        <div className="summary-row"><span>QT-260184</span><strong>₹4,85,000</strong></div>
        <TextAreaField
          label="Approval note"
          placeholder="Add context for the approver..."
          value={approvalNote}
          onChange={e => setApprovalNote(e.target.value)}
        />
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={submitApproval}>Submit for approval</Button>
        </div>
      </Modal>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        eyebrow="QUOTATION DETAILS"
        title="QT-260184"
        className="detail-drawer"
        footer={
          <>
            <Button variant="secondary" onClick={() => toast({ tone: "info", title: "Preparing PDF", message: "QT-260184.pdf will download shortly (demo)." })}>
              Download PDF
            </Button>
            <Button onClick={() => toast({ tone: "info", title: "Create order", message: "Order creation arrives with the Sales phase." })}>
              Create order
            </Button>
          </>
        }
      >
        <div className="drawer-content">
          <Badge tone="emerald">Approved</Badge>
          <h3>Maharaja Festive Gift Pack</h3>
          <p className="muted">Created for Aarav Mehta Distributors · Vapi Plant</p>
          <div className="detail-total">
            <span>Quotation total</span>
            <strong>₹4,85,000</strong>
            <small>Inclusive of ₹73,983 GST</small>
          </div>
          <div className="detail-list">
            <div><span>Base type</span><strong>Herbal neem · triple milled</strong></div>
            <div><span>Pack</span><strong>100 g bar · 144 per carton</strong></div>
            <div><span>Validity</span><strong>15 March 2026</strong></div>
            <div><span>Owner</span><strong>Priya Nair</strong></div>
          </div>
          <Timeline
            items={[
              { title: "Approved by Arjun Sharma", meta: "Today, 10:24 AM", state: "done" },
              { title: "Created by Priya Nair", meta: "Yesterday, 4:18 PM", state: "done" },
            ]}
          />
        </div>
      </Drawer>
    </div>
  );
}
