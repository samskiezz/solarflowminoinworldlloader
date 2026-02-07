import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { auth } from '../lib/api';
import Layout from '../components/Layout';

const SCRAPING_TOOLS = {
  // Browser Automation
  playwright: { name: 'Playwright Stealth', description: 'Advanced browser automation with stealth', icon: '🎭', category: 'browser' },
  puppeteer: { name: 'Puppeteer Extra', description: 'Stealth browser automation', icon: '🎪', category: 'browser' },
  
  // Crawling Frameworks
  scrapy: { name: 'Scrapy', description: 'Python web scraping framework', icon: '🕷️', category: 'framework' },
  crawlee: { name: 'Crawlee', description: 'Node.js crawling library', icon: '🕸️', category: 'framework' },
  colly: { name: 'Colly', description: 'Go web scraping framework', icon: '🐹', category: 'framework' },
  ferret: { name: 'Ferret', description: 'Web scraping query language', icon: '🦫', category: 'framework' },
  
  // Reconnaissance
  httpx: { name: 'HTTPX', description: 'Fast HTTP probe and scanner', icon: '🚀', category: 'recon' },
  katana: { name: 'Katana', description: 'Fast web crawler', icon: '⚔️', category: 'recon' },
  hakrawler: { name: 'Hakrawler', description: 'Web crawler for hacking', icon: '🔍', category: 'recon' },
  wayback: { name: 'Wayback URLs', description: 'Historical URLs from Wayback Machine', icon: '📚', category: 'recon' },
  gau: { name: 'GetAllUrls', description: 'Fetch URLs from multiple sources', icon: '🔗', category: 'recon' },
  
  // Mass Scanning
  masscan: { name: 'Masscan', description: 'Fast TCP port scanner', icon: '💥', category: 'scanning' },
  zmap: { name: 'Zmap', description: 'Internet-wide network scanner', icon: '🗺️', category: 'scanning' }
};

const TOOL_CATEGORIES = {
  browser: 'Browser Automation',
  framework: 'Crawling Frameworks', 
  recon: 'Reconnaissance',
  scanning: 'Mass Scanning'
};

export default function ScrapingPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToolForm, setShowToolForm] = useState(false);
  const [selectedTool, setSelectedTool] = useState('httpx');
  const [results, setResults] = useState({});
  const router = useRouter();

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadSessions();
  }, [router]);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/scraping/sessions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const runTool = async (tool, config) => {
    try {
      let endpoint = '';
      let payload = {};
      
      switch (tool) {
        case 'httpx':
          endpoint = '/api/recon/httpx';
          payload = {
            targets: config.targets.split('\n').filter(Boolean),
            threads: parseInt(config.threads) || 50,
            silent: config.silent || false
          };
          break;
        case 'katana':
          endpoint = '/api/recon/katana';
          payload = {
            targets: config.targets.split('\n').filter(Boolean),
            depth: parseInt(config.depth) || 3,
            concurrency: parseInt(config.concurrency) || 10
          };
          break;
        case 'scrapy':
          endpoint = '/api/scraping/scrapy/create';
          payload = {
            projectName: config.projectName,
            spiderName: config.spiderName,
            startUrls: config.startUrls.split('\n').filter(Boolean)
          };
          break;
        case 'playwright':
          endpoint = '/api/scraping/playwright/session';
          payload = { headless: config.headless !== false };
          break;
        default:
          throw new Error(`Unknown tool: ${tool}`);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setResults(prev => ({ ...prev, [tool]: result }));
        await loadSessions();
        setShowToolForm(false);
      } else {
        throw new Error('Request failed');
      }
    } catch (err) {
      setError(`Failed to run ${tool}: ${err.message}`);
    }
  };

  const viewResults = async (sessionId) => {
    try {
      const response = await fetch(`/api/scraping/results/${sessionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(prev => ({ ...prev, [sessionId]: data.results }));
      }
    } catch (err) {
      setError('Failed to load results');
    }
  };

  const closeSession = async (sessionId) => {
    try {
      await fetch(`/api/scraping/session/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      await loadSessions();
    } catch (err) {
      setError('Failed to close session');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Web Scraping & Reconnaissance</h1>
                <p className="text-blue-200">Advanced scraping tools and reconnaissance suite</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowToolForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Run Tool
                </button>
                <Link href="/">
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                    Back to Dashboard
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4 mb-6 text-red-200">
              {error}
            </div>
          )}

          {/* Tools Grid by Category */}
          {Object.entries(TOOL_CATEGORIES).map(([categoryKey, categoryName]) => (
            <div key={categoryKey} className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">{categoryName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.entries(SCRAPING_TOOLS)
                  .filter(([, tool]) => tool.category === categoryKey)
                  .map(([toolKey, tool]) => (
                    <div key={toolKey} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                      <div className="text-3xl mb-2">{tool.icon}</div>
                      <h3 className="text-white font-medium mb-2">{tool.name}</h3>
                      <p className="text-blue-200 text-sm mb-3">{tool.description}</p>
                      <button
                        onClick={() => {
                          setSelectedTool(toolKey);
                          setShowToolForm(true);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
                      >
                        Run {tool.name}
                      </button>
                      {results[toolKey] && (
                        <div className="mt-2 text-xs text-green-300">
                          ✅ Results available
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {/* Active Sessions */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Active Sessions ({sessions.length})</h2>
            
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🕷️</div>
                <h3 className="text-lg font-medium text-white mb-2">No active sessions</h3>
                <p className="text-blue-200">Start a scraping tool to create sessions</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session) => (
                  <div key={session.sessionId} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{SCRAPING_TOOLS[session.type]?.icon || '🔧'}</span>
                        <div>
                          <h3 className="text-white font-medium">{SCRAPING_TOOLS[session.type]?.name || session.type}</h3>
                          <p className="text-blue-200 text-sm">{session.status}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewResults(session.sessionId)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Results
                        </button>
                        <button
                          onClick={() => closeSession(session.sessionId)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs">
                      Session: {session.sessionId.slice(0, 8)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results Display */}
          {Object.keys(results).length > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Results</h2>
              <div className="space-y-4">
                {Object.entries(results).map(([key, result]) => (
                  <div key={key} className="bg-white/5 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-2">
                      {SCRAPING_TOOLS[key]?.name || key}
                    </h3>
                    <pre className="text-gray-300 text-sm overflow-x-auto bg-black/20 p-3 rounded">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool Form Modal */}
          {showToolForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-white mb-4">
                  Run {SCRAPING_TOOLS[selectedTool]?.name}
                </h3>
                
                <ToolForm
                  tool={selectedTool}
                  onSubmit={(config) => runTool(selectedTool, config)}
                  onCancel={() => setShowToolForm(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ToolForm({ tool, onSubmit, onCancel }) {
  const [config, setConfig] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(config);
  };

  const renderFields = () => {
    const commonTextareaClass = "w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white mb-4 min-h-[100px]";
    const commonInputClass = "w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white mb-4";

    switch (tool) {
      case 'httpx':
        return (
          <>
            <textarea
              placeholder="Targets (one per line)&#10;example.com&#10;192.168.1.1&#10;subdomain.example.com"
              className={commonTextareaClass}
              onChange={(e) => setConfig({ ...config, targets: e.target.value })}
            />
            <input
              type="number"
              placeholder="Threads (default: 50)"
              className={commonInputClass}
              onChange={(e) => setConfig({ ...config, threads: e.target.value })}
            />
            <label className="flex items-center text-white mb-4">
              <input
                type="checkbox"
                className="mr-2"
                onChange={(e) => setConfig({ ...config, silent: e.target.checked })}
              />
              Silent mode
            </label>
          </>
        );
      case 'katana':
        return (
          <>
            <textarea
              placeholder="Target URLs (one per line)&#10;https://example.com&#10;https://test.com"
              className={commonTextareaClass}
              onChange={(e) => setConfig({ ...config, targets: e.target.value })}
            />
            <input
              type="number"
              placeholder="Crawl depth (default: 3)"
              className={commonInputClass}
              onChange={(e) => setConfig({ ...config, depth: e.target.value })}
            />
            <input
              type="number"
              placeholder="Concurrency (default: 10)"
              className={commonInputClass}
              onChange={(e) => setConfig({ ...config, concurrency: e.target.value })}
            />
          </>
        );
      case 'scrapy':
        return (
          <>
            <input
              type="text"
              placeholder="Project Name"
              className={commonInputClass}
              onChange={(e) => setConfig({ ...config, projectName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Spider Name"
              className={commonInputClass}
              onChange={(e) => setConfig({ ...config, spiderName: e.target.value })}
            />
            <textarea
              placeholder="Start URLs (one per line)&#10;https://example.com&#10;https://test.com/page"
              className={commonTextareaClass}
              onChange={(e) => setConfig({ ...config, startUrls: e.target.value })}
            />
          </>
        );
      case 'wayback':
        return (
          <textarea
            placeholder="Domains (one per line)&#10;example.com&#10;test.com"
            className={commonTextareaClass}
            onChange={(e) => setConfig({ ...config, domains: e.target.value })}
          />
        );
      case 'masscan':
        return (
          <>
            <textarea
              placeholder="Targets (one per line)&#10;192.168.1.0/24&#10;10.0.0.1"
              className={commonTextareaClass}
              onChange={(e) => setConfig({ ...config, targets: e.target.value })}
            />
            <input
              type="text"
              placeholder="Ports (e.g., 80,443,8080 or 1-1000)"
              className={commonInputClass}
              onChange={(e) => setConfig({ ...config, ports: e.target.value })}
            />
            <input
              type="text"
              placeholder="Rate (default: 1000)"
              className={commonInputClass}
              onChange={(e) => setConfig({ ...config, rate: e.target.value })}
            />
          </>
        );
      default:
        return (
          <textarea
            placeholder="Configuration (tool-specific)"
            className={commonTextareaClass}
            onChange={(e) => setConfig({ ...config, general: e.target.value })}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {renderFields()}
      
      <div className="flex gap-4">
        <button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
        >
          Run Tool
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}