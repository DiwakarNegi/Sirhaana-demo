'use client';
import type { Tab } from '@/lib/types';

export default function Hero({ onTab }: { onTab: (t: Tab) => void }) {
  return (
    <div style={{
      position:'relative', zIndex:1,
      maxWidth:1280, margin:'0 auto',
      padding:'64px 32px 48px',
      display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:48, alignItems:'center',
    }}>
      <div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:22 }}>
          <div style={{ width:32, height:1, background:'var(--accent)' }}/>
          <span style={{ fontFamily:"'DM Mono', monospace", fontSize:11, letterSpacing:'1.4px', textTransform:'uppercase', color:'var(--accent)' }}>
            AI-Powered Commerce
          </span>
        </div>
        <h1 style={{
          fontFamily:"'Space Grotesk', sans-serif", fontSize:64, fontWeight:300,
          lineHeight:1.02, letterSpacing:'-1.5px', color:'var(--text)',
        }}>
          Turn raw photos<br/>into <span style={{ color:'var(--cyan)' }}>shoppable</span><br/>
          <em style={{ fontStyle:'italic', fontWeight:400 }}>capsules</em>
        </h1>
        <p style={{ marginTop:22, fontSize:15, fontWeight:300, lineHeight:1.65, color:'var(--text-3)', maxWidth:460 }}>
          Upload any product image. Sirhaana's AI pipeline extracts, restages, writes copy, and builds a shareable catalogue — in seconds.
        </p>
        <div style={{ display:'flex', gap:12, marginTop:28 }}>
          <button onClick={() => onTab('pipeline')} style={{
            display:'inline-flex', alignItems:'center', gap:10,
            padding:'12px 22px', borderRadius:10, border:'none',
            background:'var(--cyan)', color:'var(--bg)',
            fontFamily:"'DM Sans', sans-serif", fontSize:14, fontWeight:500,
            cursor:'pointer',
          }}>
            Try the pipeline
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#09090B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button onClick={() => onTab('brand')} style={{
            display:'inline-flex', alignItems:'center',
            padding:'12px 22px', borderRadius:10,
            background:'transparent', color:'var(--text-2)',
            border:'1px solid var(--border-strong)',
            fontFamily:"'DM Sans', sans-serif", fontSize:14, fontWeight:400,
            cursor:'pointer',
          }}>Browse catalogue</button>
        </div>
      </div>

      <div style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:16, overflow:'hidden', boxShadow:'0 30px 80px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          padding:'18px 20px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, letterSpacing:3, color:'var(--text)' }}>SIRHAANA</span>
          <span style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-5)', letterSpacing:'0.5px' }}>8 products · AI processed</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', borderBottom:'1px solid var(--border)' }}>
          {[['2.4s','Avg. process time'],['8','Products ready'],['100%','AI enriched']].map(([v,l])=>(
            <div key={l} style={{ textAlign:'center', padding:'18px 12px', borderRight:'1px solid var(--border)' }}>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:32, color:'var(--cyan)', lineHeight:1, letterSpacing:1 }}>{v}</div>
              <div style={{ fontFamily:"'DM Mono', monospace", fontSize:9.5, color:'var(--text-5)', marginTop:6, letterSpacing:1, textTransform:'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:'var(--border)' }}>
          {[
            'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&q=80',
            'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&q=80',
            'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=300&q=80',
          ].map((src,i)=>(
            <div key={i} style={{ height:110, overflow:'hidden', background:'var(--card)' }}>
              <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
