import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'BookHaven — Find your next chapter';

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#05070d', color: '#f9f7ff', padding: 54, fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: 999, left: -250, top: -300, background: 'rgba(139,124,246,.22)' }} />
      <div style={{ position: 'absolute', width: 460, height: 460, borderRadius: 999, right: -170, bottom: -250, background: 'rgba(242,198,109,.12)' }} />
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,.12)', borderRadius: 38, padding: 48, background: 'rgba(255,255,255,.025)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 690 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#f2c66d', fontSize: 18, fontWeight: 800, letterSpacing: 4 }}>BOOKHAVEN · DIGITAL BOOKSTORE</div>
          <div style={{ display: 'flex', marginTop: 34, fontSize: 72, lineHeight: .98, fontWeight: 900, letterSpacing: -4 }}>Find the book that changes your next chapter.</div>
          <div style={{ display: 'flex', marginTop: 28, color: '#a4abc0', fontSize: 25, lineHeight: 1.4 }}>Curated shelves, personal reading state, live inventory and an independent visual system.</div>
        </div>
        <div style={{ display: 'flex', width: 300, height: 430, borderRadius: 30, background: 'linear-gradient(145deg,#211646,#8064dc)', border: '1px solid rgba(255,255,255,.18)', padding: 30, flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 35px 90px rgba(0,0,0,.45)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, letterSpacing: 2 }}><span style={{ display: 'flex', width: 40, height: 40, borderRadius: 11, border: '1px solid rgba(255,255,255,.3)', alignItems: 'center', justifyContent: 'center' }}>BH</span><span>CURATOR SELECT</span></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}><div style={{ display: 'flex', width: 95, height: 95, borderRadius: 99, border: '1px solid rgba(255,255,255,.3)', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900 }}>BH</div><div style={{ display: 'flex', marginTop: 22, fontSize: 34, lineHeight: 1.04, fontWeight: 900 }}>Books worth keeping close.</div></div>
          <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,.22)', paddingTop: 16, fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>BOOKHAVEN EDITION</div>
        </div>
      </div>
    </div>,
    size
  );
}
