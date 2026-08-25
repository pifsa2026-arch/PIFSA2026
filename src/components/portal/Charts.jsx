import { peso } from '../../lib/config.js';

// ---------- DONUT / PIE ----------
export function Donut({ data, size = 200, thickness = 34 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="chart-empty" style={{ height: size }}>No data yet</div>
    );
  }

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef0f3" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * C;
          const seg = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} />
          );
          offset += dash;
          return seg;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" className="donut-center-num">{data.length}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="donut-center-label">segments</text>
      </svg>
      <div className="donut-legend">
        {data.map((d, i) => (
          <div className="donut-legend-item" key={i}>
            <span className="donut-swatch" style={{ background: d.color }} />
            <span className="donut-legend-label">{d.label}</span>
            <span className="donut-legend-val">{d.isMoney ? peso(d.value) : d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- LINE CHART ----------
export function LineChart({ points, height = 220, color = 'var(--navy)', fill = 'rgba(0,38,77,0.08)', money = true }) {
  const w = 640;
  const pad = { t: 20, r: 20, b: 40, l: 56 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(1, ...points.map((p) => p.value));
  const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW;

  const xy = points.map((p, i) => ({
    x: pad.l + i * stepX,
    y: pad.t + innerH - (p.value / max) * innerH,
    ...p,
  }));
  const path = xy.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${xy[xy.length - 1].x} ${pad.t + innerH} L ${xy[0].x} ${pad.t + innerH} Z`;

  return (
    <div className="line-chart-scroll">
      <svg viewBox={`0 0 ${w} ${height}`} className="line-chart" preserveAspectRatio="xMidYMid meet">
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => {
          const y = pad.t + innerH - g * innerH;
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#eef0f3" strokeWidth="1" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="axis-text">
                {money ? '₱' + Math.round(max * g / 1000) + 'k' : Math.round(max * g)}
              </text>
            </g>
          );
        })}
        <path d={area} fill={fill} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {xy.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke={color} strokeWidth="2.5" />
            <text x={p.x} y={height - 22} textAnchor="middle" className="axis-text axis-x">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ---------- GROUPED HORIZONTAL BARS (revenue vs expense vs net per duration) ----------
export function DurationPL({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.revenue, r.expense, Math.abs(r.net)]));
  return (
    <div className="pl-list">
      {rows.map((r) => (
        <div className="pl-row" key={r.label}>
          <div className="pl-label">{r.label}</div>
          <div className="pl-bars">
            <div className="pl-bar-line">
              <span className="pl-tag rev">Revenue</span>
              <div className="pl-track"><div className="pl-fill rev" style={{ width: `${(r.revenue / max) * 100}%` }} /></div>
              <span className="pl-val">{peso(r.revenue)}</span>
            </div>
            <div className="pl-bar-line">
              <span className="pl-tag exp">Expense</span>
              <div className="pl-track"><div className="pl-fill exp" style={{ width: `${(r.expense / max) * 100}%` }} /></div>
              <span className="pl-val">{peso(r.expense)}</span>
            </div>
            <div className="pl-bar-line">
              <span className="pl-tag net">Net</span>
              <div className="pl-track"><div className={'pl-fill ' + (r.net >= 0 ? 'net' : 'neg')} style={{ width: `${(Math.abs(r.net) / max) * 100}%` }} /></div>
              <span className={'pl-val ' + (r.net >= 0 ? '' : 'neg-text')}>{peso(r.net)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
