import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14, background: 'linear-gradient(145deg,#f6d98e,#8b7cf6)', color: '#100d16', fontSize: 23, fontWeight: 900, letterSpacing: -2, border: '2px solid rgba(255,255,255,.35)' }}>BH</div>,
    size
  );
}
