import { useEffect, useState, FormEvent } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout } from './lib/firebase';
import { sendEmail } from './lib/gmail';
import { ivcClient } from './lib/ivcClient';
import { parseIvcUri, registerProtocolHandler } from './lib/ivc-protocol';
import { Mail, LogOut, Send, AlertCircle, CheckCircle2, Network, Inbox, Server, Hash, User as UserIcon, Link, History, ListChecks, Save, FileText, Search, Calendar, BarChart3, Download, Eye, X, Clock, Play, Pause, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useMemo } from 'react';
import { Chatbot } from './components/Chatbot';
import { IvcConnectionModal } from './components/IvcConnectionModal';

type PendingNotification = {
  id: string;
  to: string;
  subject: string;
  body: string;
  sender: string;
  type: 'server' | 'channel' | 'user' | 'general';
  meta?: string;
};

type SentNotification = {
  id: string;
  to: string;
  subject: string;
  status: 'success' | 'error';
  timestamp: Date;
  type: 'server' | 'channel' | 'user' | 'general';
  meta?: string;
  priority?: 'high' | 'normal' | 'low';
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  notifyType: 'server' | 'channel' | 'user' | 'general';
  priority?: 'high' | 'normal' | 'low';
};

type ScheduledTask = {
  id: string;
  name: string;
  to: string;
  subject: string;
  body: string;
  type: 'server' | 'channel' | 'user' | 'general';
  meta?: string;
  priority?: 'high' | 'normal' | 'low';
  time: string; // HH:MM
  lastRun?: string;
  isActive: boolean;
};

import { ChannelLandingPage } from './components/ChannelLandingPage';

export default function App() {
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(decodeURIComponent(window.location.pathname));
  }, []);

  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [notifyType, setNotifyType] = useState<'server' | 'channel' | 'user' | 'general'>('general');
  const [eventMeta, setEventMeta] = useState('');
  const [priority, setPriority] = useState<'high' | 'normal' | 'low'>('normal');

  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // IVC Network State
  const [ivcStatus, setIvcStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [pendingQueue, setPendingQueue] = useState<PendingNotification[]>([]);
  const [sentLogs, setSentLogs] = useState<SentNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'live' | 'scheduled'>('live');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isIvcModalOpen, setIsIvcModalOpen] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleName, setScheduleName] = useState('');
  
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    const saved = localStorage.getItem('ivc_templates');
    return saved ? JSON.parse(saved) : [];
  });

  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>(() => {
    const saved = localStorage.getItem('ivc_scheduled_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ivc_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('ivc_scheduled_tasks', JSON.stringify(scheduledTasks));
  }, [scheduledTasks]);

  useEffect(() => {
    // Scheduled execution engine
    const interval = setInterval(() => {
      const now = new Date();
      const currentHourMin = format(now, 'HH:mm');
      const todayDateStr = format(now, 'yyyy-MM-dd');
      
      let tasksToRun = scheduledTasks.filter(t => t.isActive && t.time === currentHourMin && t.lastRun !== todayDateStr);
      
      if (tasksToRun.length > 0) {
        tasksToRun.forEach(task => {
           const compiled = getCompiledEmail(task.subject, task.body, task.type, task.meta || '', task.priority || 'normal');
           dispatchEmail(task.to, compiled.subject, compiled.body, task.type, task.meta, task.priority || 'normal', undefined, true);
        });
        
        setScheduledTasks(prev => prev.map(t => 
          tasksToRun.find(run => run.id === t.id) ? { ...t, lastRun: todayDateStr } : t
        ));
      }
    }, 15000); // Check every 15s to guarantee we hit the correct minute
    return () => clearInterval(interval);
  }, [scheduledTasks]);

  useEffect(() => {
    // Check if launched via ivc:// protocol
    const urlParams = new URLSearchParams(window.location.search);
    const uriParam = urlParams.get('uri');
    if (uriParam) {
      const parsedUri = parseIvcUri(uriParam);
      if (parsedUri && parsedUri.action === 'notify') {
        setTo(parsedUri.target);
        if (parsedUri.params.subject) setSubject(parsedUri.params.subject);
        if (parsedUri.params.body) setBody(parsedUri.params.body);
        
        if (parsedUri.params.type === 'server' || parsedUri.params.type === 'channel' || parsedUri.params.type === 'user') {
          setNotifyType(parsedUri.params.type as any);
        }
        if (parsedUri.params.meta) setEventMeta(parsedUri.params.meta);
        
        // Clean up URL so it doesn't stay in the address bar
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const unsubscribe = initAuth(
      (user) => {
        setUser(user);
        setNeedsAuth(false);
        setIsInitializing(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
        setIsInitializing(false);
      }
    );

    // Request desktop notification permissions
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Initialize IVC Network Connection via SSE Bridge
    setIvcStatus('connecting');
    ivcClient.onConnect = () => setIvcStatus('connected');
    ivcClient.onDisconnect = () => setIvcStatus('disconnected');
    
    // Listen to IVC network for notification triggers
    ivcClient.onMessage = (msg) => {
      if (msg.type === 'ivc_post') {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`New Post in #${msg.channel || 'unknown'}`, {
            body: JSON.stringify(msg.payload),
            icon: '/favicon.ico'
          });
        }
      } else if (msg.type === 'ivc_server_mode') {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Global Mode: ${msg.action === 'add' ? '+' : '-'}${msg.modes}`, {
            body: `Applied by ${msg.sender}. Active modes: +${msg.active_modes}`,
            icon: '/favicon.ico'
          });
        }
      } else if (msg.type === 'ivc_mode_update') {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Mode Update: ${msg.action === 'add' ? '+' : '-'}${msg.modes} on ${msg.target}`, {
            body: `Applied by ${msg.sender}`,
            icon: '/favicon.ico'
          });
        }
      } else if (msg.type === 'ivc_command' && msg.command) {
        console.log('[IVC] Received command:', msg.command);
        const cmd = msg.command;
        const parts = cmd.split(' ');
        const rootCommand = parts[0].toUpperCase();
        
        if (rootCommand.startsWith('NOTIFY')) {
          let eventType: 'server' | 'channel' | 'user' | 'general' = 'general';
          let meta = '';
          let emailIdx = 1;

          if (rootCommand === 'NOTIFY_SERVER') {
            eventType = 'server';
          } else if (rootCommand === 'NOTIFY_CHANNEL') {
            eventType = 'channel';
            meta = parts[1];
            emailIdx = 2;
          } else if (rootCommand === 'NOTIFY_USER') {
            eventType = 'user';
            meta = parts[1];
            emailIdx = 2;
          }

          const email = parts[emailIdx];
          const rest = parts.slice(emailIdx + 1).join(' ');
          
          // Auto-detect channel from email format (e.g., #general@jakedot.net)
          if (eventType === 'general' && email && email.startsWith('#') && email.endsWith('@jakedot.net')) {
            eventType = 'channel';
            meta = email.split('@')[0];
          }

          const splitIdx = rest.indexOf('|');
          
          let parsedSubject = rest;
          let parsedBody = rest;
          
          if (splitIdx !== -1) {
            parsedSubject = rest.substring(0, splitIdx).trim();
            parsedBody = rest.substring(splitIdx + 1).trim();
          }

          setPendingQueue(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            to: email,
            subject: parsedSubject,
            body: parsedBody,
            sender: msg.sender || 'Unknown IVC Bot',
            type: eventType,
            meta: meta
          }]);
        }
      }
    };
    
    ivcClient.connect();

    return () => {
      unsubscribe();
      ivcClient.disconnect();
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        setLoginError('Sign-in was cancelled. Please try again.');
      } else {
        setLoginError(err?.message || 'An error occurred during sign-in.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setStatus(null);
  };

  const dispatchEmail = async (targetTo: string, targetSubject: string, targetBody: string, eventType: 'server' | 'channel' | 'user' | 'general' = 'general', eventMeta?: string, eventPriority: 'high' | 'normal' | 'low' = 'normal', callback?: () => void, isAutomated: boolean = false) => {
    if (!isAutomated) {
      const confirmed = window.confirm(
        `Send email to ${targetTo}?\n\nSubject: ${targetSubject}\n\nThis action will immediately send the email from your Gmail account.`
      );
      if (!confirmed) return;
    }

    setIsSending(true);
    setStatus(null);
    try {
      await sendEmail(targetTo, targetSubject, targetBody);
      setStatus({ type: 'success', message: `Email notification to ${targetTo} sent successfully!` });
      ivcClient.send({ type: 'notification_sent', payload: { to: targetTo, subject: targetSubject } });
      
      setSentLogs(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        to: targetTo,
        subject: targetSubject,
        status: 'success',
        timestamp: new Date(),
        type: eventType,
        meta: eventMeta,
        priority: eventPriority
      }, ...prev]);

      if (callback) callback();
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to send email. Ensure you granted permissions.' });
      
      setSentLogs(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        to: targetTo,
        subject: targetSubject,
        status: 'error',
        timestamp: new Date(),
        type: eventType,
        meta: eventMeta,
        priority: eventPriority
      }, ...prev]);
    } finally {
      setIsSending(false);
    }
  };

  const getCompiledEmail = (rawSubject: string, rawBody: string, type: string, meta: string, msgPriority: string = 'normal') => {
    let finalSubject = rawSubject;
    let finalBody = rawBody;
    
    if (type === 'server') {
      finalSubject = `[Server Alert] ${rawSubject}`;
      finalBody = `IVC Server Event:\n\n${rawBody}`;
    } else if (type === 'channel') {
      finalSubject = `[Channel ${meta}] ${rawSubject}`;
      finalBody = `IVC Channel Event in ${meta}:\n\n${rawBody}`;
    } else if (type === 'user') {
      finalSubject = `[User Update: ${meta}] ${rawSubject}`;
      finalBody = `IVC User Event regarding ${meta}:\n\n${rawBody}`;
    }

    if (msgPriority === 'high') {
      finalSubject = `[URGENT] ${finalSubject}`;
    } else if (msgPriority === 'low') {
      finalSubject = `[Low Priority] ${finalSubject}`;
    }
    
    return { subject: finalSubject, body: finalBody };
  };

  const handleSaveSchedule = (e: FormEvent) => {
    e.preventDefault();
    if (!subject || !body || !to || !scheduleName) return;
    
    setScheduledTasks(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      name: scheduleName,
      to,
      subject,
      body,
      type: notifyType,
      meta: eventMeta,
      priority,
      time: scheduleTime,
      isActive: true
    }]);
    
    setIsScheduleModalOpen(false);
    setScheduleName('');
    setStatus({ type: 'success', message: `Scheduled task "${scheduleName}" created!` });
  };

  const handleSendManual = async (e: FormEvent) => {
    e.preventDefault();
    if (!to || !subject || !body) return;

    const compiled = getCompiledEmail(subject, body, notifyType, eventMeta, priority);
    await dispatchEmail(to, compiled.subject, compiled.body, notifyType, eventMeta, priority, () => {
      setTo('');
      setSubject('');
      setBody('');
      setEventMeta('');
      setNotifyType('general');
      setPriority('normal');
    });
  };

  const handleSaveTemplate = () => {
    if (!subject || !body) {
      alert('Please fill out at least a subject and a body to save a template.');
      return;
    }
    const name = window.prompt('Enter a name for this template (e.g. "Server Reboot Warning"):');
    if (name) {
      setTemplates(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        name,
        subject,
        body,
        notifyType,
        priority
      }]);
      setStatus({ type: 'success', message: `Template "${name}" saved successfully!` });
    }
  };

  const executePending = async (notification: PendingNotification) => {
    const compiled = getCompiledEmail(notification.subject, notification.body, notification.type, notification.meta || '', 'normal');
    await dispatchEmail(notification.to, compiled.subject, compiled.body, notification.type, notification.meta, 'normal', () => {
      setPendingQueue(prev => prev.filter(n => n.id !== notification.id));
    });
  };

  const executeAllPending = async () => {
    if (pendingQueue.length === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to bulk send ${pendingQueue.length} notifications?`);
    if (!confirmed) return;
    
    // Process sequentially to avoid overwhelming the Gmail API
    for (const notification of pendingQueue) {
      const compiled = getCompiledEmail(notification.subject, notification.body, notification.type, notification.meta || '', 'normal');
      await dispatchEmail(notification.to, compiled.subject, compiled.body, notification.type, notification.meta, 'normal', () => {
        setPendingQueue(prev => prev.filter(n => n.id !== notification.id));
      });
    }
  };
  
  const dismissPending = (id: string) => {
    setPendingQueue(prev => prev.filter(n => n.id !== id));
  };

  const filteredPendingQueue = pendingQueue.filter(item => 
    item.to.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSentLogs = sentLogs.filter(log => 
    log.to.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const dateFilteredSentLogs = useMemo(() => {
    return filteredSentLogs.filter(log => {
      if (startDate && new Date(log.timestamp) < startOfDay(parseISO(startDate))) return false;
      if (endDate && new Date(log.timestamp) > endOfDay(parseISO(endDate))) return false;
      return true;
    });
  }, [filteredSentLogs, startDate, endDate]);

  const chartData = useMemo(() => {
    const counts: Record<string, { date: string; success: number; error: number }> = {};
    dateFilteredSentLogs.forEach(log => {
      const dateStr = format(new Date(log.timestamp), 'MMM dd');
      if (!counts[dateStr]) counts[dateStr] = { date: dateStr, success: 0, error: 0 };
      counts[dateStr][log.status]++;
    });
    // Return sorted by date
    return Object.values(counts).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [dateFilteredSentLogs]);

  const handleDownloadCSV = () => {
    if (dateFilteredSentLogs.length === 0) return;

    const headers = ['ID', 'To', 'Subject', 'Status', 'Timestamp', 'Type', 'Meta', 'Priority'];
    const rows = dateFilteredSentLogs.map(log => [
      log.id,
      `"${log.to.replace(/"/g, '""')}"`,
      `"${log.subject.replace(/"/g, '""')}"`,
      log.status,
      log.timestamp.toISOString(),
      log.type,
      `"${(log.meta || '').replace(/"/g, '""')}"`,
      log.priority || 'normal'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ivc_history_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEventIcon = (type: string) => {
    switch(type) {
      case 'server': return <Server className="w-3.5 h-3.5" />;
      case 'channel': return <Hash className="w-3.5 h-3.5" />;
      case 'user': return <UserIcon className="w-3.5 h-3.5" />;
      default: return <Mail className="w-3.5 h-3.5" />;
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  // Intercept routing for channel landing pages
  if (currentPath && currentPath !== '/' && currentPath !== '/index.html') {
    return <ChannelLandingPage path={currentPath} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-lg">
            <Mail className="w-6 h-6" />
            <span>Notification Sender</span>
          </div>
          <div className="h-4 w-px bg-slate-300"></div>
          <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => setIsIvcModalOpen(true)}>
            <Network className="w-3.5 h-3.5" />
            <span>
              IVC Network: {ivcStatus === 'connecting' ? 'Connecting...' : ivcStatus === 'connected' ? 'Connected' : 'Offline'}
            </span>
            <div className={`w-2 h-2 rounded-full ml-1 ${ivcStatus === 'connected' ? 'bg-green-500' : ivcStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-400'}`}></div>
          </div>
        </div>
        
        {user && !needsAuth && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 font-medium">
              {user.email}
            </span>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto p-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2">
          {needsAuth ? (
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 text-center">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Connect Gmail</h2>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                Sign in with Google to enable sending email notifications on your behalf.
              </p>
              
              {loginError && (
                <div className="mb-6 max-w-sm mx-auto p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {loginError}
                </div>
              )}
              
              <button 
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button mx-auto disabled:opacity-50"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper flex items-center gap-3 px-4 py-2 border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer bg-white">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-medium text-slate-600">Sign in with Google</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Compose Notification</h1>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    registerProtocolHandler();
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors border border-indigo-200 shadow-sm"
                  title="Allow this browser to open ivc:// links"
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>Register ivc:// Protocol</span>
                </button>
              </div>
              
              {status && (
                <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <p className="font-medium text-sm">{status.message}</p>
                </div>
              )}

              {templates.length > 0 && (
                <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-sm whitespace-nowrap">
                    <FileText className="w-4 h-4" />
                    <span>Load Template:</span>
                  </div>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const t = templates.find(t => t.id === e.target.value);
                        if (t) {
                          let newSubject = t.subject;
                          let newBody = t.body;

                          const extractPlaceholders = (text: string) => {
                            const regex = /\{\{([^}]+)\}\}/g;
                            const matches: string[] = [];
                            let match;
                            while ((match = regex.exec(text)) !== null) {
                              matches.push(match[1]);
                            }
                            return matches;
                          };

                          let placeholders = Array.from(new Set([
                            ...extractPlaceholders(newSubject),
                            ...extractPlaceholders(newBody)
                          ]));

                          if (placeholders.includes('timestamp')) {
                            const nowStr = new Date().toLocaleString();
                            newSubject = newSubject.replace(/\{\{timestamp\}\}/g, nowStr);
                            newBody = newBody.replace(/\{\{timestamp\}\}/g, nowStr);
                            placeholders = placeholders.filter(p => p !== 'timestamp');
                          }

                          const values: Record<string, string> = {};
                          for (const ph of placeholders) {
                            const val = window.prompt(`Enter value for placeholder: {{${ph}}}`);
                            values[ph] = val || '';
                          }

                          for (const ph of placeholders) {
                            const regex = new RegExp(`\\{\\{${ph}\\}\\}`, 'g');
                            newSubject = newSubject.replace(regex, values[ph]);
                            newBody = newBody.replace(regex, values[ph]);
                          }

                          setSubject(newSubject);
                          setBody(newBody);
                          setNotifyType(t.notifyType);
                          if (t.priority) setPriority(t.priority);
                        }
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 w-full sm:w-auto px-3 py-1.5 rounded bg-white border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select a saved template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <form onSubmit={handleSendManual} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Event Type
                    </label>
                    <select 
                      value={notifyType}
                      onChange={(e: any) => setNotifyType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="general">General Broadcast</option>
                      <option value="server">Server Event</option>
                      <option value="channel">Channel Event</option>
                      <option value="user">User Event</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Priority
                    </label>
                    <select 
                      value={priority}
                      onChange={(e: any) => setPriority(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  
                  {notifyType === 'channel' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Channel Name</label>
                      <input type="text" value={eventMeta} onChange={e => {
                        const val = e.target.value;
                        setEventMeta(val);
                        const cleanChannel = val.startsWith('#') ? val : `#${val}`;
                        if (val) setTo(`${cleanChannel}@jakedot.net`);
                      }} placeholder="#general" required className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  )}
                  {notifyType === 'user' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Username</label>
                      <input type="text" value={eventMeta} onChange={e => setEventMeta(e.target.value)} placeholder="Username" required className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="to" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    id="to"
                    value={to}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTo(val);
                      if (val.startsWith('#') && val.endsWith('@jakedot.net')) {
                        setNotifyType('channel');
                        setEventMeta(val.split('@')[0]);
                      }
                    }}
                    placeholder="user@example.com"
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Event Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Mode change, reboot warning, etc."
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                  />
                </div>

                <div>
                  <label htmlFor="body" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Event Details
                  </label>
                  <textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Provide details about the event..."
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow resize-none"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={isSending || !to || !subject || !body || (notifyType !== 'general' && notifyType !== 'server' && !eventMeta)}
                    className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isSending ? (
                      'Sending...'
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(true)}
                    disabled={!subject || !body || (notifyType !== 'general' && notifyType !== 'server' && !eventMeta)}
                    className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                    title="Preview compiled email"
                  >
                    <Eye className="w-5 h-5" />
                    <span>Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(true)}
                    disabled={!subject || !body || !to || (notifyType !== 'general' && notifyType !== 'server' && !eventMeta)}
                    className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                    title="Schedule this event as a recurring task"
                  >
                    <Clock className="w-5 h-5" />
                    <span>Schedule</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={!subject || !body}
                    className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                    title="Save current subject and body as a reusable template"
                  >
                    <Save className="w-5 h-5" />
                    <span>Save</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {!needsAuth && (
            <div className="mt-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-xl font-bold text-slate-800">Analytics Dashboard</h2>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Calendar className="w-4 h-4" />
                    <span>Range:</span>
                  </div>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-slate-400">to</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {chartData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="success" name="Successful" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="error" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 w-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <p className="text-slate-400 font-medium">No activity data in selected range.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* IVC Pending Queue Sidebar */}
        {!needsAuth && (
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[824px]">
              
              <div className="flex border-b border-slate-200 bg-white">
                <button
                  onClick={() => setSidebarTab('live')}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${sidebarTab === 'live' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Inbox className="w-4 h-4" /> Live Events
                </button>
                <button
                  onClick={() => setSidebarTab('scheduled')}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${sidebarTab === 'scheduled' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Clock className="w-4 h-4" /> Scheduled Tasks
                </button>
              </div>

              {sidebarTab === 'live' ? (
                <div className="flex flex-col h-full overflow-hidden flex-1">
                  <div className="p-3 border-b border-slate-200 bg-slate-50">
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter queues by email or subject..." 
                        className="w-full bg-transparent border-none outline-none text-xs placeholder:text-slate-400 focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* IVC Event Queue */}
                  <div className="flex-1 flex flex-col border-b border-slate-200 overflow-hidden min-h-[300px]">
                    <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                        <Inbox className="w-4 h-4" />
                        <h3>IVC Event Queue</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {filteredPendingQueue.length > 0 && (
                          <button
                            onClick={executeAllPending}
                            disabled={isSending}
                            className="flex items-center gap-1 text-[10px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded transition-colors disabled:opacity-50 shadow-sm"
                            title="Execute all pending notifications sequentially"
                          >
                            <ListChecks className="w-3 h-3" /> Bulk Send
                          </button>
                        )}
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {filteredPendingQueue.length}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-3 flex-1 overflow-y-auto space-y-3 bg-slate-50">
                      {filteredPendingQueue.length === 0 ? (
                        <div className="text-center text-slate-400 text-xs py-6">
                          {searchQuery ? 'No matching events found.' : 'No pending events from IVC network.'}
                        </div>
                      ) : (
                  filteredPendingQueue.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 capitalize border border-slate-200">
                          {getEventIcon(item.type)}
                          {item.type} {item.meta && `· ${item.meta}`}
                        </div>
                      </div>
                      <p className="text-xs text-indigo-600 font-semibold mb-1 truncate">{item.sender} &rarr; {item.to}</p>
                      <p className="text-sm font-semibold text-slate-800 mb-1">{item.subject}</p>
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2">{item.body}</p>
                      
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                        <button 
                          onClick={() => executePending(item)}
                          disabled={isSending}
                          className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-1.5 px-3 rounded text-xs transition-colors disabled:opacity-50 flex justify-center items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Send
                        </button>
                        <button 
                          onClick={() => dismissPending(item.id)}
                          disabled={isSending}
                          className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium py-1.5 px-3 rounded text-xs transition-colors disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between border-t border-slate-200">
                <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                  <History className="w-4 h-4" />
                  <h3>Sent History</h3>
                </div>
                <div className="flex items-center gap-2">
                  {dateFilteredSentLogs.length > 0 && (
                    <button
                      onClick={handleDownloadCSV}
                      className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 px-2 py-1 rounded transition-colors shadow-sm"
                      title="Download CSV"
                    >
                      <Download className="w-3 h-3" />
                      CSV
                    </button>
                  )}
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {dateFilteredSentLogs.length}
                  </span>
                </div>
              </div>
              
              <div className="p-3 flex-1 overflow-y-auto space-y-3 bg-slate-50">
                {dateFilteredSentLogs.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-6">
                    {searchQuery || startDate || endDate ? 'No matching history found.' : 'No notifications sent yet.'}
                  </div>
                ) : (
                  dateFilteredSentLogs.map(log => (
                    <div key={log.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 text-sm">
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 capitalize border border-slate-200">
                          {getEventIcon(log.type)}
                          {log.type} {log.meta && `· ${log.meta}`}
                        </div>
                        {log.priority === 'high' && (
                          <span className="flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 uppercase tracking-wider">
                            High
                          </span>
                        )}
                        {log.priority === 'low' && (
                          <span className="flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wider">
                            Low
                          </span>
                        )}
                        {log.status === 'success' ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Sent
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-1.5 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-800 truncate mb-0.5">{log.to}</p>
                      <p className="text-slate-500 text-xs truncate mb-1">{log.subject}</p>
                      <p className="text-slate-400 text-[10px] text-right">{log.timestamp.toLocaleTimeString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                  <div className="p-4 flex-1 overflow-y-auto space-y-4">
                    {scheduledTasks.length === 0 ? (
                      <div className="text-center text-slate-400 text-sm py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl m-4">
                        <Clock className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                        <p className="font-semibold text-slate-600 mb-1">No Scheduled Tasks</p>
                        <p>Fill out the Compose Notification form and click "Schedule" to create a recurring event.</p>
                      </div>
                    ) : (
                      scheduledTasks.map(task => (
                        <div key={task.id} className={`bg-white p-4 rounded-xl border transition-all ${task.isActive ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-slate-200 shadow-sm opacity-60'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-slate-800">{task.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Daily at {task.time}
                                </span>
                                {task.lastRun && (
                                  <span className="text-[10px] text-slate-500 font-medium">Last: {task.lastRun}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setScheduledTasks(prev => prev.map(t => t.id === task.id ? { ...t, isActive: !t.isActive } : t))}
                                className={`p-1.5 rounded transition-colors ${task.isActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                title={task.isActive ? "Pause Task" : "Resume Task"}
                              >
                                {task.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => setScheduledTasks(prev => prev.filter(t => t.id !== task.id))}
                                className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Delete Task"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-sm">
                            <p className="text-slate-600 text-xs mb-1"><span className="font-semibold">To:</span> {task.to}</p>
                            <p className="text-slate-800 font-medium line-clamp-1 mb-1">{task.subject}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 capitalize border border-slate-200">
                                {task.type} {task.meta && `· ${task.meta}`}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'low' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                                {task.priority || 'normal'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                Email Preview
              </h3>
              <button 
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To:</span>
                <p className="mt-1 text-slate-900 font-medium">{to || '<Recipient Email>'}</p>
              </div>
              
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject:</span>
                <p className="mt-1 text-slate-900 font-medium p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  {getCompiledEmail(subject, body, notifyType, eventMeta, priority).subject || '<Subject>'}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Body:</span>
                <div className="mt-1 text-slate-800 p-4 bg-slate-50 border border-slate-200 rounded-lg whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {getCompiledEmail(subject, body, notifyType, eventMeta, priority).body || '<Body Content>'}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Schedule Recurring Task
              </h3>
              <button 
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveSchedule} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Task Name
                </label>
                <input
                  type="text"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  placeholder="e.g. Daily Server Health Check"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Time of Day (Local Time)
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="bg-indigo-50 text-indigo-800 text-sm p-4 rounded-lg border border-indigo-100 flex gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>This task will execute every day at the scheduled time automatically as long as this application tab remains open.</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gemini Chatbot */}
      <Chatbot />

      {/* IVC Connection Modal */}
      <IvcConnectionModal 
        isOpen={isIvcModalOpen} 
        onClose={() => setIsIvcModalOpen(false)} 
        status={ivcStatus} 
      />
    </div>
  );
}
