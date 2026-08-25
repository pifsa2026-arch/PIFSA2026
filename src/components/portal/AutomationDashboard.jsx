import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { AUTOMATION_TRIGGERS, AUTOMATION_ACTIONS, STAGES } from '../../lib/config.js';

const SAMPLE_AUTOMATIONS = [
  {
    id: 1, name: 'Welcome new leads', enabled: true, run_count: 128,
    trigger: { type: 'lead_created' },
    steps: [
      { type: 'send_email', subject: 'Welcome to PIFSA', body: 'Thanks for your interest! Here are your next steps…' },
      { type: 'delay', hours: 48 },
      { type: 'send_email', subject: 'Complete your requirements', body: 'A reminder of the documents needed to enroll.' },
    ],
  },
  {
    id: 2, name: 'Admitted → payment reminder', enabled: true, run_count: 41,
    trigger: { type: 'stage_changed', stage: 'Admitted' },
    steps: [
      { type: 'send_email', subject: 'You\'re admitted — secure your slot', body: 'Please settle your down payment to confirm.' },
      { type: 'assign_staff', staff: 'Enrollment Officer' },
    ],
  },
  {
    id: 3, name: 'No reply follow-up', enabled: false, run_count: 12,
    trigger: { type: 'no_reply', hours: 72 },
    steps: [{ type: 'send_email', subject: 'Still interested?', body: 'Just checking in on your application.' }],
  },
];

const triggerLabel = (t) => {
  const def = AUTOMATION_TRIGGERS.find((x) => x.id === t.type);
  let s = def?.label || t.type;
  if (t.stage) s += ` · ${t.stage}`;
  if (t.hours) s += ` · ${t.hours}h`;
  return s;
};
const actionLabel = (a) => AUTOMATION_ACTIONS.find((x) => x.id === a.type)?.label || a.type;
const actionIcon = (a) => AUTOMATION_ACTIONS.find((x) => x.id === a.type)?.icon || '•';

export default function AutomationDashboard() {
  const [items, setItems] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // automation being built, or null

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) { setItems(SAMPLE_AUTOMATIONS); setLoading(false); return; }
      const { data, error } = await supabase.from('automations').select('*').order('created_at', { ascending: false });
      if (error || !data) { setItems(SAMPLE_AUTOMATIONS); } else { setItems(data); setConnected(true); }
      setLoading(false);
    };
    load();
  }, []);

  const toggle = async (a) => {
    setItems((its) => its.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)));
    if (isSupabaseConfigured && connected) await supabase.from('automations').update({ enabled: !a.enabled }).eq('id', a.id);
  };
  const remove = async (id) => {
    setItems((its) => its.filter((x) => x.id !== id));
    if (isSupabaseConfigured && connected) await supabase.from('automations').delete().eq('id', id);
  };
  const save = async (auto) => {
    if (auto.id && items.find((x) => x.id === auto.id)) {
      setItems((its) => its.map((x) => (x.id === auto.id ? auto : x)));
      if (isSupabaseConfigured && connected) await supabase.from('automations').update({ name: auto.name, trigger: auto.trigger, steps: auto.steps, enabled: auto.enabled }).eq('id', auto.id);
    } else {
      const row = { name: auto.name, trigger: auto.trigger, steps: auto.steps, enabled: true };
      if (isSupabaseConfigured && connected) {
        const { data } = await supabase.from('automations').insert([row]).select();
        if (data) setItems((its) => [data[0], ...its]);
      } else {
        setItems((its) => [{ id: Date.now(), run_count: 0, ...row }, ...its]);
      }
    }
    setEditing(null);
  };

  if (loading) return <div className="panel-loading">Loading…</div>;
  if (editing) return <AutomationBuilder initial={editing} onCancel={() => setEditing(null)} onSave={save} />;

  const activeCount = items.filter((x) => x.enabled).length;
  const totalRuns = items.reduce((s, x) => s + (x.run_count || 0), 0);

  return (
    <div>
      {!connected && <div className="notice">Preview mode — sample automations. Connect Supabase (an <code>automations</code> table) to persist. Your Apps Script reads this table to send the emails.</div>}

      <div className="kpi-grid kpi-sm">
        <div className="kpi-card"><div className="kpi-value">{items.length}</div><div className="kpi-label">Total Workflows</div></div>
        <div className="kpi-card"><div className="kpi-value">{activeCount}</div><div className="kpi-label">Active</div></div>
        <div className="kpi-card"><div className="kpi-value">{totalRuns.toLocaleString()}</div><div className="kpi-label">Total Runs</div></div>
        <div className="kpi-card auto-new-card" onClick={() => setEditing({ name: '', trigger: { type: 'lead_created' }, steps: [] })}>
          <div className="auto-new-plus">＋</div><div className="kpi-label">New Automation</div>
        </div>
      </div>

      <div className="auto-list">
        {items.map((a) => (
          <div className={'auto-card' + (a.enabled ? '' : ' disabled')} key={a.id}>
            <div className="auto-card-main" onClick={() => setEditing(a)}>
              <div className="auto-card-head">
                <span className={'auto-status' + (a.enabled ? ' on' : '')}>{a.enabled ? 'Active' : 'Paused'}</span>
                <h3>{a.name}</h3>
              </div>
              <div className="auto-flow">
                <div className="auto-node trigger"><span className="auto-node-kind">When</span>{triggerLabel(a.trigger)}</div>
                {a.steps.map((s, i) => (
                  <div className="auto-node-wrap" key={i}>
                    <span className="auto-arrow">→</span>
                    <div className={'auto-node ' + (s.type === 'delay' ? 'delay' : 'action')}>
                      <span className="auto-node-icon">{actionIcon(s)}</span>
                      {s.type === 'delay' ? `Wait ${s.hours}h` : actionLabel(s)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="auto-meta">{a.run_count || 0} runs</div>
            </div>
            <div className="auto-card-side">
              <label className="switch"><input type="checkbox" checked={a.enabled} onChange={() => toggle(a)} /><span className="switch-slider" /></label>
              <button className="auto-del" onClick={() => remove(a.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Builder ----------------
function AutomationBuilder({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial.name || '');
  const [trigger, setTrigger] = useState(initial.trigger || { type: 'lead_created' });
  const [steps, setSteps] = useState(initial.steps || []);

  const triggerDef = AUTOMATION_TRIGGERS.find((t) => t.id === trigger.type);

  const addStep = (type) => {
    const def = AUTOMATION_ACTIONS.find((a) => a.id === type);
    const step = { type };
    def.fields.forEach((f) => (step[f] = f === 'hours' ? 24 : ''));
    if (type === 'move_stage') step.stage = STAGES[0];
    setSteps((s) => [...s, step]);
  };
  const updateStep = (i, patch) => setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  const removeStep = (i) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const moveStep = (i, dir) => setSteps((s) => {
    const n = [...s]; const j = i + dir;
    if (j < 0 || j >= n.length) return n;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  return (
    <div className="builder">
      <div className="builder-head">
        <input className="builder-name" placeholder="Automation name…" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="builder-actions">
          <button className="portal-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="portal-btn" disabled={!name.trim() || steps.length === 0} onClick={() => onSave({ ...initial, name: name.trim(), trigger, steps })}>Save Automation</button>
        </div>
      </div>

      {/* Trigger */}
      <div className="builder-section">
        <div className="builder-label">When this happens (trigger)</div>
        <div className="trigger-grid">
          {AUTOMATION_TRIGGERS.map((t) => (
            <button key={t.id} className={'trigger-opt' + (trigger.type === t.id ? ' active' : '')}
              onClick={() => setTrigger({ type: t.id, ...(t.needsStage ? { stage: STAGES[4] } : {}), ...(t.needsHours ? { hours: 72 } : {}) })}>
              <div className="trigger-opt-label">{t.label}</div>
              <div className="trigger-opt-desc">{t.desc}</div>
            </button>
          ))}
        </div>
        {triggerDef?.needsStage && (
          <div className="trigger-config">
            <label>Which stage?</label>
            <select className="portal-field sm" value={trigger.stage} onChange={(e) => setTrigger({ ...trigger, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}
        {triggerDef?.needsHours && (
          <div className="trigger-config">
            <label>After how many hours?</label>
            <input className="portal-field sm" type="number" value={trigger.hours} onChange={(e) => setTrigger({ ...trigger, hours: parseInt(e.target.value) || 0 })} />
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="builder-section">
        <div className="builder-label">Then do this (actions)</div>
        <div className="step-flow">
          <div className="step-node trigger-node">▶ {triggerLabel(trigger)}</div>
          {steps.map((s, i) => (
            <div className="step-node-block" key={i}>
              <div className="step-connector" />
              <div className="step-node">
                <div className="step-node-top">
                  <span className="step-node-title">{actionIcon(s)} {actionLabel(s)}</span>
                  <div className="step-node-ctrl">
                    <button onClick={() => moveStep(i, -1)} disabled={i === 0}>↑</button>
                    <button onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>↓</button>
                    <button onClick={() => removeStep(i)} className="step-del">×</button>
                  </div>
                </div>
                <StepFields step={s} onChange={(patch) => updateStep(i, patch)} />
              </div>
            </div>
          ))}
          <div className="step-connector" />
          <div className="add-action-row">
            {AUTOMATION_ACTIONS.map((a) => (
              <button key={a.id} className="add-action-btn" onClick={() => addStep(a.id)}>{a.icon} {a.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepFields({ step, onChange }) {
  if (step.type === 'delay') {
    return <div className="step-fields"><label>Wait</label><input className="portal-field sm" type="number" value={step.hours} onChange={(e) => onChange({ hours: parseInt(e.target.value) || 0 })} /><span className="step-unit">hours</span></div>;
  }
  if (step.type === 'move_stage') {
    return <div className="step-fields"><select className="portal-field sm" value={step.stage} onChange={(e) => onChange({ stage: e.target.value })}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></div>;
  }
  if (step.type === 'send_email') {
    return (
      <div className="step-fields col">
        <input className="portal-field sm" placeholder="Subject" value={step.subject} onChange={(e) => onChange({ subject: e.target.value })} />
        <textarea className="portal-field sm" rows={2} placeholder="Email body… (Apps Script sends this)" value={step.body} onChange={(e) => onChange({ body: e.target.value })} />
      </div>
    );
  }
  if (step.type === 'send_sms') {
    return <div className="step-fields"><input className="portal-field sm" placeholder="SMS message" value={step.body} onChange={(e) => onChange({ body: e.target.value })} /></div>;
  }
  if (step.type === 'add_note') {
    return <div className="step-fields"><input className="portal-field sm" placeholder="Note text" value={step.body} onChange={(e) => onChange({ body: e.target.value })} /></div>;
  }
  if (step.type === 'add_tag') {
    return <div className="step-fields"><input className="portal-field sm" placeholder="Tag" value={step.tag} onChange={(e) => onChange({ tag: e.target.value })} /></div>;
  }
  if (step.type === 'assign_staff') {
    return <div className="step-fields"><input className="portal-field sm" placeholder="Staff name / role" value={step.staff} onChange={(e) => onChange({ staff: e.target.value })} /></div>;
  }
  return null;
}
