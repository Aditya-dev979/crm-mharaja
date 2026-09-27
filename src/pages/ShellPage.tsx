import Badge from "@/components/ui/Badge";
import Brand from "@/components/ui/Brand";
import Icon from "@/components/ui/Icon";

const responsiveStates: Array<[string, string, string]> = [
  ["1440", "Expanded navigation", "Full global controls"],
  ["1280", "Expanded navigation", "Condensed search"],
  ["1024", "Collapsed navigation", "Priority actions"],
  ["768", "Overlay navigation", "Touch optimised"],
];

export default function ShellPage({
  actions,
}: {
  actions: { search: () => void; quick: () => void; notify: () => void };
}) {
  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <p className="eyebrow">APPLICATION SHELL</p>
          <h1>A stable frame for every workflow.</h1>
          <p>
            Responsive navigation, global actions and contextual surfaces stay consistent across all
            future phases.
          </p>
        </div>
        <Badge tone="royal">Interactive</Badge>
      </div>
      <div className="shell-demo">
        <div className="demo-sidebar"><Brand compact /><i /><i /><i /><i /></div>
        <div className="demo-body">
          <div className="demo-header"><span /><span /><span /></div>
          <div className="demo-content">
            <div className="demo-kpis"><i /><i /><i /></div>
            <div className="demo-chart" />
            <div className="demo-list" />
          </div>
        </div>
        <div className="callout c1">Expandable sidebar<span>Persistent modules and state</span></div>
        <div className="callout c2">Global command bar<span>Search every business record</span></div>
        <div className="callout c3">Contextual content<span>12-column responsive canvas</span></div>
      </div>
      <div className="three-col">
        <button type="button" className="feature-card" onClick={actions.search}>
          <div><Icon name="search" /></div>
          <span>
            <strong>Global search</strong>
            <small>Customers, leads, SKUs, orders, certificates and more.</small>
          </span>
          <Icon name="arrow" />
        </button>
        <button type="button" className="feature-card" onClick={actions.quick}>
          <div><Icon name="plus" /></div>
          <span>
            <strong>Quick create</strong>
            <small>Start ten common workflows from anywhere.</small>
          </span>
          <Icon name="arrow" />
        </button>
        <button type="button" className="feature-card" onClick={actions.notify}>
          <div><Icon name="bell" /></div>
          <span>
            <strong>Notification centre</strong>
            <small>Prioritised operational updates and approvals.</small>
          </span>
          <Icon name="arrow" />
        </button>
      </div>
      <section className="panel">
        <div className="section-head">
          <div>
            <p className="kicker">SHELL STATES</p>
            <h2>Responsive behaviour</h2>
          </div>
        </div>
        <div className="responsive-cards">
          {responsiveStates.map(([width, nav, detail]) => (
            <div key={width}>
              <strong>{width}px</strong>
              <span>{nav}</span>
              <small>{detail}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
