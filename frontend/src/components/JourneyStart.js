import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, Camera, Loader2, Check, ArrowRight } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const JOURNEY_GOALS = [
  'Clear Acne', 'Fade Dark Spots', 'Brighten & Glow', 'Reduce Fine Lines',
  'Even Skin Tone', 'Hydrate & Repair', 'Control Oil', 'Shrink Pores',
];
const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];
const AGE_BANDS = ['18–24', '25–34', '35–44', '45+'];

async function compressImage(file, { maxWidth = 720, quality = 0.72 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * ratio), h = Math.round(img.height * ratio);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * JourneyStart — self-contained "Routine Generator" that creates a 30-day AI
 * skin journey. Shared by the Routine page and the Progress Tracker page.
 */
export default function JourneyStart({ compact = false }) {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const [goals, setGoals] = useState([]);
  const [gender, setGender] = useState('female');
  const [age, setAge] = useState('25–34');
  const [starting, setStarting] = useState(false);
  const fileRef = useRef(null);

  const toggleGoal = (g) => setGoals((prev) => {
    if (prev.includes(g)) return prev.filter((x) => x !== g);
    if (prev.length >= 2) return [prev[1], g];
    return [...prev, g];
  });

  const pickPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { setPhoto(await compressImage(f)); } catch { alert('Could not read that image.'); }
  };

  const start = async () => {
    if (!photo) { alert('Please add your front selfie first.'); return; }
    if (goals.length === 0) { alert('Please pick at least one goal.'); return; }
    setStarting(true);
    try {
      const res = await axios.post(`${API}/api/journey/start`, { photo, goals, gender, age });
      if (res.data?.id) {
        try { localStorage.setItem('cg_journey_id', res.data.id); } catch {}
        navigate('/tracker');
      } else alert('Could not start your journey. Please try again.');
    } catch (e) {
      alert(e?.response?.data?.detail || 'Could not start your journey. Please try again.');
    } finally { setStarting(false); }
  };

  return (
    <div className="bg-white rounded-3xl ring-1 ring-stone-200 shadow-sm p-5 sm:p-6" data-testid="journey-start">
      <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 mb-3">
        <Sparkles size={13} /> <span className="text-[11px] font-black uppercase tracking-wide">AI Routine Generator</span>
      </div>
      <h2 className="font-heading text-2xl font-black text-stone-900">Start your 30-Day Journey</h2>
      <p className="text-stone-500 text-sm mt-1 mb-4">Add a selfie, pick your goals — AI builds a personalised plan and tracks you every day. First 30 days free.</p>

      {/* Photo */}
      <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={pickPhoto} className="hidden" />
      <button onClick={() => fileRef.current?.click()}
        className="w-full border-2 border-dashed border-stone-300 rounded-2xl p-4 flex flex-col items-center gap-1.5 text-stone-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors mb-4">
        {photo ? <img src={photo} alt="selfie" className="w-24 h-24 rounded-xl object-cover" /> : <><Camera size={26} /><span className="text-[12px] font-bold">Tap to add your front selfie</span></>}
      </button>

      {/* Goals */}
      <p className="text-[10px] font-black tracking-[0.25em] uppercase text-amber-600 mb-2">Your Goal <span className="text-stone-400 font-medium normal-case tracking-normal">(pick 1–2)</span></p>
      <div className="flex flex-wrap gap-2 mb-4">
        {JOURNEY_GOALS.map((g) => {
          const active = goals.includes(g);
          return (
            <button key={g} onClick={() => toggleGoal(g)}
              data-testid={`js-goal-${g.toLowerCase().replace(/\s+/g, '-')}`}
              className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-tight transition-all flex items-center gap-1.5 ${active ? 'bg-amber-400 text-amber-950 shadow' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
              {active && <Check size={11} />}{g}
            </button>
          );
        })}
      </div>

      {/* Gender */}
      <p className="text-[10px] font-black tracking-[0.25em] uppercase text-stone-400 mb-2">Gender</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {GENDERS.map((g) => (
          <button key={g.value} onClick={() => setGender(g.value)} data-testid={`js-gender-${g.value}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${gender === g.value ? 'bg-emerald-500 text-white shadow' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Age */}
      <p className="text-[10px] font-black tracking-[0.25em] uppercase text-stone-400 mb-2">Age</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {AGE_BANDS.map((a) => (
          <button key={a} onClick={() => setAge(a)} data-testid={`js-age-${a}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${age === a ? 'bg-cyan-500 text-white shadow' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            {a}
          </button>
        ))}
      </div>

      <button onClick={start} disabled={starting} data-testid="js-start-btn"
        className="w-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-amber-950 font-black py-4 rounded-2xl text-sm tracking-wide shadow-lg shadow-amber-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-70 flex items-center justify-center gap-2 ring-1 ring-amber-200/60">
        {starting ? <><Loader2 size={18} className="animate-spin" /> Starting your journey…</> : <><Sparkles size={18} /> Start Your 30-Day Journey <ArrowRight size={16} /></>}
      </button>
    </div>
  );
}
