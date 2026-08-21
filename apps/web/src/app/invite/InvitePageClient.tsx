'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, Check, Smartphone, Download } from 'lucide-react';
import { buildExpoUrl, buildExpoGoUrl } from './expoLink';

function InviteContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const [copied, setCopied] = useState(false);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [openFailed, setOpenFailed] = useState(false);
  const [expoInstalled, setExpoInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
    if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform('ios');
    } else if (/Android/.test(ua)) {
      setPlatform('android');
    } else {
      setPlatform('other');
    }
  }, []);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    fetch(`/api/athlete/validate-code?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.valid && data?.coach?.name) {
          setCoachName(data.coach.name);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [code]);

  const storeLink =
    platform === 'ios'
      ? 'https://apps.apple.com/app/expo-go/id982107779'
      : 'https://play.google.com/store/apps/details?id=host.exp.exponent';

  // URLs for different scenarios
  const appUrl = buildExpoUrl(code);        // mrtraining://invite?code=XXX (installed app)
  const expoGoUrl = buildExpoGoUrl(code);   // exp://... (Expo Go for dev)
  const webFallbackUrl = `https://app.mrtraining.com/invite?code=${code}`;

  // QR code opens the installed app via custom scheme
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    appUrl
  )}`;

  const handleOpenInApp = () => {
    setOpenFailed(false);

    const timer = window.setTimeout(() => {
      if (!document.hidden) {
        setOpenFailed(true);
      }
    }, 1500);

    const clear = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
      }
    };
    document.addEventListener('visibilitychange', clear, { once: true });

    // Try custom scheme first (installed app)
    window.location.href = appUrl;
  };

  const handleOpenInExpoGo = () => {
    setOpenFailed(false);

    const timer = window.setTimeout(() => {
      if (!document.hidden) {
        setOpenFailed(true);
      }
    }, 1500);

    const clear = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
      }
    };
    document.addEventListener('visibilitychange', clear, { once: true });

    // Use exp:// for Expo Go
    window.location.href = expoGoUrl;
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary font-display font-bold text-sm">
              MR
            </div>
            <span className="font-display text-lg font-semibold text-text-primary tracking-wide">
              MR Training
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Únete a MR Training
          </h1>
          {loading ? (
            <p className="text-sm text-text-secondary mt-2">Cargando...</p>
          ) : coachName ? (
            <p className="text-sm text-text-secondary mt-2">
              Has sido invitado por <strong className="text-text-primary">{coachName}</strong>
            </p>
          ) : (
            <p className="text-sm text-text-secondary mt-2">
              Has sido invitado a unirte a un equipo
            </p>
          )}
        </div>

        {!code ? (
          <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 text-center">
            <p className="text-text-secondary">
              Link de invitación inválido. Solicita un nuevo código a tu coach.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-6 text-center">
              <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-2">Código del equipo</p>
              <p className="text-4xl font-mono font-bold text-brand-primary tracking-[0.2em]">
                {code}
              </p>
              <button
                onClick={() => handleCopy(code)}
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary-hover transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar código'}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-40 h-40 rounded-xl overflow-hidden bg-white p-2">
                  <img
                    src={qrCodeUrl}
                    alt="QR para abrir MR Training"
                    className="w-full h-full"
                  />
                </div>
                <p className="text-xs text-text-secondary text-center">
                  Escanea este código con la cámara de tu celular para abrir la app directamente.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-text-primary text-center">Paso 1: Descarga Expo Go</h2>

              <a
                href={storeLink}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary/90 transition-colors"
              >
                <Download size={18} />
                Descargar Expo Go
              </a>

              <p className="text-xs text-text-secondary text-center">
                {platform === 'ios' && 'Te llevará al App Store'}
                {platform === 'android' && 'Te llevará a Play Store'}
                {platform === 'other' && 'Descarga Expo Go desde tu tienda de apps'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-text-primary text-center">Paso 2: Abrir MR Training</h2>

              {/* Option 1: Open in installed app */}
              <button
                 onClick={handleOpenInApp}
                 className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-primary/90 transition-colors"
               >
                 <Smartphone size={18} />
                 Abrir en MR Training
               </button>

               <p className="text-xs text-text-secondary text-center">
                 Si tenés la app instalada, se abrirá automáticamente
               </p>

              {/* Option 2: Open in Expo Go (for QA/development) */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={expoInstalled}
                    onChange={(e) => setExpoInstalled(e.target.checked)}
                    className="w-5 h-5 rounded border-surface-6 bg-surface-2 text-brand-primary focus:ring-brand-primary/30"
                  />
                  <span className="text-sm text-text-secondary">Estoy usando Expo Go (QA/Desarrollo)</span>
                </label>

                <button
                   onClick={handleOpenInExpoGo}
                   disabled={!expoInstalled}
                   className={`w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm transition-colors ${
                     expoInstalled
                       ? 'border border-white/10 bg-surface-2 text-text-primary hover:bg-surface-3'
                       : 'bg-surface-3 text-text-secondary cursor-not-allowed opacity-50'
                   }`}
                 >
                   <Smartphone size={18} />
                   Abrir en Expo Go
                 </button>
              </div>

               {openFailed ? (
                 <div className="rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4 space-y-3">
                   <p className="text-xs text-text-secondary text-center">
                     No se pudo abrir la app. Verificá que esté instalada y vuelve a intentar,
                     o escanea el QR de arriba con la cámara.
                   </p>
                   <button
                     onClick={() => handleCopy(appUrl)}
                     className="w-full inline-flex items-center justify-center gap-1.5 text-sm text-brand-primary hover:text-brand-primary-hover transition-colors"
                   >
                     <Copy size={14} />
                     Copiar link de la app
                   </button>
                   <button
                     onClick={() => handleCopy(expoGoUrl)}
                     className="w-full inline-flex items-center justify-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                   >
                     <Copy size={14} />
                     Copiar link para Expo Go
                   </button>
                 </div>
               ) : (
                 <p className="text-xs text-text-secondary text-center">
                   Si no tenés la app, descargala en el Paso 1
                 </p>
               )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface-1 p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Cómo unirte</h3>
              <ol className="space-y-3 text-sm text-text-secondary">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary text-xs flex items-center justify-center shrink-0">1</span>
                  <span>Si no tenés la app, descargala desde la tienda (Paso 1)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary text-xs flex items-center justify-center shrink-0">2</span>
                  <span>Toca &quot;Abrir en MR Training&quot; — la app se abrirá con tu código</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-brand-primary/20 text-brand-primary text-xs flex items-center justify-center shrink-0">3</span>
                  <span>Si usás Expo Go para QA, marcá la casilla y tocá &quot;Abrir en Expo Go&quot;</span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function InvitePageClient() {
  return <InviteContent />;
}
