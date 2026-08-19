import React from 'react';
import { Hash, User, Shield, FileText, Activity, Settings, UserCircle, ShieldAlert } from 'lucide-react';

export function ChannelLandingPage({ path }: { path: string }) {
  // Remove leading slash
  const channelRaw = path.substring(1);
  
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

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className={`w-24 h-24 rounded-3xl ${bgClass} flex items-center justify-center mb-8 shadow-sm`}>
        <Icon className={`w-12 h-12 ${colorClass}`} />
      </div>
      
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
        {name || 'Unknown'}
      </h1>
      
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white shadow-sm text-sm font-medium ${colorClass} mb-8`}>
        <Icon className="w-4 h-4" />
        {type}
      </div>
      
      <p className="text-slate-500 max-w-md mx-auto leading-relaxed mb-10">
        You have reached the landing page for the IVC <span className="font-semibold text-slate-700">{type.toLowerCase()}</span> designated as <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-sm">{channelRaw}</code>.
        {type === 'Operator Channel (EE2E)' && ' This channel requires Operator (+o) privileges and utilizes EE2E encryption.'}
      </p>

      <a 
        href="/"
        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-sm"
      >
        Return to Dashboard
      </a>
    </div>
  );
}