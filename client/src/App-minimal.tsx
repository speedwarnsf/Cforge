import { Switch, Route } from "wouter";

function TestPage() {
  return (
    <div style={{ backgroundColor: 'red', color: 'white', padding: '20px' }}>
      <h1>TEST: React is working!</h1>
      <p>If you see this, React has mounted successfully.</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={TestPage} />
      <Route component={TestPage} />
    </Switch>
  );
}

function App() {
  return (
    <div className="concept-forge-app" role="application" aria-label="ConceptForge">
      <Router />
    </div>
  );
}

export default App;