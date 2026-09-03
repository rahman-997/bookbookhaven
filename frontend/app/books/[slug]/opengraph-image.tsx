import { ImageResponse } from 'next/og';
import { getBookBySlug } from '@/lib/api';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function tone(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const palettes = [
    ['#211646', '#8064dc'], ['#102b32', '#2f8f78'], ['#481d25', '#b25a51'], ['#172439', '#4c6fa8'],
    ['#362414', '#b27a36'], ['#301831', '#8d4d83'], ['#173128', '#68844e'], ['#25222f', '#736980']
  ];
  return palettes[hash % palettes.length]!;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  const [a, b] = tone(slug);
  const title = book?.title ?? 'BookHaven';
  const author = book?.author ?? 'Curated reading';
  const category = book?.categories[0]?.replace(/[-_]+/g, ' ').toUpperCase() ?? 'LIBRARY EDITION';

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#05070d', color: '#f9f7ff', padding: 52, fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 520, height: 520, borderRadius: 999, right: -120, top: -190, background: 'rgba(139,124,246,.16)' }} />
      <div style={{ display: 'flex', width: '100%', height: '100%', border: '1px solid rgba(255,255,255,.12)', borderRadius: 36, background: 'rgba(255,255,255,.025)', padding: 44, alignItems: 'center', justifyContent: 'space-between', gap: 52 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#f2c66d', fontSize: 18, fontWeight: 800, letterSpacing: 4 }}>BOOKHAVEN · {category}</div>
          <div style={{ display: 'flex', marginTop: 34, fontSize: title.length > 36 ? 54 : 68, lineHeight: 1.02, fontWeight: 900, letterSpacing: -3, maxWidth: 690 }}>{title}</div>
          <div style={{ display: 'flex', marginTop: 22, color: '#a4abc0', fontSize: 28 }}>{author}</div>
          <div style={{ display: 'flex', marginTop: 56, alignItems: 'center', gap: 16, fontSize: 18, color: '#71798e' }}><span style={{ display: 'flex', width: 11, height: 11, borderRadius: 99, background: '#65dfbd' }} /> Curated edition · live catalog</div>
        </div>
        <div style={{ display: 'flex', width: 290, height: 435, borderRadius: 28, background: `linear-gradient(145deg, ${a}, ${b})`, boxShadow: '0 35px 90px rgba(0,0,0,.45)', border: '1px solid rgba(255,255,255,.16)', padding: 30, flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 800, letterSpacing: 2 }}><span style={{ display: 'flex', width: 38, height: 38, border: '1px solid rgba(255,255,255,.3)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>BH</span><span>{category}</span></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}><div style={{ display: 'flex', fontSize: title.length > 30 ? 29 : 36, lineHeight: 1.04, fontWeight: 900 }}>{title}</div><div style={{ display: 'flex', marginTop: 16, opacity: .78, fontSize: 17 }}>{author}</div></div>
          <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,.22)', paddingTop: 16, fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>BOOKHAVEN EDITION</div>
        </div>
      </div>
    </div>,
    size
  );
}
