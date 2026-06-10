'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { getInventory, keyToUrl } from '@/lib/api';
import { PRODUCTS, AR_ROOMS } from '@/lib/data';

type Placed = {
  id: string;
  src: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  rotation: number;
};
type DisplayProduct = { id: string; name: string; variant: string; price: string; ai: string };

const STATIC_PRODUCTS: DisplayProduct[] = PRODUCTS.map(p => ({
  id: String(p.id),
  name: p.name,
  variant: p.variant,
  price: p.price,
  ai: p.ai,
}));

export default function ARTab() {
  const [room, setRoom] = useState(AR_ROOMS[0]);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [products, setProducts] = useState<DisplayProduct[]>(STATIC_PRODUCTS);
  const [activeProduct, setActiveProduct] = useState<DisplayProduct>(STATIC_PRODUCTS[0]);
  const [defaults, setDefaults] = useState({ scale: 100, opacity: 100, rotation: 0 });
  const [toast, setToast] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    getInventory({ page: 1, perPage: 20 }).then(({ data }) => {
      const ready = data.filter(d => d.generationStatus === 'Image Generation Complete');
      if (!ready.length) return;
      const mapped = ready.map<DisplayProduct>(item => ({
        id: item.id,
        name: item.title,
        variant: item.category?.name ?? '',
        price: item.price ? '₹' + item.price : '',
        ai: item.images?.[0]?.key ? keyToUrl(item.images[0].key) : STATIC_PRODUCTS[0].ai,
      }));
      setProducts(mapped);
      setActiveProduct(mapped[0]);
    }).catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const selected = placed.find(p => p.id === selectedId) ?? null;

  const updateSelected = (patch: Partial<Placed>) => {
    if (!selectedId) return;
    setPlaced(prev => prev.map(p => p.id === selectedId ? { ...p, ...patch } : p));
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (draggingRef.current) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newItem: Placed = {
      id: Date.now().toString(),
      src: activeProduct.ai,
      x, y,
      scale: defaults.scale,
      opacity: defaults.opacity,
      rotation: defaults.rotation,
    };
    setPlaced(prev => [...prev, newItem]);
    setSelectedId(newItem.id);
  }, [activeProduct, defaults]);

  const handleItemMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const item = placed.find(p => p.id === id);
    if (!item || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    draggingRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y,
    };
    // Bring to front
    setPlaced(prev => [...prev.filter(p => p.id !== id), item]);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const drag = draggingRef.current;
    if (!drag || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - drag.startX) / rect.width) * 100;
    const dy = ((e.clientY - drag.startY) / rect.height) * 100;
    setPlaced(prev => prev.map(p =>
      p.id === drag.id ? { ...p, x: drag.origX + dx, y: drag.origY + dy } : p
    ));
  }, []);

  const handleMouseUp = () => { draggingRef.current = null; };

  const deleteSelected = () => {
    if (!selectedId) return;
    setPlaced(prev => prev.filter(p => p.id !== selectedId));
    setSelectedId(null);
  };

  const undoLast = () => {
    setPlaced(prev => {
      if (!prev.length) return prev;
      const next = prev.slice(0, -1);
      setSelectedId(next.length ? next[next.length - 1].id : null);
      return next;
    });
  };

  const controlValue = (key: keyof typeof defaults) =>
    selected ? (selected[key] as number) : defaults[key];

  const handleControl = (key: 'scale' | 'opacity' | 'rotation', val: number) => {
    if (selected) updateSelected({ [key]: val });
    else setDefaults(d => ({ ...d, [key]: val }));
  };

  const CONTROLS = [
    { key: 'scale' as const,    label: 'Size',     min: 20,   max: 220, unit: '%' },
    { key: 'opacity' as const,  label: 'Opacity',  min: 10,   max: 100, unit: '%' },
    { key: 'rotation' as const, label: 'Rotation', min: -180, max: 180, unit: '°' },
  ];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24, alignItems:'start' }}>

      {/* Canvas */}
      <div>
        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            borderRadius:16, overflow:'hidden',
            border:'1px solid var(--border-strong)',
            position:'relative', background:'var(--card-2)',
            aspectRatio:'4/3', cursor:'crosshair', userSelect:'none',
          }}
        >
          <img src={room} alt="Room" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>

          {/* Status badge */}
          <div style={{
            position:'absolute', top:14, left:14,
            display:'inline-flex', alignItems:'center', gap:8, padding:'7px 12px',
            borderRadius:8, border:'1px solid var(--border-strong)',
            background:'rgba(9,9,11,0.82)', backdropFilter:'blur(8px)', zIndex:10,
            pointerEvents:'none',
          }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)' }}/>
            <span style={{ fontFamily:"'DM Mono', monospace", fontSize:10.5, color:'var(--text-2)', letterSpacing:'0.3px' }}>
              {selectedId ? `Selected · drag to move` : `Click to place ${activeProduct.name}`}
            </span>
          </div>

          {/* Placed items */}
          {placed.map(p => {
            const size = 140 * p.scale / 100;
            const isSelected = p.id === selectedId;
            return (
              <div
                key={p.id}
                onMouseDown={e => handleItemMouseDown(e, p.id)}
                style={{
                  position:'absolute',
                  left:`${p.x}%`, top:`${p.y}%`,
                  transform:`translate(-50%,-50%) rotate(${p.rotation}deg)`,
                  cursor:'move',
                  opacity: p.opacity / 100,
                  zIndex: isSelected ? 20 : 5,
                  transition: draggingRef.current?.id === p.id ? 'none' : 'box-shadow 0.15s',
                }}
              >
                <img
                  src={p.src}
                  alt=""
                  draggable={false}
                  style={{
                    width:size, height:size,
                    borderRadius:10, display:'block',
                    boxShadow: isSelected
                      ? '0 0 0 2px var(--cyan), 0 16px 48px rgba(0,0,0,0.7)'
                      : '0 12px 40px rgba(0,0,0,0.55)',
                    border: isSelected ? '2px solid var(--cyan)' : '2px solid transparent',
                  }}
                />
                {/* Ground shadow */}
                <div style={{
                  position:'absolute', bottom:-10, left:'50%', transform:'translateX(-50%)',
                  width:'75%', height:12,
                  background:'radial-gradient(ellipse, rgba(0,0,0,0.5), transparent 70%)',
                  filter:'blur(5px)',
                  pointerEvents:'none',
                }}/>
                {/* Delete handle on selected */}
                {isSelected && (
                  <div
                    onMouseDown={e => { e.stopPropagation(); deleteSelected(); }}
                    style={{
                      position:'absolute', top:-10, right:-10,
                      width:22, height:22, borderRadius:'50%',
                      background:'#FF5F56', border:'2px solid var(--bg)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', zIndex:30, fontSize:13, color:'#fff', fontWeight:700,
                      lineHeight:1,
                    }}
                  >×</div>
                )}
              </div>
            );
          })}

          {/* Bottom toolbar */}
          <div style={{ position:'absolute', bottom:14, left:14, right:14, display:'flex', gap:6, zIndex:10 }}>
            <button
              onClick={e => { e.stopPropagation(); undoLast(); }}
              style={{
                padding:'9px 16px', borderRadius:8,
                background:'rgba(9,9,11,0.85)', backdropFilter:'blur(8px)',
                border:'1px solid var(--border-strong)', color:'var(--text-2)',
                fontFamily:"'DM Mono', monospace", fontSize:10.5, letterSpacing:'0.6px',
                textTransform:'uppercase', cursor:'pointer',
              }}
            >Undo</button>
            {selectedId && (
              <button
                onClick={e => { e.stopPropagation(); deleteSelected(); }}
                style={{
                  padding:'9px 16px', borderRadius:8,
                  background:'rgba(255,95,86,0.15)', backdropFilter:'blur(8px)',
                  border:'1px solid rgba(255,95,86,0.4)', color:'#FF5F56',
                  fontFamily:"'DM Mono', monospace", fontSize:10.5, letterSpacing:'0.6px',
                  textTransform:'uppercase', cursor:'pointer',
                }}
              >Delete</button>
            )}
            <button
              onClick={e => { e.stopPropagation(); setPlaced([]); setSelectedId(null); showToast('Canvas cleared'); }}
              style={{
                marginLeft:'auto', padding:'9px 16px', borderRadius:8,
                background:'rgba(9,9,11,0.85)', backdropFilter:'blur(8px)',
                border:'1px solid var(--border-strong)', color:'var(--text-3)',
                fontFamily:"'DM Mono', monospace", fontSize:10.5, letterSpacing:'0.6px',
                textTransform:'uppercase', cursor:'pointer',
              }}
            >Clear all</button>
          </div>
        </div>

        <div style={{ marginTop:10, padding:'10px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, fontFamily:"'DM Mono', monospace", fontSize:10.5, color:'var(--text-5)', lineHeight:1.6 }}>
          Click canvas to place · Click a placed item to select it · Drag to reposition · Controls adjust selected item
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Room picker */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px' }}>
          <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-5)', letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:12 }}>▣ Room scene</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {AR_ROOMS.map((r,i) => (
              <div key={i} onClick={() => setRoom(r)} style={{
                borderRadius:8, overflow:'hidden', cursor:'pointer', height:64,
                border:`1.5px solid ${room===r ? 'var(--cyan)' : 'var(--border)'}`,
                boxShadow: room===r ? '0 0 0 1px var(--cyan)' : 'none',
                transition:'border-color 0.15s',
              }}>
                <img src={r.replace('1200','200')} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              </div>
            ))}
          </div>
        </div>

        {/* Product picker */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px' }}>
          <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-5)', letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:12 }}>◈ Product to place</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:240, overflowY:'auto' }}>
            {products.slice(0,8).map(p => (
              <div key={p.id} onClick={() => setActiveProduct(p)} style={{
                display:'flex', gap:10, alignItems:'center', padding:8, borderRadius:8,
                cursor:'pointer', border:'1px solid',
                borderColor: activeProduct.id===p.id ? 'var(--accent)' : 'transparent',
                background: activeProduct.id===p.id ? 'var(--accent-soft)' : 'transparent',
                transition:'background 0.15s, border-color 0.15s',
              }}>
                <img src={p.ai} alt="" loading="lazy" style={{ width:40, height:40, borderRadius:6, objectFit:'cover', flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11.5, color:'var(--text-2)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
                  <div style={{ fontFamily:"'DM Mono', monospace", fontSize:9.5, color:'var(--text-5)', marginTop:2 }}>{p.variant}</div>
                </div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:15, color:'var(--cyan)', letterSpacing:'0.5px', flexShrink:0 }}>{p.price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-5)', letterSpacing:'1.2px', textTransform:'uppercase' }}>⊹ Controls</div>
            {selected
              ? <span style={{ fontFamily:"'DM Mono', monospace", fontSize:9.5, color:'var(--cyan)' }}>editing selected</span>
              : <span style={{ fontFamily:"'DM Mono', monospace", fontSize:9.5, color:'var(--text-5)' }}>sets defaults</span>
            }
          </div>
          {CONTROLS.map(ctrl => (
            <div key={ctrl.key} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6 }}>
                <span>{ctrl.label}</span>
                <span style={{ color:'var(--cyan)', fontFamily:"'Bebas Neue', sans-serif", fontSize:14, letterSpacing:'0.5px' }}>
                  {controlValue(ctrl.key)}{ctrl.unit}
                </span>
              </div>
              <input
                type="range"
                min={ctrl.min} max={ctrl.max}
                value={controlValue(ctrl.key)}
                onChange={e => handleControl(ctrl.key, +e.target.value)}
                style={{ width:'100%', appearance:'none', height:3, background:'var(--card-2)', borderRadius:2, outline:'none', cursor:'pointer' }}
              />
            </div>
          ))}
        </div>

        {/* Product info + CTA */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px 18px' }}>
          <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:17, color:'var(--text)', marginBottom:3 }}>{activeProduct.name}</div>
          <div style={{ fontFamily:"'DM Mono', monospace", fontSize:10.5, color:'var(--text-5)', letterSpacing:'0.3px' }}>{activeProduct.variant}</div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, color:'var(--cyan)', letterSpacing:'1.5px', marginTop:10, marginBottom:14 }}>{activeProduct.price}</div>
          <button
            onClick={() => showToast('Added to enquiry basket')}
            style={{
              width:'100%', padding:13, borderRadius:10, border:'none',
              background:'var(--accent)', color:'#fff',
              fontFamily:"'DM Sans', sans-serif", fontSize:14, fontWeight:500, cursor:'pointer',
            }}
          >Add to Enquiry →</button>
        </div>
      </div>

      {toast && (
        <div style={{
          position:'fixed', bottom:100, left:'50%', transform:'translateX(-50%)',
          background:'var(--surface)', border:'1px solid var(--border-strong)',
          borderRadius:10, padding:'12px 20px',
          fontFamily:"'DM Mono', monospace", fontSize:12, color:'var(--text-2)',
          zIndex:200, boxShadow:'0 10px 30px rgba(0,0,0,0.5)',
        }}>{toast}</div>
      )}
    </div>
  );
}
