const cards = [
  { label: 'API status', value: 'Foundation ready', note: 'Connect deployment health next' },
  { label: 'Moderation queue', value: 'Not enabled', note: 'Required before community beta' },
  { label: 'AI provider', value: 'Mock / Gemini', note: 'Controlled by backend environment' },
  { label: 'Feature flags', value: '5 defined', note: 'Chat is enabled for milestone 1' },
];

const milestones = [
  ['01', 'Useful AI chat', 'In progress', 'Working API and mobile conversation UI'],
  ['02', 'Authentication', 'Next', 'Supabase email, Google, and Apple sign-in'],
  ['03', 'Voice and image', 'Planned', 'Permission-based private input workflows'],
  ['04', 'Memory and planning', 'Planned', 'Consent-led memory and reminders'],
  ['05', 'Moderated community', 'Private beta', 'Publish, report, block, and review tools'],
];

export default function AdminHome(): React.JSX.Element {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">V</div>
          <div>
            <strong>Velunee</strong>
            <span>Admin Portal</span>
          </div>
        </div>
        <nav>
          {['Overview', 'Users', 'Moderation', 'AI Quality', 'Feature Flags', 'Support', 'Audit Log'].map(
            (item, index) => (
              <button className={index === 0 ? 'active' : ''} key={item} type="button">
                {item}
              </button>
            ),
          )}
        </nav>
        <div className="sidebarNote">Admin authentication and role permissions must be enabled before deployment.</div>
      </aside>

      <section className="content">
        <header>
          <div>
            <p className="eyebrow">MVP FOUNDATION</p>
            <h1>Operations overview</h1>
            <p className="subtitle">A controlled starting point for the modular Velunee platform.</p>
          </div>
          <div className="status"><span />Local development</div>
        </header>

        <div className="cards">
          {cards.map((card) => (
            <article key={card.label}>
              <p>{card.label}</p>
              <strong>{card.value}</strong>
              <span>{card.note}</span>
            </article>
          ))}
        </div>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">DELIVERY PLAN</p>
              <h2>Product milestones</h2>
            </div>
            <span className="badge">Architecture aligned</span>
          </div>
          <div className="milestones">
            {milestones.map(([number, title, status, description]) => (
              <div className="milestone" key={number}>
                <span className="number">{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
                <span className="milestoneStatus">{status}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
