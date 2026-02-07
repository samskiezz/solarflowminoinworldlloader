import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { auth } from '../lib/api';
import Layout from '../components/Layout';

const AGENT_TYPES = {
  'auto-gpt': { name: 'Auto-GPT', description: 'Autonomous task execution with goal breakdown', icon: '🤖' },
  'baby-agi': { name: 'Baby-AGI', description: 'Task-driven autonomous agent', icon: '👶' },
  'autonomous-researcher': { name: 'Autonomous Researcher', description: 'Information gathering and synthesis', icon: '🔬' },
  'recursive-planner': { name: 'Recursive Planner', description: 'Hierarchical planning with sub-goals', icon: '🌳' },
  'goal-seeking': { name: 'Goal-Seeking Agent', description: 'Persistent goal pursuit with adaptation', icon: '🎯' },
  'multi-agent-swarm': { name: 'Multi-Agent Swarm', description: 'Coordinated multi-agent system', icon: '🐝' },
  'tool-router': { name: 'Tool Router', description: 'Intelligently selects and uses tools', icon: '🔧' },
  'self-reflection': { name: 'Self-Reflection Agent', description: 'Analyzes and improves performance', icon: '🪞' },
  'memory-augmented': { name: 'Memory-Augmented', description: 'Long-term memory and learning', icon: '🧠' },
  'long-term-planner': { name: 'Long-term Planner', description: 'Extended timeline planning', icon: '📅' },
  'decision-tree': { name: 'Decision Tree Agent', description: 'Structured decision making', icon: '🌲' },
  'self-critique': { name: 'Self-Critique Loop', description: 'Continuous self-improvement', icon: '🔄' },
  'execution-controller': { name: 'Execution Controller', description: 'Monitors and controls execution', icon: '🎮' },
  'world-model': { name: 'World Model Agent', description: 'Maintains environment understanding', icon: '🌍' },
  'strategy-synthesis': { name: 'Strategy Synthesis', description: 'Combines multiple approaches', icon: '⚗️' },
  'adaptive-reasoner': { name: 'Adaptive Reasoner', description: 'Context-aware reasoning', icon: '🧮' },
  'autonomous-operator': { name: 'Autonomous Operator', description: 'Self-directed operations', icon: '⚙️' },
  'meta-agent': { name: 'Meta-Agent', description: 'Manages other agents', icon: '🎭' }
};

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedType, setSelectedType] = useState('auto-gpt');
  const router = useRouter();

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadAgents();
  }, [router]);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents', {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await response.json();
      setAgents(data.agents);
    } catch (err) {
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async (formData) => {
    try {
      const response = await fetch(`/api/agents/${selectedType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadAgents();
        setShowCreateForm(false);
      } else {
        setError('Failed to create agent');
      }
    } catch (err) {
      setError('Failed to create agent');
    }
  };

  const stopAgent = async (agentId) => {
    try {
      await fetch(`/api/agents/${agentId}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      await loadAgents();
    } catch (err) {
      setError('Failed to stop agent');
    }
  };

  const deleteAgent = async (agentId) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      await loadAgents();
    } catch (err) {
      setError('Failed to delete agent');
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
                <h1 className="text-3xl font-bold text-white mb-2">AI Agent Management</h1>
                <p className="text-blue-200">Advanced autonomous agents for complex tasks</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Agent
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

          {/* Agent Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {Object.entries(AGENT_TYPES).map(([type, info]) => (
              <div key={type} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-3xl mb-2">{info.icon}</div>
                <h3 className="text-white font-medium mb-2">{info.name}</h3>
                <p className="text-blue-200 text-sm mb-3">{info.description}</p>
                <button
                  onClick={() => {
                    setSelectedType(type);
                    setShowCreateForm(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Create
                </button>
              </div>
            ))}
          </div>

          {/* Active Agents */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Active Agents ({agents.length})</h2>
            
            {agents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-medium text-white mb-2">No agents created yet</h3>
                <p className="text-blue-200 mb-6">Create your first AI agent to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <div key={agent.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{AGENT_TYPES[agent.type]?.icon || '🤖'}</span>
                        <div>
                          <h3 className="text-white font-medium">{AGENT_TYPES[agent.type]?.name || agent.type}</h3>
                          <p className="text-blue-200 text-sm">{agent.status}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => stopAgent(agent.id)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Stop
                        </button>
                        <button
                          onClick={() => deleteAgent(agent.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    {agent.goal && (
                      <p className="text-gray-300 text-sm mb-2">
                        <strong>Goal:</strong> {agent.goal}
                      </p>
                    )}
                    
                    {agent.objective && (
                      <p className="text-gray-300 text-sm mb-2">
                        <strong>Objective:</strong> {agent.objective}
                      </p>
                    )}
                    
                    <p className="text-gray-400 text-xs">
                      Created: {new Date(agent.createdAt || Date.now()).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Agent Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold text-white mb-4">
                  Create {AGENT_TYPES[selectedType]?.name}
                </h3>
                
                <CreateAgentForm
                  agentType={selectedType}
                  onSubmit={createAgent}
                  onCancel={() => setShowCreateForm(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function CreateAgentForm({ agentType, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderFields = () => {
    switch (agentType) {
      case 'auto-gpt':
        return (
          <>
            <input
              type="text"
              placeholder="Goal"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white mb-4"
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
            />
            <textarea
              placeholder="Constraints (optional)"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white mb-4"
              onChange={(e) => setFormData({ ...formData, constraints: e.target.value.split('\n') })}
            />
          </>
        );
      case 'baby-agi':
        return (
          <>
            <input
              type="text"
              placeholder="Objective"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white mb-4"
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
            />
            <input
              type="text"
              placeholder="Initial Task"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white mb-4"
              onChange={(e) => setFormData({ ...formData, initialTask: e.target.value })}
            />
          </>
        );
      case 'autonomous-researcher':
        return (
          <input
            type="text"
            placeholder="Research Topic"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white mb-4"
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          />
        );
      default:
        return (
          <input
            type="text"
            placeholder="Goal or Objective"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white mb-4"
            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
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
          Create Agent
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