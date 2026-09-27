import Badge from "@/components/ui/Badge";
import Icon, { type IconName } from "@/components/ui/Icon";

const iconSamples: IconName[] = ["search", "bell", "calendar", "upload", "filter", "user", "shield", "settings"];
const states = ["Default", "Hover", "Active", "Focused", "Disabled", "Loading", "Success", "Warning", "Error"];
const breakpoints: Array<[string, string]> = [
  ["1440", "12 col · 32 margin"],
  ["1280", "12 col · 24 margin"],
  ["1024", "8 col · 24 margin"],
  ["768", "6 col · 16 margin"],
];

export default function DesignSystemPage() {
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">DESIGN SYSTEM</p>
          <h1>Structure, rhythm and depth.</h1>
          <p>
            The structural tokens every future phase builds on: spacing, radii, elevation, grid,
            iconography and interaction states.
          </p>
        </div>
        <Badge tone="royal">Token-led</Badge>
      </div>
      <div className="two-col">
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="kicker">SPACING & SHAPE</p>
              <h2>8px rhythm</h2>
            </div>
          </div>
          <div className="spacing-demo">
            {[8, 16, 24, 32, 48, 64].map(n => (
              <div key={n}>
                <span style={{ width: n * 2 }} />
                <b>{n}</b>
              </div>
            ))}
          </div>
          <div className="radius-row">
            <div className="radius r8">8</div>
            <div className="radius r12">12</div>
            <div className="radius r16">16</div>
            <div className="radius r24">24</div>
          </div>
        </section>
        <section className="panel">
          <div className="section-head">
            <div>
              <p className="kicker">ELEVATION</p>
              <h2>Restrained depth</h2>
            </div>
          </div>
          <div className="elevation-row">
            <div className="elev inset">Inset<span>Input</span></div>
            <div className="elev low">01<span>Raised</span></div>
            <div className="elev mid">02<span>Floating</span></div>
            <div className="elev high">03<span>Overlay</span></div>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="kicker">RESPONSIVE GRID</p>
            <h2>Desktop to tablet</h2>
          </div>
        </div>
        <div className="breakpoints">
          {breakpoints.map(([width, spec]) => (
            <div key={width}>
              <b>{width}</b>
              <span>{spec}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="kicker">ICONOGRAPHY & STATES</p>
            <h2>Clear, consistent, calm</h2>
          </div>
          <span>1.8px stroke · 24px grid</span>
        </div>
        <div className="icon-row">
          {iconSamples.map(name => (
            <div className="icon-tile" key={name}>
              <Icon name={name} />
              <span>{name}</span>
            </div>
          ))}
        </div>
        <div className="state-strip">
          {states.map((state, i) => (
            <span className={`state s${i}`} key={state}>{state}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
