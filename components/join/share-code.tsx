'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareCodeProps {
  path: string;
  code: string;
  label: string;
  houseOrigin?: string;
  large?: boolean;
}

export default function ShareCode({ path, code, label, houseOrigin, large = false }: ShareCodeProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [url, setUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const linkField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const host = window.location.hostname;
    const local = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const absolute = local && houseOrigin ? `${houseOrigin}${path}` : `${window.location.origin}${path}`;
    let cancelled = false;
    QRCode.toDataURL(absolute, { margin: 2, width: large ? 320 : 168, color: { dark: '#202a45', light: '#ffffff' } })
      .then(image => { if (!cancelled) { setSrc(image); setUrl(absolute); setCopied(false); setManual(false); } })
      .catch(() => { if (!cancelled) { setSrc(null); setUrl(absolute); } });
    return () => { cancelled = true; };
  }, [path, houseOrigin, large]);

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setManual(false); }
    catch { linkField.current?.focus(); linkField.current?.select(); setManual(true); }
  }

  return <div className={large ? 'flex flex-col sm:flex-row items-start gap-4' : 'flex items-center gap-3'}>
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={`QR code for ${label}`} className={large ? 'h-40 w-40 shrink-0 rounded-md bg-white' : 'h-24 w-24 shrink-0 rounded-md bg-white'} />
    ) : <div className={large ? 'h-40 w-40 shrink-0 rounded-md bg-muted' : 'h-24 w-24 shrink-0 rounded-md bg-muted'} />}
    <div className="min-w-0 w-full space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="font-heading text-lg text-foreground">{code}</p>
      <input ref={linkField} aria-label="Invite link" readOnly value={url} onFocus={event => event.target.select()} className="w-full min-w-0 rounded-md border border-input bg-card p-2 text-xs text-muted-foreground" />
      <Button type="button" size="sm" variant="outline" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy link'}</Button>
      <p role="status" className="subtle">{manual ? 'Link selected. Copy it from the field above.' : copied ? 'Link copied.' : ''}</p>
    </div>
  </div>;
}
