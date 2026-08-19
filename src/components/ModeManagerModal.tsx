import React, { useState } from 'react';
import { Shield, Server, Hash, User, X, Check, Search, ShieldAlert, Zap, Key } from 'lucide-react';
import { ivcIdentity } from '../lib/ivcIdentity';

interface ModeManagerModalProps {
  onClose: () => void;
}

export function ModeManagerModal({ onClose }: ModeManagerModalProps) {
  const [target, setTarget] = useState('#general');
  const [modes, setModes] = useState('m');
  const [action, setAction] = useState<'add'|'remove'>('add');
  const [asUser, setAsUser] = useState(ivcIdentity.username);
  const [status, setStatus] = useState<string | null>(null);

  const handleUpdateUsername = (name: string) => {
    setAsUser(name);
    ivcIdentity.setUsername(name);
  };

  const applyModes = async () => {
    try {
      setStatus('Applying (Secured by Ed25519)...');
      const uri = `/${action === 'add' ? '+' : '-'}${modes}/${encodeURIComponent(target)}`;
      const reqMethod = action === 'add' ? 'PUT' : 'DELETE';
      
      const res = await fetch(uri, {
        method: reqMethod,
        headers: {
          ...ivcIdentity.getAuthHeaders(reqMethod, uri)
        }
      });
      
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${data.message || data.error}`);
      } else {
        setStatus(`Success! Target Modes updated to ${data.active_modes}`);
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  const applyGlobalServerModes = async () => {
    try {
      setStatus('Applying Global Modes (Secured by Ed25519)...');
      const uri = `/${action === 'add' ? '+' : '-'}${modes}`;
      const reqMethod = action === 'add' ? 'PUT' : 'DELETE';
      
      const res = await fetch(uri, {
        method: reqMethod,
        headers: {
          ...ivcIdentity.getAuthHeaders(reqMethod, uri)
        }
      });
      
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${data.message || data.error}`);
      } else {
        setStatus(`Success! Global Modes updated to ${data.active_modes}`);
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="bg-slate-900 p-5 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">IVC Mode Management</h2>
              <p className="text-xs text-slate-400">Zero-Trust Cryptographic Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Key className="w-3.5 h-3.5 text-indigo-500" /> Cryptographic Identity</label>
                <div className="flex border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                  <div className="bg-slate-100 px-3 py-2 text-sm text-slate-500 font-medium border-r border-slate-300">@</div>
                  <input 
                    type="text" 
                    value={asUser} 
                    onChange={(e) => handleUpdateUsername(e.target.value)}
                    className="w-full bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none"
                    placeholder="username"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-mono break-all line-clamp-1">
                  PubKey: {ivcIdentity.getPublicKeyBase64()}
                </p>
             </div>
             
             <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Action</label>
                <select 
                  value={action} 
                  onChange={(e: any) => setAction(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="add">Add (+)</option>
                  <option value="remove">Remove (-)</option>
                </select>
             </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
             <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                Target Modes
             </h3>
             <div className="grid grid-cols-2 gap-4 mb-4">
               <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Target URI</label>
                  <input 
                    type="text" 
                    value={target} 
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="#general"
                  />
               </div>
               <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Modes (e.g. m, i, o)</label>
                  <input 
                    type="text" 
                    value={modes} 
                    onChange={(e) => setModes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="m"
                  />
               </div>
             </div>
             <button onClick={applyModes} className="w-full py-2 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Apply to Target
             </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
             <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-400" />
                Global Server Modes
             </h3>
             <div className="mb-4">
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Global Modes (e.g. x, y)</label>
                  <input 
                    type="text" 
                    value={modes} 
                    onChange={(e) => setModes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="x"
                  />
             </div>
             <button onClick={applyGlobalServerModes} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Apply Globally
             </button>
          </div>

          {status && (
            <div className={`p-3 rounded-lg text-sm font-medium border ${status.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
               {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
