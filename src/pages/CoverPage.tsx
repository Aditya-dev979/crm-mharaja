import type { PageId } from "@/components/layout/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Icon, { type IconName } from "@/components/ui/Icon";
import type { Branch } from "@/types";

/* The operating chain the product covers, shown as one continuous flow. */
const chain: Array<[string, IconName]> = [
  ["CRM", "target"],
  ["Sales", "component"],
  ["Purchase", "building"],
  ["Production", "layers"],
  ["Inventory", "grid"],
  ["Dispatch", "send"],
  ["Accounts", "wallet"],
  ["Audit", "shield"],
];

const principles: Array<[string, string, string]> = [
  ["01", "Precise by design", "A consistent 8px rhythm and clear hierarchy for dense enterprise workflows."],
  ["02", "Quietly luxurious", "Champagne accents and tactile surfaces without ornamental excess."],
  ["03", "Built for trust", "Accessible contrast, explicit states and audit-aware interaction patterns."],
];

export default function CoverPage({
  navigate,
  activeBranch,
}: {
  navigate: (page: PageId) => void;
  activeBranch: Branch;
}) {
  return (
    <div className="cover-page">
      <section className="hero">
        <div className="hero-copy">
          <Badge tone="gold">FMCG MANUFACTURING SUITE · 16 CONNECTED MODULES</Badge>
          <p className="eyebrow">Premium soap &amp; personal-care manufacturing</p>
          <h1>
            One refined system.<br />
            <em>Every batch</em> in focus.
          </h1>
          <p className="hero-lead">
            A connected operating system for the plant — every lead, batch, carton and rupee accounted
            for, from first enquiry to final audit.
          </p>

          <div className="chain-strip" role="list" aria-label="Covered business chain">
            {chain.map(([label, icon], i) => (
              <span className="chain-node" role="listitem" key={label}>
                <span className="chain-dot"><Icon name={icon} size={14} /></span>
                {label}
                {i < chain.length - 1 && <Icon name="arrow" size={12} />}
              </span>
            ))}
          </div>

          <div className="hero-actions">
            <Button onClick={() => navigate("authentication")}>
              Enter the workspace <Icon name="arrow" />
            </Button>
            <Button variant="secondary" onClick={() => navigate("authentication")}>
              <Icon name="lock" /> View authentication
            </Button>
          </div>
          <p className="hero-note"><Icon name="shield" size={13} /> Sign in to open the workspace — access follows your role.</p>

          <div className="hero-meta">
            <div><strong>16</strong><span>Business modules</span></div>
            <div><strong>49</strong><span>Live reports</span></div>
            <div><strong>10</strong><span>Operational roles</span></div>
            <div><strong>4</strong><span>Responsive widths</span></div>
          </div>
        </div>
        <div className="gem-stage" aria-label="Abstract soap-pack brand artwork" role="img">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="gem-visual"><div className="gem-core"><Icon name="gem" size={88} /></div></div>
          <div className="float-card fc-one">
            <span className="signal emerald" />
            <div><small>SECURE ACCESS</small><strong>Role protected</strong></div>
          </div>
          <div className="float-card fc-two">
            <span className="mini-icon"><Icon name="building" /></span>
            <div><small>ACTIVE BRANCH</small><strong>{activeBranch.name}</strong></div>
          </div>
        </div>
      </section>
      <section className="principles">
        {principles.map(([n, title, copy]) => (
          <article className="principle-card" key={n}>
            <span>{n}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
