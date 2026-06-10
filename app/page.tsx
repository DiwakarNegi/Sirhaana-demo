'use client';
import { useState } from 'react';
import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import PipelineTab from '@/components/PipelineTab';
import BrandTab from '@/components/BrandTab';
import CustomTab from '@/components/CustomTab';
import ARTab from '@/components/ARTab';
import type { InventoryItem } from '@/lib/api';
import type { Tab } from '@/lib/types';

export default function Home() {
  const [tab, setTab] = useState<Tab>('pipeline');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [catalogueItems, setCatalogueItems] = useState<InventoryItem[]>([]);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [navWarn, setNavWarn] = useState(false);

  const toggleProduct = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  function handleAddToCatalogue(item: InventoryItem) {
    setCatalogueItems(prev => {
      const exists = prev.find(p => p.id === item.id);
      if (exists) return prev;
      return [item, ...prev];
    });
    setTimeout(() => setTab('brand'), 600);
  }

  function handleTabChange(newTab: Tab) {
    if (pipelineRunning && newTab !== 'pipeline') {
      setNavWarn(true);
      setTimeout(() => setNavWarn(false), 3000);
    }
    setTab(newTab);
  }

  const sections: { id: Tab; num: string; title: string; desc: string; step: string }[] = [
    { id:'pipeline', num:'01', title:'AI Image Pipeline', desc:'Upload a raw product photo and watch Sirhaana extract, restage, and generate copy in real time.', step:'STEP 01 / 04' },
    { id:'brand',    num:'02', title:'Brand Catalogue',   desc:'Browse the AI-enriched product library. Select items to build a custom shareable catalogue.', step:'STEP 02 / 04' },
    { id:'custom',   num:'03', title:'Custom Catalogue',  desc:'Your curated selection — shareable via link or WhatsApp with a live phone preview.', step:'STEP 03 / 04' },
    { id:'ar',       num:'04', title:'AR Visualiser',     desc:'Place products into room scenes to show customers exactly how pieces look in a space.', step:'STEP 04 / 04' },
  ];

  const active = sections.find(s => s.id === tab)!;

  return (
    <>
      <Nav active={tab} onTab={handleTabChange} />
      {tab === 'pipeline' && <Hero onTab={handleTabChange} />}

      {/* Pipeline running banner */}
      {pipelineRunning && tab !== 'pipeline' && (
        <div style={{
          position:'fixed', top:60, left:0, right:0, zIndex:100,
          background:'var(--accent)', color:'#fff',
          padding:'10px 24px', display:'flex', alignItems:'center', gap:12,
          fontFamily:"'DM Mono', monospace", fontSize:12, letterSpacing:'0.5px',
        }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff', animation:'pulse 1s ease-in-out infinite' }}/>
          AI Pipeline running in background · {pipelineStatus}
          <button onClick={() => setTab('pipeline')} style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:100, border:'1px solid rgba(255,255,255,0.4)', background:'transparent', color:'#fff', fontFamily:"'DM Mono', monospace", fontSize:11, cursor:'pointer' }}>
            View →
          </button>
        </div>
      )}

      {/* Navigate-away warning toast */}
      {navWarn && (
        <div style={{
          position:'fixed', bottom:28, right:28, zIndex:200,
          background:'rgba(251,191,36,0.10)', border:'1px solid rgba(251,191,36,0.35)',
          color:'#FBBF24', borderRadius:10, padding:'12px 18px',
          fontFamily:"'DM Mono', monospace", fontSize:11.5, letterSpacing:'0.3px',
          boxShadow:'0 10px 30px rgba(0,0,0,0.4)',
        }}>
          ⚠ Pipeline continues running in the background
        </div>
      )}

      <div style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding: tab === 'pipeline' ? '0 32px 88px' : '40px 32px 88px', marginTop: pipelineRunning && tab !== 'pipeline' ? 36 : 0 }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28, paddingBottom:20, borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'var(--accent-soft)', border:'1px solid var(--accent-glow)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--accent)', flexShrink:0, marginTop:4 }}>
              {active.num}
            </div>
            <div>
              <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:30, fontWeight:400, lineHeight:1.1, color:'var(--text)', letterSpacing:'-0.5px' }}>{active.title}</div>
              <div style={{ fontSize:13, color:'var(--text-4)', marginTop:6, maxWidth:560, lineHeight:1.55 }}>{active.desc}</div>
            </div>
          </div>
          <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-5)', letterSpacing:2, textTransform:'uppercase' }}>
            {active.step}
          </div>
        </div>

        {/* Keep all tabs mounted but hide inactive ones */}
        <div style={{ display: tab === 'pipeline' ? 'block' : 'none' }}>
          <PipelineTab
            onAddToCatalogue={handleAddToCatalogue}
            onRunningChange={setPipelineRunning}
            onStatusChange={setPipelineStatus}
          />
        </div>
        <div style={{ display: tab === 'brand' ? 'block' : 'none' }}>
          <BrandTab selected={selected} onToggle={toggleProduct} newItems={catalogueItems} />
        </div>
        <div style={{ display: tab === 'custom' ? 'block' : 'none' }}>
          <CustomTab selected={selected} onRemove={toggleProduct} onGoAR={() => setTab('ar')} newItems={catalogueItems} />
        </div>
        <div style={{ display: tab === 'ar' ? 'block' : 'none' }}>
          <ARTab />
        </div>
      </div>

      {/* Floating selection bar */}
      {tab === 'brand' && selected.size > 0 && (
        <div style={{
          position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)',
          background:'var(--surface)', border:'1px solid var(--border-strong)',
          borderRadius:14, padding:'12px 12px 12px 20px',
          display:'flex', alignItems:'center', gap:16,
          boxShadow:'0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.15)',
          backdropFilter:'blur(12px)', zIndex:50, minWidth:420,
        }}>
          <div style={{ fontFamily:"'DM Mono', monospace", fontSize:12, color:'var(--text-3)', flex:1 }}>
            <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, color:'var(--cyan)', letterSpacing:1, marginRight:6 }}>{selected.size}</span>
            {selected.size === 1 ? 'product selected' : 'products selected'}
          </div>
          <button onClick={() => setSelected(new Set())} style={{ padding:'10px 16px', borderRadius:9, border:'1px solid var(--border-strong)', background:'transparent', color:'var(--text-3)', fontFamily:"'DM Sans', sans-serif", fontSize:12, cursor:'pointer' }}>Clear</button>
          <button onClick={() => setTab('custom')} style={{ padding:'10px 20px', borderRadius:9, border:'none', background:'var(--cyan)', color:'var(--bg)', fontFamily:"'DM Sans', sans-serif", fontSize:13, fontWeight:500, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
            Build Catalogue →
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}
