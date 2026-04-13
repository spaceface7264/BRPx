function App() {
  return (
    <main className="page">
      <h1>BRP Front Admin</h1>
      <p className="lead">Tenant dashboard for BRP connection, branding, and publish settings.</p>

      <section className="section">
        <h2>BRP Connection</h2>
        <div className="row">
          <input placeholder="BRP API URL" />
          <input placeholder="BRP API key" />
          <button>Test connection</button>
        </div>
      </section>

      <section className="section">
        <h2>Branding</h2>
        <div className="row">
          <input placeholder="Business name" />
          <input placeholder="Primary color (#000000)" />
          <input placeholder="Secondary color (#ffffff)" />
        </div>
      </section>

      <section className="section">
        <h2>Template</h2>
        <div className="row">
          <label>
            <input type="radio" name="template" defaultChecked />
            Minimal
          </label>
          <label>
            <input type="radio" name="template" />
            Bold
          </label>
        </div>
      </section>

      <section className="section">
        <h2>Domain and Publish</h2>
        <div className="row">
          <input placeholder="Custom domain (shop.example.dk)" />
          <button>Verify domain</button>
          <button>Preview</button>
          <button>Go live</button>
        </div>
      </section>
    </main>
  );
}

export default App;
