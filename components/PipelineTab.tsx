'use client';
import { useState, useRef } from 'react';
import { SAMPLES } from '@/lib/data';
import {
  getUploadUrls,
  uploadFileToS3,
  processInventory,
  pollInventoryResult,
  getInventory,
  keyToUrl,
  type InventoryItem,
} from '@/lib/api';

const LOG_STEPS = [
  'Object boundary detection · YOLOv8',
  'Background removal · extracting product mask',
  'Category classifier → cushion / textile',
  'Fetching scene-generation prompt template',
  'Generating ambient lifestyle scene context',
  'Compositing product into scene · 2400px',
  'Lighting & shadow correction',
  'Copy generator · SEO title + description',
  'Tagging attributes · material, motif, region',
  'Packaging output bundle ✓',
];

type LogEntry = { text: string; state: 'active' | 'done' };
type Status = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

type Result = {
  inventoryId: string;
  beforeSrc: string;
  afterSrcs: string[];
  title: string;
  desc: string;
  tags: string[];
  addedToCatalogue: boolean;
};

export default function PipelineTab({ onAddToCatalogue, onRunningChange, onStatusChange }: { onAddToCatalogue?: (item: InventoryItem) => void; onRunningChange?: (running: boolean) => void; onStatusChange?: (status: string) => void }) {
  const [selectedSample, setSelectedSample] = useState(-1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [commerceCategory, setCommerceCategory] = useState<'lifestyle' | 'marketplace'>('lifestyle');
  const [productWidth, setProductWidth] = useState('');
  const [productLength, setProductLength] = useState('');
  const [dimensionUnit, setDimensionUnit] = useState<'cm' | 'inch'>('cm');
  const [log, setLog] = useState<LogEntry[]>([{ text: 'Select a sample or drop an image to begin.', state: 'done' }]);
  const [status, setStatus] = useState<Status>('idle');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [selectedImageIdxs, setSelectedImageIdxs] = useState<Set<number>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');
  const [lastItem, setLastItem] = useState<InventoryItem | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const appendLog = (text: string, state: 'active' | 'done' = 'active') => {
    setLog(prev => {
      const updated = prev.map(e => ({ ...e, state: 'done' as const }));
      return [...updated, { text, state }];
    });
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, 50);
  };

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadedPreview(URL.createObjectURL(file));
    setSelectedSample(-1);
    setResult(null);
    setStatus('idle');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploadedFile(file);
    setUploadedPreview(URL.createObjectURL(file));
    setSelectedSample(-1);
    setResult(null);
    setStatus('idle');
  }

  const canRun = !running && (selectedSample >= 0 || uploadedFile !== null);

  async function runPipeline() {
    if (!canRun) return;
    setRunning(true); if (onRunningChange) onRunningChange(true);
    setResult(null);
    setErrorMsg('');
    setLog([]);

    const sample = selectedSample >= 0 ? SAMPLES[selectedSample] : null;
    const beforeSrc = uploadedPreview || sample?.beforeSrc || '';

    try {
      setStatus('uploading');
      appendLog('Uploading image to S3…', 'active'); if (onStatusChange) onStatusChange('Uploading…');

      let imageKey: string;

      if (uploadedFile) {
        const [presigned] = await getUploadUrls(1);
        imageKey = await uploadFileToS3(uploadedFile, presigned);
      } else if (sample) {
        const blob = await fetch(sample.beforeSrc).then(r => r.blob());
        const file = new File([blob], 'sample.jpg', { type: 'image/jpeg' });
        const [presigned] = await getUploadUrls(1);
        imageKey = await uploadFileToS3(file, presigned);
      } else {
        throw new Error('No image source available');
      }

      appendLog('Image uploaded ✓', 'done');
      setStatus('processing');
      appendLog('Requesting AI pipeline…', 'active');

      const width = parseFloat(productWidth);
      const length = parseFloat(productLength);

      await processInventory({
        imageKeys: [imageKey],
        commerceCategory,
        supportingText: sample?.inventoryPayload.name,
        ...(Number.isFinite(width) && Number.isFinite(length)
          ? { productWidth: width, productLength: length, productDimensionUnit: dimensionUnit }
          : {}),
      });

      appendLog('Pipeline started · processing async…', 'done'); if (onStatusChange) onStatusChange('Processing…');

      let stepIdx = 0;
      const animInterval = setInterval(() => {
        if (stepIdx < LOG_STEPS.length - 1) {
          appendLog(LOG_STEPS[stepIdx], 'active');
          stepIdx++;
        }
      }, 900);

      const inventoryItem = await pollInventoryResult(300000, 4000);
      clearInterval(animInterval);

      const showResult = (item: InventoryItem) => {
        const afterSrcs = item.images?.length
          ? item.images.map(img => keyToUrl(img.key))
          : [beforeSrc];
        setSelectedImageIdxs(new Set(afterSrcs.map((_, i) => i)));
        setLastItem(item);
        setResult({
          inventoryId: item.id,
          beforeSrc,
          afterSrcs,
          title: item.title || 'AI Generated Product',
          desc: item.description || '',
          tags: [],
          addedToCatalogue: false,
        });
        setStatus('complete');
        if (onStatusChange) onStatusChange('Complete ✓');
      };

      if (inventoryItem && inventoryItem.generationStatus === 'Image Generation Complete') {
        appendLog('Packaging output bundle ✓', 'done');
        showResult(inventoryItem);
      } else if (inventoryItem?.generationStatus === 'Generation Failed') {
        throw new Error('AI generation failed on the server.');
      } else {
        // Timeout — fetch latest completed item from DB
        appendLog('Fetching latest result from catalogue...', 'active');
        const { data } = await getInventory({ page: 1, perPage: 5 });
        const latest = data.find((d: InventoryItem) => d.generationStatus === 'Image Generation Complete');
        if (latest) {
          appendLog('Result found ✓', 'done');
          showResult(latest);
        } else {
          appendLog('Pipeline running in background — check Brand Catalogue shortly', 'done');
          setResult({
            inventoryId: '',
            beforeSrc,
            afterSrcs: [beforeSrc],
            title: 'Processing in background',
            desc: 'Your item is still being processed. Check the Brand Catalogue tab in a few minutes.',
            tags: [],
            addedToCatalogue: false,
          });
          setStatus('complete');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(msg);
      appendLog('Error: ' + msg, 'done');
      setStatus('error');
    } finally {
      setRunning(false); if (onRunningChange) onRunningChange(false);
    }
  }

  function handleAddToCatalogue() {
    if (!lastItem || !result || selectedImageIdxs.size === 0) return;
    const selectedImages = lastItem.images?.filter((_, i) => selectedImageIdxs.has(i));
    if (!selectedImages?.length) return;
    setResult(prev => prev ? { ...prev, addedToCatalogue: true } : prev);
    if (onAddToCatalogue) onAddToCatalogue({ ...lastItem, images: selectedImages });
  }

  const statusStyle: Record<Status, React.CSSProperties> = {
    idle:       { background:'rgba(255,255,255,0.03)', borderColor:'var(--border)',        color:'var(--text-5)' },
    uploading:  { background:'rgba(251,191,36,0.1)',   borderColor:'rgba(251,191,36,0.3)', color:'#FBBF24' },
    processing: { background:'var(--accent-soft)',     borderColor:'var(--accent-glow)',   color:'var(--accent)' },
    complete:   { background:'rgba(0,212,255,0.08)',   borderColor:'rgba(0,212,255,0.3)',  color:'var(--cyan)' },
    error:      { background:'rgba(255,95,86,0.1)',    borderColor:'rgba(255,95,86,0.3)', color:'#FF5F56' },
  };
  const statusLabel: Record<Status, string> = {
    idle:'Idle', uploading:'⬆ Uploading', processing:'● Processing', complete:'✓ Complete', error:'✗ Error',
  };

  return (
    <div>
      {/* Process strip */}
      <div style={{ display:'flex', gap:1, background:'var(--border)', borderRadius:10, overflow:'hidden', marginBottom:28 }}>
        {[
          { num:'01', title:'Select Image',     desc:'Choose a raw product photo' },
          { num:'02', title:'Upload & Process', desc:'S3 upload → AI pipeline',    active: status==='uploading'||status==='processing' },
          { num:'03', title:'Review Output',    desc:'Before/after + AI-written copy', active: status==='complete' },
          { num:'04', title:'Add to Catalogue', desc:'Push to brand catalogue',    active: result?.addedToCatalogue },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.active ? 'rgba(59,130,246,0.08)' : 'var(--card)',
            padding:'14px 16px', flex:1, display:'flex', flexDirection:'column', gap:4,
          }}>
            <div style={{
              width:28, height:28, borderRadius:7,
              background: s.active ? 'var(--accent-soft)' : 'var(--card-2)',
              border: s.active ? '1px solid var(--accent-glow)' : 'none',
              display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8,
            }}>
              <span style={{ fontSize:11, color: s.active ? 'var(--accent)' : 'var(--text-5)' }}>{s.num}</span>
            </div>
            <div style={{ fontSize:12.5, fontWeight:500, color:'var(--text)' }}>{s.title}</div>
            <div style={{ fontSize:11, color:'var(--text-5)', lineHeight:1.35 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* LEFT */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'1.2px' }}>▣ Input · Raw Image</span>
            <span style={{ padding:'4px 10px', borderRadius:100, fontFamily:"'DM Mono', monospace", fontSize:10, letterSpacing:'0.8px', border:'1px solid', ...statusStyle[status] }}>{statusLabel[status]}</span>
          </div>

          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ padding:'28px', textAlign:'center', flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, cursor:'pointer', borderBottom:'1px solid var(--border)' }}
          >
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileChange} />
            {uploadedPreview ? (
              <div style={{ width:'100%' }}>
                <img src={uploadedPreview} alt="Uploaded" style={{ width:'100%', maxHeight:180, objectFit:'cover', borderRadius:10, border:'1px solid var(--border)' }}/>
                <div style={{ marginTop:8, fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--cyan)' }}>{uploadedFile?.name} · click to change</div>
              </div>
            ) : (
              <>
                <div style={{ width:52, height:52, borderRadius:12, background:'var(--accent-soft)', border:'1px solid var(--accent-glow)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/><path d="M17 8L12 3L7 8" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 3V15" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <div style={{ fontSize:17, color:'var(--text)' }}>Drop image or click to upload</div>
                <div style={{ fontSize:12, color:'var(--text-5)' }}>PNG, JPG, WEBP up to 20MB</div>
              </>
            )}
          </div>

          {/* Mode toggle */}
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:"'DM Mono', monospace", fontSize:9.5, color:'var(--text-5)', textTransform:'uppercase', letterSpacing:'1px' }}>Mode:</span>
            {(['lifestyle', 'marketplace'] as const).map(m => (
              <button key={m} onClick={() => setCommerceCategory(m)} style={{
                padding:'5px 12px', borderRadius:100, border:'1px solid',
                borderColor: commerceCategory===m ? 'var(--accent)' : 'var(--border)',
                background: commerceCategory===m ? 'var(--accent)' : 'transparent',
                color: commerceCategory===m ? '#fff' : 'var(--text-4)',
                fontFamily:"'DM Mono', monospace", fontSize:10, cursor:'pointer', textTransform:'capitalize',
              }}>{m}</button>
            ))}
          </div>

          {/* Product dimensions (optional — anchors aspect ratio so the AI doesn't stretch/squash the product) */}
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontFamily:"'DM Mono', monospace", fontSize:9.5, color:'var(--text-5)', textTransform:'uppercase', letterSpacing:'1px' }}>Dimensions (optional):</span>
            <input
              type="number"
              min={0}
              placeholder="Width"
              value={productWidth}
              onChange={e => setProductWidth(e.target.value)}
              style={{
                width:70, padding:'5px 10px', borderRadius:100, border:'1px solid var(--border)',
                background:'transparent', color:'var(--text-4)', fontFamily:"'DM Mono', monospace", fontSize:10,
              }}
            />
            <span style={{ color:'var(--text-5)', fontSize:10 }}>×</span>
            <input
              type="number"
              min={0}
              placeholder="Length"
              value={productLength}
              onChange={e => setProductLength(e.target.value)}
              style={{
                width:70, padding:'5px 10px', borderRadius:100, border:'1px solid var(--border)',
                background:'transparent', color:'var(--text-4)', fontFamily:"'DM Mono', monospace", fontSize:10,
              }}
            />
            <select
              value={dimensionUnit}
              onChange={e => setDimensionUnit(e.target.value as 'cm' | 'inch')}
              style={{
                padding:'5px 10px', borderRadius:100, border:'1px solid var(--border)',
                background:'transparent', color:'var(--text-4)', fontFamily:"'DM Mono', monospace", fontSize:10, cursor:'pointer',
              }}
            >
              <option value="cm">cm</option>
              <option value="inch">inch</option>
            </select>
          </div>

          {/* Samples */}
          <div style={{ padding:'14px 16px 16px', background:'var(--card)' }}>
            <div style={{ fontFamily:"'DM Mono', monospace", fontSize:9.5, color:'var(--text-5)', textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:10 }}>Or choose a sample</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {SAMPLES.map((s, i) => (
                <div key={i} onClick={() => { setSelectedSample(i); setUploadedFile(null); setUploadedPreview(null); setResult(null); setStatus('idle'); }} style={{
                  borderRadius:8, overflow:'hidden', cursor:'pointer', position:'relative', height:76,
                  border: '1.5px solid ' + (selectedSample===i ? 'var(--cyan)' : 'var(--border)'),
                  boxShadow: selectedSample===i ? '0 0 0 1px var(--cyan), 0 6px 20px rgba(0,212,255,0.2)' : 'none',
                }}>
                  <img src={s.beforeSrc} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'4px 6px', background:'linear-gradient(0deg, rgba(9,9,11,0.92), transparent)', fontFamily:"'DM Mono', monospace", fontSize:9, color:'var(--text-3)' }}>
                    Sample 0{i+1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontFamily:"'DM Mono', monospace", fontSize:10, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'1.2px' }}>◈ Output · AI Stream</span>
          </div>

          <div ref={logRef} style={{ padding:'16px 18px', background:'var(--bg)', fontFamily:"'DM Mono', monospace", fontSize:11.5, minHeight:150, maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, borderBottom:'1px solid var(--border)' }}>
            {log.map((entry, i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ color: status==='error' ? '#FF5F56' : (i===log.length-1 && status==='complete') ? 'var(--cyan)' : 'var(--accent)', flexShrink:0 }}>›</span>
                <span style={{ color: entry.state==='done' ? 'var(--text-3)' : 'var(--text)', lineHeight:1.4 }}>{entry.text}</span>
              </div>
            ))}
          </div>

          {/* Result */}
          {result && (
            <div style={{ display:'flex', flexDirection:'column', gap:12, padding:16, flex:1, overflowY:'auto' }}>
              {/* Before image */}
              <div style={{ borderRadius:10, overflow:'hidden', position:'relative', height:140, background:'var(--card-2)', border:'1px solid var(--border)' }}>
                <img src={result.beforeSrc} alt="Before" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { (e.target as HTMLImageElement).style.display='none'; }}/>
                <div style={{ position:'absolute', top:8, left:8, padding:'3px 9px', borderRadius:5, fontFamily:"'DM Mono', monospace", fontSize:10, background:'rgba(9,9,11,0.7)', color:'var(--text-3)' }}>Before</div>
              </div>
              {/* AI generated images grid */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
                <div style={{ fontSize:10, color:'var(--text-5)', fontFamily:"'DM Mono', monospace", letterSpacing:'0.8px' }}>
                  TAP TO TOGGLE · {selectedImageIdxs.size} SELECTED
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => setSelectedImageIdxs(new Set((result.afterSrcs ?? []).map((_,i)=>i)))} style={{ background:'none', border:'none', fontFamily:"'DM Mono', monospace", fontSize:9.5, color:'var(--accent)', cursor:'pointer', padding:0 }}>all</button>
                  <button onClick={() => setSelectedImageIdxs(new Set())} style={{ background:'none', border:'none', fontFamily:"'DM Mono', monospace", fontSize:9.5, color:'var(--text-5)', cursor:'pointer', padding:0 }}>none</button>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {(result.afterSrcs ?? []).map((src, idx) => {
                  const isSelected = selectedImageIdxs.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedImageIdxs(prev => {
                        const next = new Set(prev);
                        next.has(idx) ? next.delete(idx) : next.add(idx);
                        return next;
                      })}
                      style={{
                        borderRadius:10, overflow:'hidden', position:'relative', height:130,
                        background:'var(--card-2)', cursor:'pointer',
                        border: isSelected ? '2px solid var(--cyan)' : '1px solid var(--border)',
                        boxShadow: isSelected ? '0 0 0 1px var(--cyan), 0 4px 16px rgba(0,212,255,0.2)' : 'none',
                        transition:'border 0.15s, box-shadow 0.15s',
                        opacity: isSelected ? 1 : 0.5,
                      }}
                    >
                      <img src={src} alt={`AI ${idx+1}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { (e.target as HTMLImageElement).style.display='none'; }}/>
                      <div style={{ position:'absolute', top:6, left:6, padding:'2px 7px', borderRadius:5, fontFamily:"'DM Mono', monospace", fontSize:9.5, background: isSelected ? 'var(--cyan)' : 'rgba(9,9,11,0.7)', color: isSelected ? 'var(--bg)' : 'var(--text-3)', fontWeight: isSelected ? 600 : 400 }}>
                        {isSelected ? '✓' : `AI ${idx+1}`}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background:'var(--card)', borderRadius:10, padding:'14px 16px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:15, fontWeight:500, color:'var(--text)', marginBottom:6 }}>{result.title}</div>
                <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.6 }}>{result.desc}</div>
                {result.tags.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
                    {result.tags.map(t => (
                      <span key={t} style={{ padding:'3px 9px', borderRadius:100, background:'var(--card-2)', color:'var(--text-3)', fontFamily:"'DM Mono', monospace", fontSize:9.5 }}>#{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Add to Catalogue button */}
              {!result.addedToCatalogue ? (
                <button onClick={handleAddToCatalogue} disabled={selectedImageIdxs.size === 0} style={{
                  padding:'13px', border:'none', borderRadius:10,
                  background: selectedImageIdxs.size === 0 ? 'var(--card-2)' : 'var(--cyan)',
                  color: selectedImageIdxs.size === 0 ? 'var(--text-5)' : 'var(--bg)',
                  fontFamily:"'DM Sans', sans-serif", fontSize:14, fontWeight:600,
                  cursor: selectedImageIdxs.size === 0 ? 'not-allowed' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  {selectedImageIdxs.size === 0 ? 'Select images to add' : `Add ${selectedImageIdxs.size} image${selectedImageIdxs.size > 1 ? 's' : ''} to Catalogue`}
                </button>
              ) : (
                <div style={{ padding:'13px', borderRadius:10, background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.3)', color:'var(--cyan)', fontFamily:"'DM Mono', monospace", fontSize:12, textAlign:'center', letterSpacing:'0.5px' }}>
                  ✓ Added to Catalogue
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div style={{ margin:'12px 16px', padding:'12px 14px', background:'rgba(255,95,86,0.08)', border:'1px solid rgba(255,95,86,0.25)', borderRadius:10, fontFamily:"'DM Mono', monospace", fontSize:11, color:'#FF5F56', lineHeight:1.5 }}>
              {errorMsg}
            </div>
          )}

          <button onClick={runPipeline} disabled={!canRun} style={{
            margin:'12px 16px 16px', padding:14, border:'none', borderRadius:10,
            background: !canRun ? 'var(--card-2)' : 'var(--accent)',
            color: !canRun ? 'var(--text-5)' : '#fff',
            fontFamily:"'DM Sans', sans-serif", fontSize:14, fontWeight:500,
            cursor: !canRun ? 'not-allowed' : 'pointer',
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:10,
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {running ? (status === 'uploading' ? 'Uploading…' : 'Processing…') : result ? 'Run Again' : 'Run AI Pipeline'}
          </button>
        </div>
      </div>
    </div>
  );
}