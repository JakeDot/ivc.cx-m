import React, { useState, useEffect } from 'react';
import { Users, Shield, ShieldAlert, Key, X, Check, RefreshCw } from 'lucide-react';
import { ivcIdentity } from '../lib/ivcIdentity';

interface UserRegistryModalProps {
  onClose: () => void;
}

interface IvcUser {
  username: string;
  pubkey: string;
  modes: string;
}

export function UserRegistryModal({ onClose }: UserRegistryModalProps) {
  const [users, setUsers] = useState<IvcUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/+users', {
        headers: ivcIdentity.getAuthHeaders('GET', '/+users')
      });
      const data = await res.json();
      
      if (!res.ok) {
        setStatus(`Error: ${data.message || data.error}`);
      } else {
        setUsers(data.users || []);
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleMode = async (username: string, currentModes: string, modeToToggle: string) => {
    try {
      setStatus(`Modifying ${modeToToggle} for @${username}...`);
      const isAdding = !currentModes.includes(modeToToggle);
      const action = isAdding ? '+' : '-';
      
      const uri = `/${action}${modeToToggle}/@${username}`;
      const reqMethod = isAdding ? 'PUT' : 'DELETE';
      
      const res = await fetch(uri, {
        method: reqMethod,
        headers: ivcIdentity.getAuthHeaders(reqMethod, uri)
      });
      
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${data.message || data.error}`);
      } else {
        setStatus(`Success! Mode updated to +${data.active_modes}`);
        // Refresh local state to reflect change immediately
        setUsers(users.map(u => 
          u.username === username ? { ...u, modes: data.active_modes } : u
        ));
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="bg-slate-900 p-5 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/30">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">IVC Global User Registry</h2>
              <p className="text-xs text-slate-400">Zero-Trust Directory (Requires +a Admin)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchUsers} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors" aria-label="Refresh Users">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors" aria-label="Close Modal">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
          {status && (
            <div className={`p-3 rounded-lg text-sm font-medium border ${status.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
               {status}
            </div>
          )}

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-4 py-3">Identity / Username</th>
                  <th className="px-4 py-3">Public Key (Ed25519)</th>
                  <th className="px-4 py-3">Global Privileges</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading && users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 animate-pulse">Loading Identity Registry...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No users found or permission denied.</td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.username} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <span className="text-slate-400 font-normal">@</span>{u.username}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit border border-slate-200">
                          <Key className="w-3 h-3 text-slate-400" />
                          <span className="truncate w-32" title={u.pubkey}>{u.pubkey.substring(0, 16)}...</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {u.modes.includes('a') && <span className="bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-xs font-bold tracking-wide">ADMIN (+a)</span>}
                          {u.modes.includes('o') && <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-xs font-bold tracking-wide">OPER (+o)</span>}
                          {u.modes.includes('v') && <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-xs font-bold tracking-wide">VOICE (+v)</span>}
                          {!u.modes && <span className="text-slate-400 text-xs italic">No special privileges</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => toggleMode(u.username, u.modes, 'o')}
                            className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${u.modes.includes('o') ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            title="Toggle Operator"
                          >
                            {u.modes.includes('o') ? '-o' : '+o'}
                          </button>
                          <button 
                            onClick={() => toggleMode(u.username, u.modes, 'a')}
                            className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${u.modes.includes('a') ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            title="Toggle Admin"
                          >
                            {u.modes.includes('a') ? '-a' : '+a'}
                          </button>
                          <button 
                            onClick={() => toggleMode(u.username, u.modes, 'v')}
                            className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${u.modes.includes('v') ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            title="Toggle Voice"
                          >
                            {u.modes.includes('v') ? '-v' : '+v'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
