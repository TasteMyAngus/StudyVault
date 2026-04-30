/**
 * Settings screen for agents, tokens, and audit history.
 */

import React, { useState, useEffect } from 'react';
import './SettingsUI.css';

interface Agent {
  agent_type: string;
  name: string;
  adapter_type: 'local' | 'http';
  endpoint_url?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface MCPToken {
  id: string;
  agent_type: string;
  tool_allowlist: string[];
  created_at: string;
  expires_at?: string;
  is_active: boolean;
  last_used_at?: string;
}

interface AuditLog {
  id: string;
  tool_name: string;
  agent_type?: string;
  run_id?: string;
  task_id?: string;
  success: boolean;
  error?: string;
  created_at: string;
}

interface Summary {
  total_agents: number;
  enabled_agents: number;
  agent_types: string[];
  total_tokens: number;
  active_tokens: number;
  recent_audit_entries: number;
  last_tool_call?: string;
}

const API_BASE = '/api/v1/settings';

export const SettingsUI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'agents' | 'tokens' | 'audit'>('agents');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tokens, setTokens] = useState<MCPToken[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audit log pagination state
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditLimit] = useState(50);
  const [auditToolFilter, setAuditToolFilter] = useState('');
  const [auditAgentFilter, setAuditAgentFilter] = useState('');

  // Reload when the active tab changes.
  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Filters only affect the audit view.
  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLog();
    }
  }, [auditOffset, auditToolFilter, auditAgentFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const summaryRes = await fetch(`${API_BASE}/summary`);
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }

      if (activeTab === 'agents') {
        const agentsRes = await fetch(`${API_BASE}/agents`);
        if (agentsRes.ok) {
          setAgents(await agentsRes.json());
        }
      } else if (activeTab === 'tokens') {
        const tokensRes = await fetch(`${API_BASE}/tokens`);
        if (tokensRes.ok) {
          setTokens(await tokensRes.json());
        }
      } else if (activeTab === 'audit') {
        await loadAuditLog();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLog = async () => {
    try {
      let url = `${API_BASE}/audit-log?limit=${auditLimit}&offset=${auditOffset}`;
      if (auditToolFilter) url += `&tool_name=${encodeURIComponent(auditToolFilter)}`;
      if (auditAgentFilter) url += `&agent_type=${encodeURIComponent(auditAgentFilter)}`;

      const res = await fetch(url);
      if (res.ok) {
        setAuditLogs(await res.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    }
  };

  return (
    <div className="settings-ui">
      <div className="settings-header">
        <h1>Settings</h1>
        {summary && (
          <div className="summary-cards">
            <div className="card">
              <div className="label">Agents</div>
              <div className="value">{summary.enabled_agents}/{summary.total_agents}</div>
            </div>
            <div className="card">
              <div className="label">Active Tokens</div>
              <div className="value">{summary.active_tokens}/{summary.total_tokens}</div>
            </div>
            <div className="card">
              <div className="label">Tool Calls</div>
              <div className="value">{summary.recent_audit_entries}</div>
            </div>
            {summary.last_tool_call && (
              <div className="card">
                <div className="label">Last Activity</div>
                <div className="value-small">{new Date(summary.last_tool_call).toLocaleString()}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          Agents
        </button>
        <button
          className={`tab ${activeTab === 'tokens' ? 'active' : ''}`}
          onClick={() => setActiveTab('tokens')}
        >
          Tokens
        </button>
        <button
          className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Log
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="tab-content">
        {activeTab === 'agents' && <AgentsTab agents={agents} loading={loading} />}
        {activeTab === 'tokens' && <TokensTab tokens={tokens} agents={agents} loading={loading} />}
        {activeTab === 'audit' && (
          <AuditLogTab
            logs={auditLogs}
            loading={loading}
            onRefresh={() => loadAuditLog()}
            toolFilter={auditToolFilter}
            onToolFilterChange={setAuditToolFilter}
            agentFilter={auditAgentFilter}
            onAgentFilterChange={setAuditAgentFilter}
            offset={auditOffset}
            onOffsetChange={setAuditOffset}
            limit={auditLimit}
          />
        )}
      </div>
    </div>
  );
};

// Agents tab

const AgentsTab: React.FC<{ agents: Agent[]; loading: boolean }> = ({ agents, loading }) => {
  if (loading) return <div className="loading">Loading agents...</div>;

  return (
    <div className="agents-tab">
      <h2>Agent Registry</h2>
      <table className="agents-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>Adapter</th>
            <th>Endpoint</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {agents.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty">
                No agents registered
              </td>
            </tr>
          ) : (
            agents.map((agent) => (
              <tr key={agent.agent_type}>
                <td className="mono">{agent.agent_type}</td>
                <td>{agent.name}</td>
                <td>
                  <span className={`badge badge-${agent.adapter_type}`}>{agent.adapter_type}</span>
                </td>
                <td className="mono small">{agent.endpoint_url || '—'}</td>
                <td>
                  <span className={`status ${agent.enabled ? 'enabled' : 'disabled'}`}>
                    {agent.enabled ? '●' : '○'} {agent.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="small">{new Date(agent.created_at).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

// Tokens tab

const TokensTab: React.FC<{
  tokens: MCPToken[];
  agents: Agent[];
  loading: boolean;
}> = ({ tokens, agents, loading }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (loading) return <div className="loading">Loading tokens...</div>;

  return (
    <div className="tokens-tab">
      <div className="tokens-header">
        <h2>MCP Tokens</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : '+ Create Token'}
        </button>
      </div>

      {showCreateForm && <CreateTokenForm agents={agents} onComplete={() => setShowCreateForm(false)} />}

      <table className="tokens-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Agent Type</th>
            <th>Tools Allowed</th>
            <th>Status</th>
            <th>Expires</th>
            <th>Last Used</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tokens.length === 0 ? (
            <tr>
              <td colSpan={7} className="empty">
                No tokens created
              </td>
            </tr>
          ) : (
            tokens.map((token) => (
              <tr key={token.id}>
                <td className="mono small">{token.id.substring(0, 8)}...</td>
                <td>{token.agent_type}</td>
                <td>
                  <div className="tools-list">
                    {token.tool_allowlist.map((tool) => (
                      <span key={tool} className="tool-badge">
                        {tool}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={`status ${token.is_active ? 'active' : 'inactive'}`}>
                    {token.is_active ? '●' : '○'} {token.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="small">
                  {token.expires_at
                    ? new Date(token.expires_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="small">
                  {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : '—'}
                </td>
                <td>
                  <button className="btn btn-sm btn-secondary">Rotate</button>
                  <button className="btn btn-sm btn-danger">Revoke</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const CreateTokenForm: React.FC<{
  agents: Agent[];
  onComplete: () => void;
}> = ({ agents, onComplete }) => {
  const [agentType, setAgentType] = useState('');
  const [tools, setTools] = useState<string[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!agentType || tools.length === 0) {
      alert('Select agent and at least one tool');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: agentType,
          tool_allowlist: tools,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewToken(data.token); // The backend only returns the raw token once.
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create token');
    }
  };

  return (
    <div className="create-token-form">
      <h3>Create MCP Token</h3>

      {newToken ? (
        <div className="token-created">
          <div className="token-warning">⚠️ Save this token securely. You won't see it again.</div>
          <div className="token-display">
            <code>{newToken}</code>
            <button
              className="btn btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(newToken);
                alert('Copied!');
              }}
            >
              Copy
            </button>
          </div>
          <button className="btn btn-primary" onClick={onComplete}>
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="form-group">
            <label>Agent Type</label>
            <select value={agentType} onChange={(e) => setAgentType(e.target.value)}>
              <option value="">— Select Agent —</option>
              {agents.map((a) => (
                <option key={a.agent_type} value={a.agent_type}>
                  {a.name} ({a.agent_type})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Allowed Tools (select at least one)</label>
            <ToolSelector
              selected={tools}
              onChange={setTools}
            />
          </div>

          <button className="btn btn-primary" onClick={handleCreate}>
            Create Token
          </button>
        </>
      )}
    </div>
  );
};

const ToolSelector: React.FC<{
  selected: string[];
  onChange: (tools: string[]) => void;
}> = ({ selected, onChange }) => {
  const availableTools = [
    'search_tool',
    'estimate_task',
    'generate_estimate',
    'list_tasks',
    'create_pr',
    'review_code',
    'run_tests',
    'get_metrics',
  ];

  const toggle = (tool: string) => {
    if (selected.includes(tool)) {
      onChange(selected.filter((t) => t !== tool));
    } else {
      onChange([...selected, tool]);
    }
  };

  return (
    <div className="tool-selector">
      {availableTools.map((tool) => (
        <label key={tool} className="tool-checkbox">
          <input
            type="checkbox"
            checked={selected.includes(tool)}
            onChange={() => toggle(tool)}
          />
          {tool}
        </label>
      ))}
    </div>
  );
};

// Audit log tab

const AuditLogTab: React.FC<{
  logs: AuditLog[];
  loading: boolean;
  onRefresh: () => void;
  toolFilter: string;
  onToolFilterChange: (filter: string) => void;
  agentFilter: string;
  onAgentFilterChange: (filter: string) => void;
  offset: number;
  onOffsetChange: (offset: number) => void;
  limit: number;
}> = ({
  logs,
  loading,
  onRefresh,
  toolFilter,
  onToolFilterChange,
  agentFilter,
  onAgentFilterChange,
  offset,
  onOffsetChange,
  limit,
}) => {
  if (loading) return <div className="loading">Loading audit log...</div>;

  return (
    <div className="audit-log-tab">
      <div className="audit-header">
        <h2>MCP Tool Audit Log</h2>
        <button className="btn btn-secondary" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Filter by tool name..."
          value={toolFilter}
          onChange={(e) => {
            onToolFilterChange(e.target.value);
            onOffsetChange(0);
          }}
        />
        <input
          type="text"
          placeholder="Filter by agent type..."
          value={agentFilter}
          onChange={(e) => {
            onAgentFilterChange(e.target.value);
            onOffsetChange(0);
          }}
        />
      </div>

      <table className="audit-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Tool</th>
            <th>Agent</th>
            <th>Run/Task</th>
            <th>Result</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty">
                No audit entries
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} className={log.success ? 'success' : 'error'}>
                <td className="small">{new Date(log.created_at).toLocaleString()}</td>
                <td className="mono">{log.tool_name}</td>
                <td>{log.agent_type || '—'}</td>
                <td className="mono small">
                  {log.run_id?.substring(0, 8)}.../{log.task_id?.substring(0, 8)}...
                </td>
                <td>
                  <span className={`badge badge-${log.success ? 'success' : 'error'}`}>
                    {log.success ? '✓' : '✕'} {log.success ? 'Success' : 'Failed'}
                  </span>
                </td>
                <td className="small error-text">{log.error || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button
          className="btn btn-sm"
          disabled={offset === 0}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        >
          Previous
        </button>
        <span className="page-info">
          Showing {offset + 1}–{offset + limit}
        </span>
        <button
          className="btn btn-sm"
          disabled={logs.length < limit}
          onClick={() => onOffsetChange(offset + limit)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SettingsUI;
