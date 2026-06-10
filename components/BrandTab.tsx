'use client';
import { useState, useEffect } from 'react';
import { getInventory, keyToUrl, type InventoryItem } from '@/lib/api';

const FALLBACK = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=80';

function fmtPrice(price: number): string {
  return '₹' + price.toLocaleString('en-IN');
}

export default function BrandTab({
  selected,
  onToggle,
  newItems = [],
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  newItems?: InventoryItem[];
}) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  async function loadInventory() {
    setLoading(true);
    try {
      const res = await getInventory({ page: 1, perPage: 50 });
      const complete = res.data.filter(
        (d: InventoryItem) => d.generationStatus === 'Image Generation Complete'
      );
      setItems(complete);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    if (!newItems.length) return;
    setItems(prev => {
      const ids = new Set(prev.map(p => p.id));
      const fresh = newItems.filter(
        n => !ids.has(n.id) && n.generationStatus === 'Image Generation Complete'
      );
      return fresh.length ? [...fresh, ...prev] : prev;
    });
  }, [newItems]);

  const categories = ['all', ...Array.from(new Set(
    items.map(i => i.category?.name).filter((n): n is string => Boolean(n))
  ))];

  const visible = filter === 'all'
    ? items
    : items.filter(i => i.category?.name === filter);

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, flexDirection:'column', gap:16 }}>
        <div style={{ width:36, height:36, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        <div style={{ fontFamily:"'DM Mono', monospace", fontSize:12, color:'var(--text-4)' }}>Loading catalogue…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:360, gap:20, textAlign:'center', padding:'60px 24px' }}>
        <div style={{ width:64, height:64, borderRadius:16, background:'var(--accent-soft)', border:'1px solid var(--accent-glow)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M20 7H4C2.9 7 2 7.9 2 9V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V9C22 7.9 21.1 7 20 7Z" stroke="#3B82F6" strokeWidth="1.5"/><path d="M16 3H8L6 7H18L16 3Z" stroke="#3B82F6" strokeWidth="1.5" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:20, fontWeight:400, color:'var(--text)', marginBottom:8 }}>No products yet</div>
          <div style={{ fontSize:13, color:'var(--text-4)', lineHeight:1.6, maxWidth:360 }}>
            Run the AI pipeline on a product image and click <span style={{ color:'var(--cyan)', fontFamily:"'DM Mono', monospace", fontSize:12 }}>Add to Catalogue</span> to populate this view.
          </div>
        </div>
        <button onClick={loadInventory} style={{ padding:'9px 22px', borderRadius:100, border:'1px solid var(--border-strong)', background:'transparent', color:'var(--text-3)', fontFamily:"'DM Mono', monospace", fontSize:11, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
          ↻ Refresh
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filter + refresh row */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:28, flexWrap:'wrap' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            padding:'7px 16px', borderRadius:100, border:'1px solid',
            borderColor: filter===cat ? 'var(--accent)' : 'var(--border)',
            background: filter===cat ? 'var(--accent)' : 'rgba(255,255,255,0.02)',
            color: filter===cat ? '#fff' : 'var(--text-4)',
            fontFamily:"'DM Mono', monospace", fontSize:11, letterSpacing:'0.5px',
            cursor:'pointer', textTransform:'capitalize',
          }}>
            {cat === 'all' ? 'All · ' + items.length : cat}
          </button>
        ))}
        <button onClick={loadInventory} style={{ marginLeft:'auto', padding:'7px 14px', borderRadius:100, border:'1px solid var(--border)', background:'transparent', color:'var(--text-5)', fontFamily:"'DM Mono', monospace", fontSize:10, cursor:'pointer' }}>
          ↻ Refresh
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
        {visible.flatMap(item =>
          (item.images?.length ? item.images : [null]).map((img, imgIdx) => {
            const cardKey = `${item.id}-${imgIdx}`;
            const sel = selected.has(cardKey);
            const hov = hoveredCard === cardKey;
            const imgSrc = img?.key ? keyToUrl(img.key) : FALLBACK;
            const totalImgs = item.images?.length ?? 1;
            return (
            <div
              key={cardKey}
              onClick={() => onToggle(cardKey)}
              onMouseEnter={() => setHoveredCard(cardKey)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background:'var(--card)', border:'1px solid',
                borderColor: sel ? 'var(--accent)' : hov ? 'var(--border-strong)' : 'var(--border)',
                borderRadius:16, overflow:'hidden', cursor:'pointer', position:'relative',
                transition:'border-color 0.15s, box-shadow 0.15s',
                boxShadow: sel
                  ? '0 0 0 1px var(--accent), 0 16px 40px rgba(59,130,246,0.2)'
                  : hov ? '0 8px 32px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.18)',
              }}
            >
              {sel && (
                <div style={{ position:'absolute', top:10, right:10, width:26, height:26, borderRadius:'50%', background:'var(--accent)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, zIndex:2, boxShadow:'0 2px 8px rgba(59,130,246,0.5)' }}>✓</div>
              )}
              <div style={{ height:220, overflow:'hidden', background:'var(--card-2)', position:'relative' }}>
                <img
                  src={imgSrc}
                  alt={item.title}
                  loading="lazy"
                  style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.3s', transform: hov ? 'scale(1.03)' : 'scale(1)' }}
                  onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }}
                />
                <div style={{ position:'absolute', top:10, left:10, padding:'4px 9px', borderRadius:6, background:'var(--accent)', color:'#fff', fontFamily:"'DM Mono', monospace", fontSize:10, letterSpacing:'0.3px' }}>AI ✓</div>
                {totalImgs > 1 && (
                  <div style={{ position:'absolute', bottom:8, right:8, padding:'3px 8px', borderRadius:5, background:'rgba(9,9,11,0.72)', backdropFilter:'blur(4px)', fontFamily:"'DM Mono', monospace", fontSize:9, color:'rgba(255,255,255,0.85)', letterSpacing:'0.4px' }}>
                    {imgIdx + 1} / {totalImgs}
                  </div>
                )}
              </div>
              <div style={{ padding:'16px 18px 18px' }}>
                <div style={{ fontSize:15, fontWeight:500, color:'var(--text)', lineHeight:1.3, marginBottom:3 }}>{item.title}</div>
                <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-5)', marginBottom: item.description ? 10 : 14, letterSpacing:'0.2px' }}>
                  {item.category?.name || 'Uncategorised'} · {item.brand?.name || 'Sirhaana'}
                </div>
                {item.description && (
                  <div style={{
                    fontSize:12, color:'var(--text-4)', lineHeight:1.55, marginBottom:14,
                    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
                  }}>
                    {item.description}
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:12, borderTop:'1px solid var(--border)' }}>
                  <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color:'var(--cyan)', letterSpacing:'0.5px' }}>
                    {item.price ? fmtPrice(item.price) : 'Unpriced'}
                  </div>
                  <button onClick={e => { e.stopPropagation(); onToggle(cardKey); }} style={{
                    padding:'7px 16px', borderRadius:8, border:'1px solid',
                    borderColor: sel ? 'var(--accent)' : 'var(--border-strong)',
                    background: sel ? 'var(--accent)' : 'transparent',
                    color: sel ? '#fff' : 'var(--text-3)',
                    fontFamily:"'DM Mono', monospace", fontSize:10, cursor:'pointer', letterSpacing:'0.5px',
                    transition:'background 0.15s, color 0.15s, border-color 0.15s',
                  }}>{sel ? '✓ SELECTED' : 'SELECT'}</button>
                </div>
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
}