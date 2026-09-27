import Badge from "@/components/ui/Badge";

const colors: Array<[string, string, string]> = [
  ["Midnight Navy", "#0B1630", "Primary 950"],
  ["Deep Navy", "#132449", "Primary 900"],
  ["Royal Blue", "#315FEA", "Action 600"],
  ["Champagne Gold", "#D6AF5C", "Accent 500"],
  ["Soft Gold", "#E8D29A", "Accent 300"],
  ["Emerald", "#159A72", "Success 600"],
  ["Amber", "#D99A2B", "Warning 600"],
  ["Controlled Red", "#C94B5B", "Danger 600"],
  ["Pearl", "#F2F5FA", "Surface 100"],
];

export default function FoundationsPage() {
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">BRAND FOUNDATION</p>
          <h1>Elegant restraint. Operational clarity.</h1>
          <p>
            A token-led visual language that brings modern enterprise utility to a premium personal-care
            business. Colour and typography live here; structural tokens live in the Design System.
          </p>
        </div>
        <Badge tone="emerald">WCAG-conscious</Badge>
      </div>
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="kicker">COLOR SYSTEM</p>
            <h2>Purposeful palette</h2>
          </div>
          <span>8 semantic families · CSS variables</span>
        </div>
        <div className="color-grid">
          {colors.map(([name, hex, token]) => (
            <div className="color-card" key={name}>
              <div className="swatch" style={{ background: hex }} />
              <div>
                <strong>{name}</strong>
                <span>{token}</span>
                <code>{hex}</code>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="panel type-panel">
        <div className="section-head">
          <div>
            <p className="kicker">TYPOGRAPHY</p>
            <h2>Plus Jakarta Sans</h2>
          </div>
          <span>12 styles</span>
        </div>
        <div className="type-samples">
          <div className="display-sample">Aa</div>
          <div>
            <h2>Premium operations,<br />beautifully orchestrated.</h2>
            <p>Clear at every size, from decisive headlines to precise certificate metadata.</p>
          </div>
        </div>
        <div className="type-scale">
          <span><b>Display</b>48 / 56 · 700</span>
          <span><b>Heading 1</b>32 / 40 · 700</span>
          <span><b>Heading 2</b>24 / 32 · 700</span>
          <span><b>Body</b>14 / 22 · 500</span>
          <span><b>Label</b>12 / 16 · 700</span>
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="kicker">VOICE & DATA</p>
            <h2>Realistic, respectful, precise</h2>
          </div>
        </div>
        <div className="voice-grid">
          <div>
            <strong>INR everywhere</strong>
            <p>Realistic Indian business data with GST-aware examples — never lorem ipsum.</p>
          </div>
          <div>
            <strong>Operational tone</strong>
            <p>Calm, confident microcopy. Errors explain what happened and what to do next.</p>
          </div>
          <div>
            <strong>Audit-aware</strong>
            <p>Stock-changing and financial actions are explicit, confirmed and traceable.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
