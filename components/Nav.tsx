'use client';
import type { Tab } from '@/lib/types';

export default function Nav({ active, onTab }: { active: Tab; onTab: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'pipeline', label: 'AI Pipeline' },
    { id: 'brand',    label: 'Brand Catalogue' },
    { id: 'custom',   label: 'Custom Catalogue' },
    { id: 'ar',       label: 'AR Visualiser' },
  ];
  return (
    <nav style={{
      position:'sticky', top:0, zIndex:100,
      display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center',
      padding:'14px 32px',
      background:'rgba(9,9,11,0.85)', backdropFilter:'blur(12px)',
      borderBottom:'0.8px solid var(--border-nav)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{
          width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
          border:'1px solid rgba(0,212,255,0.3)', background:'var(--cyan-soft)', borderRadius:6,
        }}>
          <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
            <rect x="3" y="3" width="9" height="9" rx="2" fill="#00D4FF" fillOpacity=".7"/>
            <rect x="16" y="3" width="9" height="9" rx="2" fill="#3B82F6" fillOpacity=".5"/>
            <rect x="3" y="16" width="9" height="9" rx="2" fill="#3B82F6" fillOpacity=".5"/>
            <rect x="16" y="16" width="9" height="9" rx="2" fill="#00D4FF" fillOpacity=".3"/>
          </svg>
        </div>
        <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, letterSpacing:2, color:'#fff' }}>SIRHAANA</span>
        <span style={{
          fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-5)', letterSpacing:'1.4px',
          textTransform:'uppercase', paddingLeft:12, marginLeft:4,
          borderLeft:'1px solid var(--border-strong)',
        }}>Capsules AI</span>
      </div>

      <div style={{
        display:'inline-flex', alignItems:'center', gap:4, padding:5,
        borderRadius:100, border:'1px solid var(--border)', background:'rgba(255,255,255,0.03)',
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => onTab(t.id)} style={{
            padding:'8px 18px', borderRadius:100, border:'none',
            fontFamily:"'DM Sans', sans-serif", fontSize:12, fontWeight:500,
            color: active === t.id ? '#fff' : 'var(--text-4)',
            background: active === t.id ? 'var(--accent)' : 'transparent',
            boxShadow: active === t.id ? '0 4px 16px rgba(59,130,246,0.35)' : 'none',
            cursor:'pointer', transition:'color 0.15s, background 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px',
          borderRadius:100, border:'1px solid rgba(59,130,246,0.20)', background:'var(--accent-soft)',
        }}>
          <div className="animate-pulse-dot" style={{
            width:5, height:5, borderRadius:'50%', background:'var(--accent)',
            boxShadow:'0 0 8px rgba(59,130,246,0.7)',
          }}/>
          <span style={{ fontFamily:"'DM Mono', monospace", fontSize:10, letterSpacing:'1.2px', textTransform:'uppercase', color:'var(--accent)' }}>
            Gemini Active
          </span>
        </div>
      </div>
    </nav>
  );
}
