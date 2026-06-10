'use client';
import { getInventory, keyToUrl, type InventoryItem } from '@/lib/api';
import { useEffect, useState } from 'react';

function getImageSrc(item: InventoryItem): string {
  const key = item.images?.[0]?.key;
  if (key) return keyToUrl(key);
  return 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=80';
}

const SHARE_URL = 'https://capsules.in/c/sirhaana-abc123';

function fmtPrice(price: number): string {
  return '₹' + price.toLocaleString('en-IN');
}

export default function CustomTab({ selected, onRemove, onGoAR, newItems = [] }: {
  selected: Set<string>;
  onRemove: (id: string) => void;
  onGoAR: () => void;
  newItems?: InventoryItem[];
}) {
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getInventory({ page: 1, perPage: 50 }).then(({ data }) => {
      setAllItems(data.filter(d => d.generationStatus === 'Image Generation Complete'));
    }).catch(() => setError(true));
  }, []);

  useEffect(() => {
    if (!newItems.length) return;
    setAllItems(prev => {
      const ids = new Set(prev.map(p => p.id));
      const fresh = newItems.filter(
        n => !ids.has(n.id) && n.generationStatus === 'Image Generation Complete'
      );
      return fresh.length ? [...fresh, ...prev] : prev;
    });
  }, [newItems]);

  function handleCopy() {
    navigator.clipboard.writeText(SHARE_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function handleWhatsApp() {
    window.open('https://wa.me/?text=' + encodeURIComponent(SHARE_URL), '_blank');
  }

  const items = allItems.flatMap(item =>
    (item.images?.length ? item.images : [null]).map((img, idx) => ({
      ...item,
      id: `${item.id}-${idx}`,
      images: img ? [img] : (item.images ?? []),
    }))
  ).filter(p => selected.has(p.id));

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 460px', gap:28, alignItems:'start' }}>
      <div>
        {/* Share box */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:18 }}>
          <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-5)', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:10 }}>▣ Share link</div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, padding:'11px 14px', borderRadius:8, background:'var(--bg)', border:'1px solid var(--border)', fontFamily:"'DM Mono', monospace", fontSize:11.5, color:'var(--text-3)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
              <span style={{ color:'var(--text-5)' }}>https://</span>
              <span style={{ color:'var(--cyan)' }}>capsules.in/c/sirhaana-abc123</span>
            </div>
            <button onClick={handleCopy} style={{ padding:'11px 14px', borderRadius:8, border:'1px solid var(--border-strong)', background: copied ? 'rgba(0,212,255,0.12)' : 'var(--card-2)', color: copied ? 'var(--cyan)' : 'var(--text-2)', fontFamily:"'DM Mono', monospace", fontSize:11, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, transition:'background 0.15s, color 0.15s' }}>
              {copied ? (
                <>✓ Copied</>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M11 5V3.5C11 2.95 10.55 2.5 10 2.5H3.5C2.95 2.5 2.5 2.95 2.5 3.5V10C2.5 10.55 2.95 11 3.5 11H5" stroke="currentColor" strokeWidth="1.4"/></svg>
                  Copy
                </>
              )}
            </button>
            <button onClick={handleWhatsApp} style={{ padding:'11px 14px', borderRadius:8, border:'none', background:'#128C7E', color:'#fff', fontFamily:"'DM Mono', monospace", fontSize:11, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
              WhatsApp
            </button>
          </div>
        </div>

        {/* Product list */}
        {error ? (
          <div style={{ textAlign:'center', padding:'60px 24px', background:'var(--surface)', border:'1px dashed rgba(255,95,86,0.3)', borderRadius:14, color:'#FF5F56', fontFamily:"'DM Mono', monospace", fontSize:12, letterSpacing:'0.3px' }}>
            Failed to load products — check your API connection.
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 24px', background:'var(--surface)', border:'1px dashed var(--border-strong)', borderRadius:14, color:'var(--text-5)', fontFamily:"'DM Mono', monospace", fontSize:12, letterSpacing:'0.3px' }}>
            <div style={{ fontSize:28, color:'var(--text-6)', marginBottom:10 }}>▢</div>
            Go to <span style={{ color:'var(--cyan)' }}>Brand Catalogue</span> and select products to build a custom catalogue.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {items.map(p => (
              <div key={p.id} style={{ display:'flex', gap:14, alignItems:'center', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
                <div style={{ width:60, height:60, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--card-2)' }}>
                  <img src={getImageSrc(p)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=80'; }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:14, fontWeight:500, color:'var(--text)', marginBottom:3 }}>{p.title}</div>
                  <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-5)', letterSpacing:'0.3px' }}>{p.category?.name || 'Uncategorised'}</div>
                </div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color:'var(--cyan)', letterSpacing:1 }}>{p.price ? fmtPrice(p.price) : '—'}</div>
                <button onClick={() => onRemove(p.id)} style={{ width:28, height:28, borderRadius:7, border:'none', background:'var(--card-2)', color:'var(--text-4)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }} title="Remove">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Phone preview */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border-strong)', borderRadius:20, overflow:'hidden', position:'sticky', top:96, boxShadow:'0 30px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ padding:'12px 16px', background:'var(--bg)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
          {[['var(--red)'],['var(--yellow)'],['var(--green)']].map(([c],i)=>(<div key={i} style={{ width:9, height:9, borderRadius:'50%', background:c }}/>))}
          <div style={{ flex:1, textAlign:'center', padding:'4px 12px', background:'var(--card)', borderRadius:5, fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-4)' }}>capsules.in/c/sirhaana</div>
        </div>
        <div style={{ padding:'24px 22px' }}>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, letterSpacing:4, color:'var(--text)', textAlign:'center', paddingBottom:14, marginBottom:16, borderBottom:'1px solid var(--border)' }}>SIRHAANA</div>
          <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.55, marginBottom:16, textAlign:'center' }}>
            Your curated collection · <span style={{ color:'var(--cyan)', fontFamily:"'DM Mono', monospace", fontSize:11 }}>{items.length} items selected</span>
          </div>
          {items.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px 8px', color:'var(--text-5)', fontFamily:"'DM Mono', monospace", fontSize:10.5, letterSpacing:'0.5px' }}>No products selected yet.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {items.slice(0,4).map(p => (
                <div key={p.id} style={{ borderRadius:10, background:'var(--card)', border:'1px solid var(--border)', overflow:'hidden' }}>
                  <img src={getImageSrc(p)} alt="" style={{ width:'100%', height:90, objectFit:'cover' }} onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=80'; }}/>
                  <div style={{ padding:'8px 10px 10px' }}>
                    <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:3, lineHeight:1.3 }}>{p.title}</div>
                    <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, color:'var(--cyan)', letterSpacing:'0.5px' }}>{p.price ? fmtPrice(p.price) : '—'}</div>
                  </div>
                </div>
              ))}
              {items.length > 4 && <div style={{ gridColumn:'1/-1', textAlign:'center', fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-5)', padding:'8px 0' }}>+{items.length-4} more curated</div>}
            </div>
          )}
          <button onClick={onGoAR} style={{ width:'100%', marginTop:18, padding:12, borderRadius:10, border:'none', background:'var(--accent)', color:'#fff', fontFamily:"'DM Sans', sans-serif", fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><path d="M2 17L12 22L22 17" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><path d="M2 12L12 17L22 12" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            View in AR
          </button>
        </div>
      </div>
    </div>
  );
}
