import React, { useState, useEffect } from 'react';
import { Network, X, Link as LinkIcon, Activity, Wifi, WifiOff, RefreshCw, Terminal, Info } from 'lucide-react';
import { ivcClient, IvcMessage } from '../lib/ivcClient';
import { registerProtocolHandler } from '../lib/ivc-protocol';

interface IvcConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'connecting' | 'connected' | 'disconnected';
}

export function IvcConnectionModal({ isOpen, onClose, status }: IvcConnectionModalProps) {
  const [logs, setLogs] = useState<IvcMessage[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Listen for channel post events and server mode updates
    const removeListener = ivcClient.addListener((msg) => {
      if (msg.type === 'ivc_post' || msg.type === 'ivc_server_mode' || msg.type === 'ivc_mode_update') {
        setLogs(prev => [msg, ...prev].slice(0, 50)); // keep last 50
      }
    });
    return () => removeListener();
  }, []);

  if (!isOpen) return null;

  const handleReconnect = () => {
    setIsReconnecting(true);
    ivcClient.disconnect();
    setTimeout(() => {
      ivcClient.connect();
      setIsReconnecting(false);
    }, 1000);
  };

  const handleDisconnect = () => {
    ivcClient.disconnect();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-600" />
            IVC Connection Dashboard
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
          
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            status === 'connected' ? 'bg-green-50 border-green-200 text-green-800' : 
            status === 'connecting' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 
            'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`} />
              <div>
                <h4 className="font-bold text-sm">
                  {status === 'connected' ? 'Connected to IVC Network' : 
                   status === 'connecting' ? 'Connecting to IVC...' : 
                   'Disconnected from IVC'}
                </h4>
                <p className="text-xs opacity-80 mt-0.5">SSE Bridge: {window.location.origin}/api/ivc/stream</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {status === 'connected' ? (
                <button 
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <WifiOff className="w-3.5 h-3.5" /> Disconnect
                </button>
              ) : (
                <button 
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                  className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} /> 
                  {isReconnecting ? 'Reconnecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>

          {/* Protocol Registration Tool */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-indigo-500" />
              OS Protocol Handler
            </h4>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Register this application to handle <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded">ivc://</code> links from your operating system. This enables deep-linking from terminals, external IVC tools, and automated scripts directly into the Compose Notification view.
            </p>
            <button
              onClick={() => registerProtocolHandler()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Register ivc:// Protocol
            </button>
          </div>

          {/* Live Channel Posts */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-64">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Live Channel Posts (HTTP POST)
            </h4>
            <div className="flex-1 overflow-y-auto bg-slate-900 rounded-lg p-3 font-mono text-[11px] text-green-400 space-y-2">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic flex h-full items-center justify-center">
                  Listening for POST requests on /:channel...
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="border-b border-slate-800 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                    <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                    {log.type === 'ivc_server_mode' ? (
                       <span className="text-pink-400 font-bold mr-2">SERVER_MODE ({log.action === 'add' ? '+' : '-'}{log.modes})</span>
                    ) : log.type === 'ivc_mode_update' ? (
                       <span className="text-amber-400 font-bold mr-2">TARGET_MODE ({log.action === 'add' ? '+' : '-'}{log.modes} on {log.target})</span>
                    ) : (
                       <span className="text-indigo-400 font-bold mr-2">#{log.channel || 'unknown'}</span>
                    )}
                    <span className="text-slate-300 break-all">{JSON.stringify(log.payload)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Environment Details */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-500" />
              Environment Variables & Config
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Service Name</span>
                <span className="text-sm font-mono text-slate-700">NOTIFYBOT</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Default Channel</span>
                <span className="text-sm font-mono text-slate-700">ivc://jakedot.net/#ivc</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Execution Action</span>
                <span className="text-sm font-mono text-slate-700">/api/ivc/execute</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status Webhook</span>
                <span className="text-sm font-mono text-slate-700">/api/ivc/status</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Supported URL Schemes</span>
              <ul className="text-xs font-mono text-slate-600 space-y-1.5 list-disc pl-4">
                <li><span className="text-indigo-600">ivc://[host|service/]#channel</span> — Standard Channel</li>
                <li><span className="text-indigo-600">ivc://[host/]@user</span> — User Channel</li>
                <li><span className="text-indigo-600">ivc://[host/]§channel</span> — Metadata Channel</li>
                <li><span className="text-indigo-600">ivc://[host/]$[channel]</span> — Operator Channel (EE2E encrypted)</li>
                <li><span className="text-indigo-600">ivc://[host/][#|@|§|$]channel[+xyz-abc]</span> — Channel Modes</li>
              </ul>
            </div>

            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex gap-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-800 leading-relaxed">
                The IVC backend runs an Express.js foreign service endpoint that accepts commands from the wider IVC network. 
                When a <code>NOTIFY</code> command is received via <code>/api/ivc/execute</code>, it is streamed to this client dashboard over Server-Sent Events (SSE) and added to the Live Events queue.
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
