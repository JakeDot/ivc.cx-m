import React, { useState, useEffect, useRef } from 'react';
import { Hash, User, Shield, FileText, Activity, Settings, UserCircle, ShieldAlert, Send, Key } from 'lucide-react';
import { ivcClient, IvcMessage } from '../lib/ivcClient';
import { ivcIdentity } from '../lib/ivcIdentity';

export function ChannelLandingPage({ path }: { path: string }) {
  // Remove leading slash
  const channelRaw = path.substring(1);
  const [messages, setMessages] = useState<IvcMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  let type = 'unknown';
  let name = channelRaw;
  let Icon = Hash;
  let colorClass = 'text-slate-500';
  let bgClass = 'bg-slate-50';

  if (channelRaw.startsWith('#')) {
    type = 'Standard Channel';
    name = channelRaw.substring(1);
    Icon = Hash;
    colorClass = 'text-indigo-500';
    bgClass = 'bg-indigo-50';
  } else if (channelRaw.startsWith('@')) {
    type = 'User Channel';
    name = channelRaw.substring(1);
    Icon = User;
    colorClass = 'text-blue-500';
    bgClass = 'bg-blue-50';
  } else if (channelRaw.startsWith('+')) {
    type = 'Server Mode';
    name = channelRaw.substring(1);
    Icon = Settings;
    colorClass = 'text-emerald-500';
    bgClass = 'bg-emerald-50';
  } else if (channelRaw.startsWith('$')) {
    type = 'Operator Channel (EE2E)';
    name = channelRaw.substring(1);
    Icon = ShieldAlert;
    colorClass = 'text-rose-500';
    bgClass = 'bg-rose-50';
  } else if (channelRaw.startsWith('§')) {
    type = 'Metadata Channel';
    name = channelRaw.substring(1);
    Icon = FileText;
    colorClass = 'text-amber-500';
    bgClass = 'bg-amber-50';
  } else if (channelRaw.startsWith('∆')) {
    type = 'Stats Channel';
    name = channelRaw.substring(1);
    Icon = Activity;
    colorClass = 'text-cyan-500';
    bgClass = 'bg-cyan-50';
  } else if (channelRaw.startsWith('~')) {
    type = 'Usage Profile';
    name = channelRaw.substring(1);
    Icon = UserCircle;
    colorClass = 'text-fuchsia-500';
    bgClass = 'bg-fuchsia-50';
  }

  useEffect(() => {
    // Clear messages when channel changes
    setMessages([]);
    
    // Subscribe to SSE
    const unsubscribe = ivcClient.addListener((msg) => {
      // Decode channel names correctly if they are URL encoded by SSE server
      let msgChannel = msg.channel || '';
      if (msgChannel === channelRaw || msgChannel === encodeURIComponent(channelRaw)) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => unsubscribe();
  }, [channelRaw]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setErrorMsg(null);
    setIsSending(true);

    try {
      const payload = { msg: inputText.trim() };
      const uri = `/${encodeURIComponent(channelRaw)}`;
      
      const res = await fetch(uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...ivcIdentity.getAuthHeaders('POST', uri, payload)
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || data.error || 'Failed to send message');
      } else {
        setInputText('');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colorClass}`} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">{name || 'Unknown'}</h1>
            <p className="text-xs text-slate-500 font-medium">{type}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full mb-1">
            @{ivcIdentity.username}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono tracking-tighter" title={ivcIdentity.getPublicKeyBase64()}>
            <Key className="w-3 h-3" />
            <span>{ivcIdentity.getPublicKeyBase64().substring(0, 16)}...</span>
          </div>
        </div>
        <a 
          href="/"
          className="ml-4 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Back to Hub
        </a>
      </header>
      
      <div className="w-full max-w-4xl flex-1 flex flex-col p-4 md:p-6 h-[calc(100vh-80px)]">
        <div 
          ref={scrollRef}
          className="flex-1 bg-white border border-slate-200 rounded-t-2xl shadow-sm p-6 overflow-y-auto"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <Icon className="w-16 h-16 opacity-20" />
              <p>No messages yet in {channelRaw}. Start the conversation!</p>
              {type === 'Operator Channel (EE2E)' && (
                <p className="text-xs max-w-sm text-center">This channel requires Operator (+o) privileges and utilizes EE2E encryption.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => {
                const isMe = msg.sender === `@${ivcIdentity.username}` || msg.sender?.startsWith(`@${ivcIdentity.username}+`);
                
                return (
                  <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-bold text-slate-700">
                        {msg.sender || 'anonymous'}
                      </span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-br-sm' 
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.payload?.msg || JSON.stringify(msg.payload)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl p-4 shadow-sm">
          {errorMsg && (
            <div className="mb-3 p-3 bg-red-50 text-red-700 text-xs font-medium rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${channelRaw}...`}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              disabled={isSending}
            />
            <button 
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="mt-2 text-center">
             <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5">
               <Shield className="w-3 h-3 text-emerald-500" />
               Secured by Zero-Trust Ed25519 Signatures
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}