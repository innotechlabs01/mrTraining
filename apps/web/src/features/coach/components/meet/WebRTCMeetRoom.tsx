'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Video, VideoOff, Mic, MicOff, PhoneOff, Copy, Check, Users, Wifi } from 'lucide-react'
import { goClient } from '@/lib/api/go-client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type MeetSignal = {
  seq: number
  room_id: string
  type: 'offer' | 'answer' | 'candidate' | 'join' | 'leave'
  sender_id: string
  role?: string
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  created_at: string
}

type SignalsResponse = {
  data?: {
    room_id: string
    latest_seq: number
    signals: MeetSignal[]
  }
}

export interface WebRTCMeetRoomProps {
  roomId: string
  role: 'coach' | 'athlete'
  title?: string
  participantName?: string
  onClose?: () => void
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export function WebRTCMeetRoom({
  roomId,
  role,
  title = 'Meet P2P de Onboarding & Rutina',
  participantName,
  onClose,
}: WebRTCMeetRoomProps) {
  const senderIdRef = useRef(`peer-${role}-${Math.random().toString(36).slice(2, 10)}`)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const lastSeqRef = useRef(0)
  const offeringRef = useRef(false)

  const [micEnabled, setMicEnabled] = useState(true)
  const [camEnabled, setCamEnabled] = useState(true)
  const [connectionState, setConnectionState] = useState<'connecting' | 'waiting' | 'connected' | 'error'>('connecting')
  const [statusLabel, setStatusLabel] = useState('Inicializando cámara y micrófono…')
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const postSignal = useCallback(
    async (payload: {
      type: MeetSignal['type']
      sdp?: RTCSessionDescriptionInit
      candidate?: RTCIceCandidateInit
    }) => {
      try {
        await goClient.post(
          `/public/meet/${encodeURIComponent(roomId)}/signal`,
          {
            type: payload.type,
            sender_id: senderIdRef.current,
            role,
            sdp: payload.sdp,
            candidate: payload.candidate,
          },
          { auth: false },
        )
      } catch {
        // Keep silent during transient network polling
      }
    },
    [roomId, role],
  )

  const createOfferAndSend = useCallback(async () => {
    const pc = pcRef.current
    if (!pc || offeringRef.current) return
    offeringRef.current = true
    try {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await postSignal({ type: 'offer', sdp: offer })
      setStatusLabel('Oferta P2P enviada. Esperando respuesta…')
    } catch {
      setStatusLabel('No se pudo crear la oferta P2P')
    } finally {
      offeringRef.current = false
    }
  }, [postSignal])

  useEffect(() => {
    let active = true
    let pollTimer: ReturnType<typeof setInterval> | null = null

    async function setup() {
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
          if (active) setCamEnabled(false)
        } catch {
          if (active) {
            setMediaError('No pudimos acceder a tu cámara o micrófono. Verifica los permisos del navegador.')
            setConnectionState('error')
            setStatusLabel('Permiso de cámara/micrófono requerido')
          }
          return
        }
      }

      if (!active) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const pc = new RTCPeerConnection(RTC_CONFIG)
      pcRef.current = pc

      stream.getTracks().forEach((track) => pc.addTrack(track, stream!))

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]
          setConnectionState('connected')
          setStatusLabel('Conectado P2P en vivo')
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void postSignal({ type: 'candidate', candidate: event.candidate.toJSON() })
        }
      }

      pc.onconnectionstatechange = () => {
        if (!active) return
        if (pc.connectionState === 'connected') {
          setConnectionState('connected')
          setStatusLabel('Conectado P2P en vivo')
        } else if (pc.connectionState === 'connecting') {
          setStatusLabel('Estableciendo conexión directa P2P…')
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setConnectionState('waiting')
          setStatusLabel('Esperando reconexión del otro participante…')
        }
      }

      setConnectionState('waiting')
      setStatusLabel(
        role === 'coach'
          ? 'Sala P2P lista. Esperando al atleta para conectar…'
          : 'Sala P2P lista. Conectando con tu coach…',
      )

      await postSignal({ type: 'join' })
      if (role === 'coach') {
        await createOfferAndSend()
      }

      pollTimer = setInterval(async () => {
        if (!active || !pcRef.current) return
        try {
          const res = await goClient.get<SignalsResponse>(
            `/public/meet/${encodeURIComponent(roomId)}/signals?since=${lastSeqRef.current}&exclude_sender=${encodeURIComponent(senderIdRef.current)}`,
            { auth: false },
          )
          const payload = res?.data
          if (!payload) return
          if (payload.latest_seq > lastSeqRef.current) {
            lastSeqRef.current = payload.latest_seq
          }
          for (const sig of payload.signals ?? []) {
            if (sig.type === 'join' && role === 'coach') {
              await createOfferAndSend()
            } else if (sig.type === 'offer' && sig.sdp) {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp))
              for (const cand of pendingCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
              }
              pendingCandidatesRef.current = []
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              await postSignal({ type: 'answer', sdp: answer })
              setStatusLabel('Conectando audio y video P2P…')
            } else if (sig.type === 'answer' && sig.sdp) {
              if (pc.signalingState !== 'stable') {
                await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp))
                for (const cand of pendingCandidatesRef.current) {
                  await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
                }
                pendingCandidatesRef.current = []
              }
            } else if (sig.type === 'candidate' && sig.candidate) {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(() => {})
              } else {
                pendingCandidatesRef.current.push(sig.candidate)
              }
            } else if (sig.type === 'leave') {
              if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
              setConnectionState('waiting')
              setStatusLabel('El otro participante salió de la sala')
            }
          }
        } catch {
          // Ignore transient polling failures
        }
      }, 1200)
    }

    void setup()

    return () => {
      active = false
      if (pollTimer) clearInterval(pollTimer)
      void postSignal({ type: 'leave' })
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      pcRef.current?.close()
      pcRef.current = null
    }
  }, [roomId, role, postSignal, createOfferAndSend])

  const toggleMic = () => {
    const next = !micEnabled
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = next
    })
    setMicEnabled(next)
  }

  const toggleCam = () => {
    const next = !camEnabled
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next
    })
    setCamEnabled(next)
  }

  const handleCopyInvite = () => {
    const targetRole = role === 'coach' ? 'athlete' : 'coach'
    const url = `${window.location.origin}/meet/${roomId}?role=${targetRole}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Enlace P2P copiado')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleHangup = async () => {
    await postSignal({ type: 'leave' })
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    pcRef.current?.close()
    pcRef.current = null
    onClose?.()
  }

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                connectionState === 'connected'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : connectionState === 'error'
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-amber-500/15 text-amber-300',
              )}
            >
              <Wifi size={11} />
              {statusLabel}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white mt-1 truncate">
            {title} {participantName ? `· ${participantName}` : ''}
          </h3>
          <p className="text-[11px] text-white/40 font-mono">Sala P2P: {roomId}</p>
        </div>

        <button
          onClick={handleCopyInvite}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          {copied ? 'Copiado' : 'Copiar enlace'}
        </button>
      </div>

      {/* Video grid */}
      {mediaError ? (
        <div className="p-10 text-center space-y-2">
          <p className="text-sm font-medium text-red-400">{mediaError}</p>
          <p className="text-xs text-white/40">Habilita cámara/micrófono en la barra de tu navegador y vuelve a abrir la sala.</p>
        </div>
      ) : (
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-black/50 min-h-[340px]">
          {/* Remote participant */}
          <div className="relative rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden min-h-[240px] flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover max-h-[380px]"
            />
            {connectionState !== 'connected' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-center p-4">
                <Users size={32} className="text-white/25 mb-2" />
                <p className="text-xs font-medium text-white/70">
                  {role === 'coach' ? 'Esperando al atleta en sala P2P…' : 'Esperando al coach en sala P2P…'}
                </p>
                <p className="text-[11px] text-white/40 mt-1">Comparte el enlace o espera que ingrese desde su notificación</p>
              </div>
            )}
            <span className="absolute bottom-2.5 left-2.5 rounded-md bg-black/70 px-2 py-0.5 text-[11px] text-white/80">
              {role === 'coach' ? participantName || 'Atleta' : 'Coach'}
            </span>
          </div>

          {/* Local stream */}
          <div className="relative rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden min-h-[240px] flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover max-h-[380px]"
            />
            <span className="absolute bottom-2.5 left-2.5 rounded-md bg-black/70 px-2 py-0.5 text-[11px] text-white/80">
              Tú ({role === 'coach' ? 'Coach' : 'Atleta'})
            </span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-white/10 bg-white/[0.02]">
        <button
          onClick={toggleMic}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium transition-colors',
            micEnabled ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
          )}
        >
          {micEnabled ? <Mic size={15} /> : <MicOff size={15} />}
          {micEnabled ? 'Micrófono activo' : 'Silenciado'}
        </button>

        <button
          onClick={toggleCam}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium transition-colors',
            camEnabled ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
          )}
        >
          {camEnabled ? <Video size={15} /> : <VideoOff size={15} />}
          {camEnabled ? 'Cámara activa' : 'Cámara apagada'}
        </button>

        {role === 'coach' && connectionState !== 'connected' && (
          <button
            onClick={() => void createOfferAndSend()}
            className="flex items-center gap-2 rounded-full bg-brand-primary/20 text-brand-primary px-4 py-2.5 text-xs font-medium hover:bg-brand-primary/30 transition-colors"
          >
            Reintentar P2P
          </button>
        )}

        <button
          onClick={() => void handleHangup()}
          className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <PhoneOff size={15} />
          Finalizar Meet
        </button>
      </div>
    </div>
  )
}
