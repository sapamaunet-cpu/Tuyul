'use client';
import { useState, useRef } from 'react';

export default function AutomatorPage() {
  const [config, setConfig] = useState({ msnCount: 10, msnDelay: 35, bingCount: 20, bingDelay: 30 });
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const wakeLockRef = useRef(null);

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p]);

  const checkAndResetDailyCache = () => {
    const today = new Date().toDateString();
    const lastResetDate = localStorage.getItem('last_reset_date');
    if (lastResetDate !== today) {
      localStorage.removeItem('used_keywords');
      localStorage.removeItem('used_links');
      localStorage.setItem('last_reset_date', today);
      addLog("📅 Cache harian direset!");
    }
  };

  const getUsedData = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  const saveToCache = (key, item) => {
    const used = getUsedData(key);
    if (!used.includes(item)) {
      used.push(item);
      localStorage.setItem(key, JSON.stringify(used));
    }
  };

  const toggleWakeLock = async (on) => {
    if (on && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsWakeLocked(true);
      } catch {}
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release();
      setIsWakeLocked(false);
    }
  };

  const startAutomation = async () => {
    if (isRunning) return;
    checkAndResetDailyCache();
    setIsRunning(true);
    await toggleWakeLock(true);
    addLog("🚀 Memulai mode simulasi manual...");

    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();

      const usedKeywords = getUsedData('used_keywords');
      const usedLinks = getUsedData('used_links');

      const selectedKeywords = data.allKeywords.filter(k => !usedKeywords.includes(k)).sort(() => 0.5 - Math.random()).slice(0, Number(config.bingCount));
      const selectedLinks = data.allLinks.filter(l => !usedLinks.includes(l)).sort(() => 0.5 - Math.random()).slice(0, Number(config.msnCount));

      // --- LOOP BING SEARCH (DITWEAK UNTUK BING APP) ---
      for (let i = 0; i < selectedKeywords.length; i++) {
        const word = selectedKeywords[i];
        
        // Delay dibuat agak acak tapi tetap lambat agar poin pecah
        const safeDelay = Number(config.bingDelay) < 25 ? 25 : Number(config.bingDelay);
        const actualDelay = (safeDelay + (Math.random() * 8)).toFixed(1);
        
        // CVID dan ID unik per pencarian
        const cvid = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        
        // Menggunakan parameter yang kamu sebutkan tadi (PC=SANSAAND)
        const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(word)}&PC=SANSAAND&FORM=QSRE5&cvid=${cvid}`;
        
        addLog(`[Bing ${i+1}] ${word} (${actualDelay}s)`);
        
        const win = window.open(searchUrl, '_blank');
        saveToCache('used_keywords', word);

        await new Promise(r => setTimeout(r, actualDelay * 1000));
        if (win) win.close();
        
        // Jeda istirahat agar sistem Bing App tidak curiga
        await new Promise(r => setTimeout(r, 3000));
      }

      // --- LOOP MSN NEWS ---
      for (let i = 0; i < selectedLinks.length; i++) {
        const link = selectedLinks[i];
        const actualMsnDelay = (Number(config.msnDelay) + (Math.random() * 10)).toFixed(1);
        
        addLog(`[MSN ${i+1}] Reading... (${actualMsnDelay}s)`);
        const win = window.open(link, '_blank');
        saveToCache('used_links', link);

        await new Promise(r => setTimeout(r, actualMsnDelay * 1000));
        if (win) win.close();
        await new Promise(r => setTimeout(r, 2000));
      }

      addLog("✅ SEMUA TUGAS SELESAI!");
    } catch (err) {
      addLog("❌ Error: " + err.message);
    } finally {
      setIsRunning(false);
      await toggleWakeLock(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h1 className="text-xl font-bold">BING APP HELPER</h1>
          <p className="text-xs opacity-80 uppercase tracking-widest">{isWakeLocked ? 'Wake Lock On' : 'Wake Lock Off'}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Bing Count</label>
              <input type="number" value={config.bingCount} onChange={e => setConfig({...config, bingCount: e.target.value})} className="w-full border-b-2 p-1 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Bing Delay</label>
              <input type="number" value={config.bingDelay} onChange={e => setConfig({...config, bingDelay: e.target.value})} className="w-full border-b-2 p-1 outline-none focus:border-blue-500" />
            </div>
          </div>
          <button onClick={startAutomation} disabled={isRunning} className={`w-full py-4 rounded-2xl font-bold text-white transition ${isRunning ? 'bg-slate-300' : 'bg-blue-600 active:scale-95'}`}>
            {isRunning ? 'SEDANG JALAN...' : 'GASKEUN'}
          </button>
          <div className="mt-6 bg-slate-900 rounded-xl p-4 h-60 overflow-y-auto font-mono text-[10px] text-blue-300">
            {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
