import { useState } from 'react';
import { STAGES, TRAINING_PROGRAMS, TRAINING_DURATIONS, PROGRAM_PRICE, peso } from '../../lib/config.js';

export default function LeadModal({ lead, onClose, onSave, createMode = false }) {
  const [form, setForm] = useState({
    full_name: lead.full_name || '',
    email: lead.email || '',
    contact_number: lead.contact_number || '',
    current_work: lead.current_work || '',
    location: lead.location || '',
    bs_degree: lead.bs_degree || '',
    programs: lead.programs || [],
    training_duration: lead.training_duration || '',
    stage: lead.stage || 'Leads',
    amount_paid: lead.amount_paid || 0,
    notes: lead.notes || '',
  });
  const [addPay, setAddPay] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleProgram = (p) =>
    set('programs', form.programs.includes(p) ? form.programs.filter((x) => x !== p) : [...form.programs, p]);

  const due = form.programs.length * PROGRAM_PRICE;
  const balance = Math.max(0, due - Number(form.amount_paid || 0));
  const fully = due > 0 && Number(form.amount_paid) >= due;

  const recordPayment = () => {
    const amt = parseFloat(addPay);
    if (!amt || amt <= 0) return;
    set('amount_paid', Number(form.amount_paid || 0) + amt);
    setAddPay('');
  };

  const save = () => {
    // Only send real, editable columns (avoids Supabase rejecting the whole update
    // because of id/created_at or other non-column fields).
    const patch = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      contact_number: form.contact_number.trim(),
      current_work: form.current_work.trim(),
      location: form.location.trim(),
      bs_degree: form.bs_degree.trim(),
      programs: form.programs,
      training_duration: form.training_duration,
      stage: form.stage,
      amount_paid: Number(form.amount_paid || 0),
      notes: form.notes,
    };
    if (due > 0 && patch.amount_paid >= due) patch.stage = 'Paid';
    onSave(patch);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{createMode ? 'Add New Lead' : 'Lead Details'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="field-row">
            <label>Name</label>
            <input className="portal-field" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
          </div>
          <div className="field-2col">
            <div className="field-row"><label>Email</label><input className="portal-field" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="field-row"><label>Contact Number</label><input className="portal-field" value={form.contact_number} onChange={(e) => set('contact_number', e.target.value)} /></div>
          </div>

          {/* New optional detail fields */}
          <div className="field-2col">
            <div className="field-row"><label>Current Work / Company <span className="opt">optional</span></label><input className="portal-field" value={form.current_work} onChange={(e) => set('current_work', e.target.value)} placeholder="e.g. PNP, ABC Corp" /></div>
            <div className="field-row"><label>Location <span className="opt">optional</span></label><input className="portal-field" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Cavite" /></div>
          </div>
          <div className="field-row">
            <label>BS Degree <span className="opt">optional</span></label>
            <input className="portal-field" value={form.bs_degree} onChange={(e) => set('bs_degree', e.target.value)} placeholder="e.g. BS Criminology" />
          </div>

          <div className="field-row">
            <label>Training Program(s) — {form.programs.length} selected · {peso(due)} due</label>
            <div className="modal-programs">
              {TRAINING_PROGRAMS.map((p) => (
                <label key={p} className={'program-chip' + (form.programs.includes(p) ? ' on' : '')}>
                  <input type="checkbox" checked={form.programs.includes(p)} onChange={() => toggleProgram(p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div className="field-2col">
            <div className="field-row">
              <label>Training Duration</label>
              <select className="portal-field" value={form.training_duration} onChange={(e) => set('training_duration', e.target.value)}>
                <option value="">— none —</option>
                {TRAINING_DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field-row">
              <label>Stage</label>
              <select className="portal-field" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Payment tracker */}
          <div className="pay-panel">
            <div className="pay-panel-head">
              <span>Payment</span>
              {fully ? <span className="pay-tag pay-full">Fully Paid</span> : <span className="pay-tag pay-partial">Balance {peso(balance)}</span>}
            </div>
            <div className="pay-bar"><div className="pay-bar-fill" style={{ width: `${due ? Math.min(100, (form.amount_paid / due) * 100) : 0}%` }} /></div>
            <div className="pay-nums">
              <span>Paid: <strong>{peso(form.amount_paid)}</strong></span>
              <span>Due: <strong>{peso(due)}</strong></span>
            </div>
            <div className="pay-add">
              <input className="portal-field" type="number" placeholder="Record a payment (₱)" value={addPay} onChange={(e) => setAddPay(e.target.value)} />
              <button className="portal-btn" onClick={recordPayment}>Add Payment</button>
            </div>
            <p className="muted" style={{ fontSize: 12 }}>Supports staggered payments. Lead counts as revenue only when fully paid.</p>
          </div>

          <div className="field-row">
            <label>Notes</label>
            <textarea className="portal-field" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Add notes about this lead…" />
          </div>
        </div>

        <div className="modal-foot">
          <button className="portal-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="portal-btn" onClick={save}>{createMode ? 'Create Lead' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}
