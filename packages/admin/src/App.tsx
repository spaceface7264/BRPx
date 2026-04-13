function App() {
  return (
    <main className="page">
      <h1>BRP Front Admin</h1>
      <p className="lead">
        Tenant dashboard for BRP connection, branding, and publish settings.
      </p>

      <section className="section">
        <h2>BRP Connection</h2>
        <div className="row">
          <input placeholder="BRP API URL" />
          <input placeholder="BRP API key" type="password" />
          <button type="button">Test connection</button>
        </div>
        <p className="hint">Status: not connected</p>
      </section>

      <section className="section">
        <h2>Branding</h2>
        <div className="row">
          <input placeholder="Business name" />
          <div className="field">
            <label htmlFor="logo-upload">Logo</label>
            <input id="logo-upload" type="file" accept="image/*" />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="color-primary">Primary color</label>
            <input id="color-primary" type="color" defaultValue="#000000" />
          </div>
          <div className="field">
            <label htmlFor="color-secondary">Secondary color</label>
            <input id="color-secondary" type="color" defaultValue="#ffffff" />
          </div>
          <div className="field">
            <label htmlFor="font-select">Font</label>
            <select id="font-select" defaultValue="system">
              <option value="system">System (default)</option>
              <option value="inter">Inter</option>
              <option value="dm-sans">DM Sans</option>
            </select>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Template</h2>
        <div className="row">
          <label className="template-option">
            <input type="radio" name="template" value="minimal" defaultChecked />
            Minimal
          </label>
          <label className="template-option">
            <input type="radio" name="template" value="bold" />
            Bold
          </label>
        </div>
      </section>

      <section className="section">
        <h2>Settings</h2>
        <div className="row">
          <div className="field">
            <label htmlFor="product-display">Product display</label>
            <select id="product-display" defaultValue="cards">
              <option value="cards">Cards</option>
              <option value="list">List</option>
            </select>
          </div>
          <label className="toggle">
            <input type="checkbox" />
            Skip location step
          </label>
        </div>
        <div className="row">
          <input placeholder="Terms URL" type="url" />
          <input placeholder="Privacy URL" type="url" />
          <input placeholder="GA measurement ID" />
        </div>
      </section>

      <section className="section">
        <h2>Domain and Publish</h2>
        <div className="row">
          <input placeholder="Custom domain (shop.example.dk)" />
          <button type="button">Verify domain</button>
        </div>
        <p className="hint">
          Point a CNAME record for your domain to <code>checkout.brpfront.dk</code>
        </p>
        <div className="row">
          <button type="button">Preview</button>
          <button type="button" className="btn-live">Go live</button>
        </div>
      </section>
    </main>
  );
}

export default App;
