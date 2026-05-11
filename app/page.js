'use client';
import { useState, useRef, useEffect } from 'react';

export default function AutomatorPage() {
  // Config default: Bing (20 tugas, delay 30s) | MSN (10 tugas, delay 35s)
  const [config, setConfig] = useState({ msnCount: 10, msnDelay: 35, bingCount: 20, bingDelay: 30 });
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const wakeLockRef = useRef(null);

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p]);

  // --- ANTI-DUPLIKASI HARIAN ---
  const checkAndResetDailyCache = () => {
    const today = new Date().toDateString();
    const lastResetDate = localStorage.getItem('last_reset_date');
    if (lastResetDate !== today) {
      localStorage.removeItem('used_keywords');
      localStorage.removeItem('used_links');
      localStorage.setItem('last_reset_date', today);
      addLog("📅 Hari baru terdeteksi. Memori duplikasi direset!");
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

  // --- WAKE LOCK (Layar Tetap Nyala) ---
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

  // Generator Parameter MSN agar terlihat natural
  const generateMsnParams = () => {
    const ocids = ['binghp', 'bingsapp', 'mqs', 'winp2oct'];
    const cvid = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    return `ocid=${ocids[Math.floor(Math.random() * ocids.length)]}&cvid=${cvid}&ei=${Math.floor(Math.random() * 99)}`;
  };

  // --- FUNGSI UTAMA ---
  const startAutomation = async () => {
    if (isRunning) return;
    
    checkAndResetDailyCache();
    setIsRunning(true);
    await toggleWakeLock(true);
    addLog("🚀 Memulai Misi (Bing & MSN)...");

    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();

      const usedKeywords = getUsedData('used_keywords');
      const usedLinks = getUsedData('used_links');

      // Filter yang belum pernah diklik hari ini
      const selectedKeywords = data.allKeywords
        .filter(k => !usedKeywords.includes(k))
        .sort(() => 0.5 - Math.random())
        .slice(0, Number(config.bingCount));

      const selectedLinks = data.allLinks
        .filter(l => !usedLinks.includes(l))
        .sort(() => 0.5 - Math.random())
        .slice(0, Number(config.msnCount));

      if (selectedKeywords.length === 0 && selectedLinks.length === 0) {
        addLog("⚠️ Tidak ada tugas baru untuk hari ini.");
        setIsRunning(false);
        return;
      }

      // --- LOOP BING SEARCH (Optimasi Bing App) ---
      if (selectedKeywords.length > 0) {
        addLog(`🔍 Menjalankan ${selectedKeywords.length} Bing Search...`);
        for (let i = 0; i < selectedKeywords.length; i++) {
          const word = selectedKeywords[i];
          const actualDelay = (Number(config.bingDelay) + (Math.random() * 8)).toFixed(1);
          const cvid = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
          
          // Menggunakan PC=SANSAAND agar sinkron dengan Bing App Android
          const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(word)}&PC=SANSAAND&FORM=QSRE5&cvid=${cvid}`;
          
          addLog(`[Bing ${i+1}/${selectedKeywords.length}] ${word} (${actualDelay}s)`);
          const win = window.open(searchUrl, '_blank');
          saveToCache('used_keywords', word);

          await new Promise(r => setTimeout(r, actualDelay * 1000));
          if (win) win.close();
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      // --- LOOP MSN READ (News) ---
      if (selectedLinks.length > 0) {
        addLog(`📰 Menjalankan ${selectedLinks.length} MSN News...`);
        for (let i = 0; i < selectedLinks.length; i++) {
          const link = selectedLinks[i];
          const actualMsnDelay = (Number(config.msnDelay) + (Math.random() * 10 - 5)).toFixed(1);
          
          // Tambahkan parameter unik MSN
          const finalUrl = `${link}${link.includes('?') ? '&' : '?'}${generateMsnParams()}`;
          
          addLog(`[MSN ${i+1}/${selectedLinks.length}] Membaca Berita... (${actualMsnDelay}s)`);
          const win = window.open(finalUrl, '_blank');
          saveToCache('used_links', link);

          await new Promise(r => setTimeout(r, actualMsnDelay * 1000));
          if (win) win.close();
          await new Promise(r => setTimeout(r, 3500));
        }
      }

      addLog("✅ SEMUA MISI SELESAI UNTUK HARI INI!");
    } catch (err) {
      addLog("❌ Terjadi kesalahan: " + err.message);
    } finally {
      setIsRunning(false);
      await toggleWakeLock(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-800">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
          <h1 className="text-2xl font-black italic tracking-tighter">BING & MSN BOT</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
            {isWakeLocked ? '🟢 Screen Always On' : '⚪ Screen Auto-Off'}
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
              <span className="text-[10px] font-black text-blue-500 uppercase block mb-1">Bing Search</span>
              <input type="number" value={config.bingCount} onChange={e => setConfig({...config, bingCount: e.target.value})} className="w-full text-sm font-bold bg-transparent outline-none border-b border-blue-200 focus:border-blue-500" />
              <input type="number" value={config.bingDelay} onChange={e => setConfig({...config, bingDelay: e.target.value})} className="w-full text-[10px] mt-2 bg-transparent opacity-60 outline-none" placeholder="Delay (s)" title="Delay Search" />
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-[10px] font-black text-emerald-600 uppercase block mb-1">MSN News</span>
              <input type="number" value={config.msnCount} onChange={e => setConfig({...config, msnCount: e.target.value})} className="w-full text-sm font-bold bg-transparent outline-none border-b border-emerald-200 focus:border-emerald-500" />
              <input type="number" value={config.msnDelay} onChange={e => setConfig({...config, msnDelay: e.target.value})} className="w-full text-[10px] mt-2 bg-transparent opacity-60 outline-none" placeholder="Delay (s)" title="Delay News" />
            </div>
          </div>

          <button onClick={startAutomation} disabled={isRunning} className={`w-full py-5 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${isRunning ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {isRunning ? 'PROSES BERJALAN...' : 'GASKEUN SEKARANG'}
          </button>

          <div className="mt-6">
             <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">System Logs</span>
                <button onClick={() => {localStorage.clear(); window.location.reload();}} className="text-[9px] font-bold text-red-400 hover:text-red-600 uppercase">Clear Memory</button>
             </div>
             <div className="bg-slate-900 rounded-2xl p-4 h-64 overflow-y-auto font-mono text-[10px] text-blue-300 shadow-inner border border-slate-800">
                {logs.length === 0 && <div className="text-slate-700 italic text-center mt-20">Siap bertugas, Bos!</div>}
                {logs.map((log, i) => <div key={i} className="mb-1 border-b border-slate-800/50 pb-1">{log}</div>)}
             </div>
          </div>
        </div>
      </div>
      <p className="text-center mt-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest">Optimized for Bing App Mobile</p>
    </div>
  );
}
