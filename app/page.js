'use client';
import { useState, useRef } from 'react';

export default function AutomatorPage() {
  const [config, setConfig] = useState({ msnCount: 10, msnDelay: 35, bingCount: 20, bingDelay: 12 });
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const wakeLockRef = useRef(null);

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p]);

  // --- LOGIKA ANTI-DUPLIKASI HARIAN ---
  const checkAndResetDailyCache = () => {
    const today = new Date().toDateString(); // Format: "Mon May 11 2026"
    const lastResetDate = localStorage.getItem('last_reset_date');

    // Jika hari ini berbeda dengan hari terakhir reset, kosongkan cache
    if (lastResetDate !== today) {
      localStorage.removeItem('used_keywords');
      localStorage.removeItem('used_links');
      localStorage.setItem('last_reset_date', today);
      addLog("📅 Hari baru dimulai. Memori duplikasi hari kemarin telah dibersihkan.");
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

  // --- WAKE LOCK (CEGAH LAYAR MATI) ---
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

  // Generator Parameter Unik MSN
  const generateParams = () => {
    const ocids = ['binghp', 'bingsapp', 'mqs', 'winp2oct'];
    const cvid = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    return `ocid=${ocids[Math.floor(Math.random() * ocids.length)]}&cvid=${cvid}&ei=${Math.floor(Math.random() * 99)}`;
  };

  const startAutomation = async () => {
    if (isRunning) return;
    
    // 1. Jalankan pembersihan cache jika sudah ganti hari
    checkAndResetDailyCache();
    
    setIsRunning(true);
    await toggleWakeLock(true);
    addLog("🚀 Memulai pemeriksaan tugas harian...");

    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();

      const usedKeywords = getUsedData('used_keywords');
      const usedLinks = getUsedData('used_links');

      // 2. Filter: Hanya ambil yang BELUM diproses di hari yang sama
      const freshKeywords = data.allKeywords.filter(k => !usedKeywords.includes(k));
      const freshLinks = data.allLinks.filter(l => !usedLinks.includes(l));

      const selectedKeywords = freshKeywords.sort(() => 0.5 - Math.random()).slice(0, Number(config.bingCount));
      const selectedLinks = freshLinks.sort(() => 0.5 - Math.random()).slice(0, Number(config.msnCount));

      if (selectedKeywords.length === 0 && selectedLinks.length === 0) {
        addLog("⚠️ Semua tugas untuk hari ini sudah selesai dikerjakan.");
        setIsRunning(false);
        return;
      }

      // --- EKSEKUSI BING SEARCH ---
      if (selectedKeywords.length > 0) {
        addLog(`🔍 Menjalankan ${selectedKeywords.length} pencarian unik hari ini...`);
        for (let i = 0; i < selectedKeywords.length; i++) {
          const word = selectedKeywords[i];
          const delay = (Number(config.bingDelay) + (Math.random() * 6 - 3)).toFixed(1);
          
          addLog(`[Bing ${i+1}/${selectedKeywords.length}] Search: ${word} (${delay}s)`);
          const win = window.open(`https://www.bing.com/search?q=${encodeURIComponent(word)}`, '_blank');
          
          saveToCache('used_keywords', word); // Tandai sudah dipakai hari ini
          await new Promise(r => setTimeout(r, delay * 1000));
          win?.close();
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      // --- EKSEKUSI MSN READ ---
      if (selectedLinks.length > 0) {
        addLog(`📰 Membaca ${selectedLinks.length} artikel unik hari ini...`);
        for (let i = 0; i < selectedLinks.length; i++) {
          const link = selectedLinks[i];
          const finalUrl = `${link}${link.includes('?') ? '&' : '?'}${generateParams()}`;
          const delay = (Number(config.msnDelay) + (Math.random() * 10 - 5)).toFixed(1);
          
          addLog(`[MSN ${i+1}/${selectedLinks.length}] Reading News... (${delay}s)`);
          const win = window.open(finalUrl, '_blank');
          
          saveToCache('used_links', link); // Tandai sudah dipakai hari ini
          await new Promise(r => setTimeout(r, delay * 1000));
          win?.close();
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      addLog("✅ Semua tugas yang tersedia untuk hari ini telah selesai.");
    } catch (err) {
      addLog("❌ Terjadi kesalahan sistem: " + err.message);
    } finally {
      setIsRunning(false);
      await toggleWakeLock(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans text-slate-900 border-t-8 border-indigo-600">
      <div className="max-w-2xl mx-auto bg-white rounded-b-3xl shadow-2xl overflow-hidden">
        <div className="p-8 border-b bg-slate-50">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-indigo-700 uppercase">Daily Automator</h1>
              <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em]">Anti-Duplicate System</p>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black border-2 ${isWakeLocked ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
              {isWakeLocked ? 'WAKE LOCK ACTIVE' : 'WAKE LOCK OFF'}
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4 p-5 rounded-2xl bg-indigo-50/30 border border-indigo-100">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block">Bing Search</span>
              <input type="number" value={config.bingCount} onChange={e => setConfig({...config, bingCount: e.target.value})} className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-400 outline-none text-sm font-bold" placeholder="Jumlah" />
              <input type="number" value={config.bingDelay} onChange={e => setConfig({...config, bingDelay: e.target.value})} className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-400 outline-none text-sm font-bold" placeholder="Delay Detik" />
            </div>
            <div className="space-y-4 p-5 rounded-2xl bg-emerald-50/30 border border-emerald-100">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block">MSN News</span>
              <input type="number" value={config.msnCount} onChange={e => setConfig({...config, msnCount: e.target.value})} className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-emerald-400 outline-none text-sm font-bold" placeholder="Jumlah" />
              <input type="number" value={config.msnDelay} onChange={e => setConfig({...config, msnDelay: e.target.value})} className="w-full p-2.5 rounded-xl border focus:ring-2 focus:ring-emerald-400 outline-none text-sm font-bold" placeholder="Delay Detik" />
            </div>
          </div>

          <button onClick={startAutomation} disabled={isRunning} className={`w-full py-5 rounded-2xl font-black tracking-widest text-white shadow-xl transition-all active:scale-95 ${isRunning ? 'bg-slate-300 shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}>
            {isRunning ? 'EXECUTING TASKS...' : 'JALANKAN MISI HARIAN'}
          </button>

          <div className="mt-8">
            <div className="bg-slate-900 rounded-2xl p-6 h-72 overflow-y-auto font-mono text-[10px] text-indigo-300 shadow-inner border-t-4 border-slate-800">
              {logs.length === 0 && <div className="text-slate-700 italic text-center mt-24 uppercase">Sistem Siap Digunakan</div>}
              {logs.map((log, i) => <div key={i} className="mb-2 border-b border-slate-800/50 pb-1">{log}</div>)}
            </div>
          </div>
        </div>
      </div>
      <p className="text-center mt-8 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
        Optimized for Vercel & Microsoft Edge
      </p>
    </div>
  );
}
