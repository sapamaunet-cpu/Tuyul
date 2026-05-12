'use client';
import { useState, useRef, useEffect } from 'react';

export default function AutomatorPage() {
  const [config, setConfig] = useState({ msnCount: 10, msnDelay: 21, bingCount: 20, bingDelay: 13 });
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const [captcha, setCaptcha] = useState({ a: 0, b: 0, result: '' });
  const [showCaptcha, setShowCaptcha] = useState(false);
  const wakeLockRef = useRef(null);

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p]);

  // --- LOGIKA CACHE & RESET ---
  const checkAndResetDailyCache = () => {
    const today = new Date().toDateString();
    const lastResetDate = localStorage.getItem('last_reset_date');
    if (lastResetDate !== today) {
      localStorage.removeItem('used_keywords');
      localStorage.removeItem('used_links');
      localStorage.setItem('last_reset_date', today);
      addLog("📅 Hari baru terdeteksi. Memory direset!");
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

  // --- WAKE LOCK (Layar On) ---
  const toggleWakeLock = async (on) => {
    if (on && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsWakeLocked(true);
      } catch (err) { console.log("WakeLock Error:", err); }
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsWakeLocked(false);
    }
  };

  // --- CAPTCHA LOGIC ---
  const prepareMisi = () => {
    if (isRunning) return;
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ a: n1, b: n2, result: '' });
    setShowCaptcha(true);
  };

  const handleVerifyAndRun = () => {
    if (parseInt(captcha.result) === (captcha.a + captcha.b)) {
      setShowCaptcha(false);
      startAutomation();
    } else {
      alert("Jawaban salah! Coba lagi.");
      prepareMisi();
    }
  };

  // --- FUNGSI UTAMA ---
  const startAutomation = async () => {
    checkAndResetDailyCache();
    setIsRunning(true);
    await toggleWakeLock(true);
    addLog("🚀 Captcha Berhasil. Memulai misi...");

    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();

      const usedKeywords = getUsedData('used_keywords');
      const usedLinks = getUsedData('used_links');

      const selectedKeywords = data.allKeywords
        .filter(k => !usedKeywords.includes(k))
        .sort(() => 0.5 - Math.random())
        .slice(0, Number(config.bingCount));

      const selectedLinks = data.allLinks
        .filter(l => !usedLinks.includes(l))
        .sort(() => 0.5 - Math.random())
        .slice(0, Number(config.msnCount));

      // --- LOOP BING SEARCH ---
      if (selectedKeywords.length > 0) {
        addLog(`🔍 Mencari ${selectedKeywords.length} kata kunci...`);
        for (let i = 0; i < selectedKeywords.length; i++) {
          const word = selectedKeywords[i];
          const actualDelay = (Number(config.bingDelay) + (Math.random() * 8)).toFixed(1);
          const cvid = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
          
          // Gunakan PC=SANSAAND agar poin masuk di Bing App
          const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(word)}&PC=SANSAAND&FORM=QSRE5&cvid=${cvid}`;
          
          addLog(`[Bing ${i+1}/${selectedKeywords.length}] ${word} (${actualDelay}s)`);
          const win = window.open(searchUrl, '_blank');
          saveToCache('used_keywords', word);

          await new Promise(r => setTimeout(r, actualDelay * 1000));
          if (win) win.close();
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      // --- LOOP MSN READ ---
      if (selectedLinks.length > 0) {
        addLog(`📰 Membaca ${selectedLinks.length} berita MSN...`);
        for (let i = 0; i < selectedLinks.length; i++) {
          const link = selectedLinks[i];
          const actualMsnDelay = (Number(config.msnDelay) + (Math.random() * 10 - 5)).toFixed(1);
          const cvid = [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
          const finalUrl = `${link}${link.includes('?') ? '&' : '?'}&cvid=${cvid}&ocid=binghp`;

          addLog(`[MSN ${i+1}/${selectedLinks.length}] Reading... (${actualMsnDelay}s)`);
          const win = window.open(finalUrl, '_blank');
          saveToCache('used_links', link);

          await new Promise(r => setTimeout(r, actualMsnDelay * 1000));
          if (win) win.close();
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      addLog("✅ SEMUA MISI SELESAI!");
    } catch (err) {
      addLog("❌ Error: " + err.message);
    } finally {
      setIsRunning(false);
      await toggleWakeLock(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
      {/* Modal Captcha */}
      {showCaptcha && (
        <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-8 w-full max-w-xs text-center shadow-2xl">
            <h2 className="text-sm font-black text-slate-400 uppercase mb-2">Verifikasi</h2>
            <div className="text-4xl font-black text-indigo-600 mb-6 bg-slate-100 py-6 rounded-2xl">
              {captcha.a} + {captcha.b}
            </div>
            <input 
              type="number" 
              value={captcha.result} 
              onChange={(e) => setCaptcha({...captcha, result: e.target.value})}
              className="w-full text-center text-2xl font-bold border-2 border-slate-200 rounded-xl p-3 mb-6 outline-none focus:border-indigo-500"
              placeholder="?"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowCaptcha(false)} className="flex-1 py-3 text-slate-400 font-bold uppercase text-[10px]">Batal</button>
              <button onClick={handleVerifyAndRun} className="flex-1 bg-indigo-600 py-3 rounded-xl text-white font-bold uppercase text-[10px]">Mulai</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border">
        <div className="bg-indigo-600 p-8 text-white">
          <h1 className="text-2xl font-black italic tracking-tighter">BING BOT PRO</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mt-1">
            {isWakeLocked ? '🟢 Screen Always On' : '⚪ Screen Standby'}
          </p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-2xl border">
              <span className="text-[10px] font-black text-indigo-500 uppercase block mb-2">Bing Search</span>
              <input type="number" value={config.bingCount} onChange={e => setConfig({...config, bingCount: e.target.value})} className="w-full bg-transparent font-bold border-b outline-none" />
              <input type="number" value={config.bingDelay} onChange={e => setConfig({...config, bingDelay: e.target.value})} className="w-full bg-transparent text-[10px] mt-2 opacity-50 outline-none" />
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border">
              <span className="text-[10px] font-black text-emerald-500 uppercase block mb-2">MSN News</span>
              <input type="number" value={config.msnCount} onChange={e => setConfig({...config, msnCount: e.target.value})} className="w-full bg-transparent font-bold border-b outline-none" />
              <input type="number" value={config.msnDelay} onChange={e => setConfig({...config, msnDelay: e.target.value})} className="w-full bg-transparent text-[10px] mt-2 opacity-50 outline-none" />
            </div>
          </div>

          <button 
            onClick={prepareMisi} 
            disabled={isRunning} 
            className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all active:scale-95 ${isRunning ? 'bg-slate-300' : 'bg-indigo-600'}`}
          >
            {isRunning ? 'SEDANG JALAN...' : 'GASKEUN SEKARANG'}
          </button>

          <div className="mt-8 bg-slate-900 rounded-2xl p-4 h-64 overflow-y-auto font-mono text-[10px] text-indigo-300 border shadow-inner">
            {logs.length === 0 && <div className="text-slate-600 italic">Siap menjalankan misi harian...</div>}
            {logs.map((log, i) => <div key={i} className="mb-1 border-b border-slate-800 pb-1">{log}</div>)}
          </div>
          
          <button onClick={() => {localStorage.clear(); window.location.reload();}} className="w-full mt-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Clear All Data</button>
        </div>
      </div>
    </div>
  );
}
