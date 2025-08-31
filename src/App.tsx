
// =============================
// VERSION SANS DÉPENDANCES (copie-colle dans src/App.tsx)
// =============================
//
// Cette version n’utilise AUCUNE bibliothèque UI (pas de shadcn, pas d’icônes).
// Elle fonctionne sur GitHub Pages avec Vite + React uniquement.
// Conserve ton index.html, vite.config.ts, tsconfig.json, package.json comme indiqués.
// Remplace simplement le contenu de src/App.tsx par ce fichier.

import React, { useEffect, useMemo, useRef, useState } from 'react'

type Mode = 'stroop' | 'numbers' | 'color' | 'directions' | 'numberColor' | 'directionColor'

type Stimulus = {
  kind: 'text' | 'block'
  content?: string
  textColor?: string
  bgColor?: string
}

const DIGITS = Array.from({ length: 10 }, (_, i) => i)
const DIRECTIONS = [
  { key: 'N', label: 'Haut', char: '↑' },
  { key: 'E', label: 'Droite', char: '→' },
  { key: 'S', label: 'Bas', char: '↓' },
  { key: 'W', label: 'Gauche', char: '←' },
  { key: 'NE', label: 'Haut‑Droite', char: '↗' },
  { key: 'SE', label: 'Bas‑Droite', char: '↘' },
  { key: 'SW', label: 'Bas‑Gauche', char: '↙' },
  { key: 'NW', label: 'Haut‑Gauche', char: '↖' }
]

const NAMED_COLORS = [
  ['Rouge', '#ef4444'],
  ['Vert', '#22c55e'],
  ['Bleu', '#3b82f6'],
  ['Jaune', '#eab308'],
  ['Orange', '#f97316'],
  ['Violet', '#a855f7'],
  ['Rose', '#ec4899'],
  ['Noir', '#111827'],
  ['Blanc', '#ffffff'],
  ['Gris', '#9ca3af']
] as const

const DEFAULT_TEXT_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308']
const DEFAULT_BG_COLORS = ['#111827', '#ffffff', '#9ca3af']

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const randItem = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export default function App() {
  const [mode, setMode] = useState<Mode>('stroop')

  // Params communs
  const [durationMs, setDurationMs] = useState(750)
  const [intervalMs, setIntervalMs] = useState(750)
  const [sets, setSets] = useState(3)
  const [repsMode, setRepsMode] = useState<'count' | 'time'>('count')
  const [repsCount, setRepsCount] = useState(20)
  const [repsTimeSec, setRepsTimeSec] = useState(60)
  const [restSec, setRestSec] = useState(30)
  const [fontScale, setFontScale] = useState(1.0)

  // Audio
  const [beep, setBeep] = useState(true)
  const [beepFreq, setBeepFreq] = useState(1200)
  const [beepDurMs, setBeepDurMs] = useState(80)

  // Plein écran
  const [wantFullscreen, setWantFullscreen] = useState(false)

  // Sélections
  const [stroopColors, setStroopColors] = useState<string[]>(DEFAULT_TEXT_COLORS)
  const [digitColors, setDigitColors] = useState<string[]>(DEFAULT_TEXT_COLORS)
  const [onlyColors, setOnlyColors] = useState<string[]>(DEFAULT_TEXT_COLORS)
  const [digits, setDigits] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 0])
  const [dirs, setDirs] = useState<string[]>(DIRECTIONS.map((d) => d.char))
  const [bgColors, setBgColors] = useState<string[]>(DEFAULT_BG_COLORS)
  const [fgColors, setFgColors] = useState<string[]>(DEFAULT_TEXT_COLORS)

  // Runtime
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [status, setStatus] = useState<'idle' | 'running' | 'rest' | 'finished'>('idle')
  const [currentSet, setCurrentSet] = useState(0)
  const [currentRep, setCurrentRep] = useState(0)
  const [restCountdown, setRestCountdown] = useState(0)
  const [stimulus, setStimulus] = useState<Stimulus | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const stopFlag = useRef(false)
  const pauseRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      try {
        // @ts-ignore
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      } catch (e) {
        audioCtxRef.current = null
      }
    }
  }, [])

  const playBeep = async () => {
    if (!beep) return
    const ctx = audioCtxRef.current
    if (!ctx) return
    try {
      await ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = beepFreq
      gain.gain.value = 0.1
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      setTimeout(() => {
        osc.stop()
        osc.disconnect()
        gain.disconnect()
      }, beepDurMs)
    } catch {}
  }

  const ensureFullscreen = async () => {
    if (!wantFullscreen) return
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      try { await el.requestFullscreen() } catch {}
    }
  }

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      try { await document.exitFullscreen() } catch {}
    }
  }

  const nextStimulus = (): Stimulus => {
    switch (mode) {
      case 'stroop': {
        const available = stroopColors.length ? stroopColors : DEFAULT_TEXT_COLORS
        const textColor = randItem(available)
        const selectedSwatches = NAMED_COLORS.filter(([_, hex]) => available.includes(hex))
        const pick = (selectedSwatches.length ? selectedSwatches : NAMED_COLORS)[Math.floor(Math.random() * (selectedSwatches.length ? selectedSwatches.length : NAMED_COLORS.length))]
        const colorName = (pick?.[0] || 'Couleur').toUpperCase()
        return { kind: 'text', content: colorName, textColor }
      }
      case 'numbers': {
        const d = randItem(digits.length ? digits : DIGITS)
        const c = randItem(digitColors.length ? digitColors : DEFAULT_TEXT_COLORS)
        return { kind: 'text', content: String(d), textColor: c }
      }
      case 'color': {
        const c = randItem(onlyColors.length ? onlyColors : DEFAULT_TEXT_COLORS)
        return { kind: 'block', bgColor: c }
      }
      case 'directions': {
        const d = randItem(dirs.length ? dirs : DIRECTIONS.map((x) => x.char))
        return { kind: 'text', content: d, textColor: '#111827' }
      }
      case 'numberColor': {
        const bg = randItem(bgColors.length ? bgColors : DEFAULT_BG_COLORS)
        const fg = randItem(fgColors.length ? fgColors : DEFAULT_TEXT_COLORS)
        const d = randItem(digits.length ? digits : DIGITS)
        return { kind: 'text', content: String(d), textColor: fg, bgColor: bg }
      }
      case 'directionColor': {
        const bg = randItem(bgColors.length ? bgColors : DEFAULT_BG_COLORS)
        const fg = randItem(fgColors.length ? fgColors : DEFAULT_TEXT_COLORS)
        const d = randItem(dirs.length ? dirs : DIRECTIONS.map((x) => x.char))
        return { kind: 'text', content: d, textColor: fg, bgColor: bg }
      }
      default:
        return { kind: 'text', content: '?', textColor: '#111827' }
    }
  }

  const totalRepsPerSet = useMemo(() => (repsMode === 'count' ? repsCount : undefined), [repsMode, repsCount])

  const runSession = async () => {
    stopFlag.current = false
    pauseRef.current = false
    setRunning(true)
    setPaused(false)
    setStatus('running')
    setCurrentSet(1)
    setCurrentRep(0)

    await ensureFullscreen()
    await audioCtxRef.current?.resume?.()

    for (let setIdx = 1; setIdx <= sets; setIdx++) {
      if (stopFlag.current) break
      setCurrentSet(setIdx)

      if (repsMode === 'count') {
        for (let rep = 1; rep <= repsCount; rep++) {
          if (stopFlag.current) break
          while (pauseRef.current) await sleep(100)
          setStimulus(nextStimulus())
          setCurrentRep(rep)
          playBeep()
          await sleep(durationMs)
          setStimulus(null)
          await sleep(intervalMs)
        }
      } else {
        const endAt = Date.now() + repsTimeSec * 1000
        let rep = 0
        while (Date.now() < endAt) {
          if (stopFlag.current) break
          while (pauseRef.current) await sleep(100)
          rep++
          setCurrentRep(rep)
          setStimulus(nextStimulus())
          playBeep()
          await sleep(durationMs)
          setStimulus(null)
          await sleep(intervalMs)
        }
      }

      if (setIdx < sets && !stopFlag.current) {
        setStatus('rest')
        for (let t = restSec; t > 0; t--) {
          setRestCountdown(t)
          await sleep(1000)
          if (stopFlag.current) break
        }
        setStatus('running')
      }
    }

    setStimulus(null)
    setRunning(false)
    setPaused(false)
    setStatus('finished')
    setCurrentRep(0)
    await exitFullscreen()
  }

  const handleStart = () => { if (!running) runSession() }
  const handleStop = async () => {
    stopFlag.current = true
    setRunning(false)
    setPaused(false)
    setStatus('idle')
    setStimulus(null)
    setCurrentRep(0)
    await exitFullscreen()
  }
  const handlePauseToggle = () => {
    if (!running) return
    const nv = !paused
    setPaused(nv)
    pauseRef.current = nv
  }

  const progressPerc = useMemo(() => {
    if (status === 'running' && repsMode === 'count' && totalRepsPerSet) {
      const pctPerSet = 100 / sets
      const repsPct = (currentRep / totalRepsPerSet) * pctPerSet
      return clamp((currentSet - 1) * pctPerSet + repsPct, 0, 100)
    }
    return status === 'finished' ? 100 : currentSet > 0 ? (currentSet / sets) * 100 : 0
  }, [status, repsMode, totalRepsPerSet, currentRep, currentSet, sets])

  // Helpers de rendu
  const CheckboxList = ({
    title,
    options,
    selected,
    onToggle,
    render
  }: {
    title: string
    options: string[]
    selected: string[]
    onToggle: (v: string) => void
    render?: (v: string) => React.ReactNode
  }) => (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => (
          <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 10 }}>
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
            />
            <span>{render ? render(opt) : opt}</span>
          </label>
        ))}
      </div>
    </div>
  )

  const ColorPicker = ({ title, selected, setSelected }: { title: string; selected: string[]; setSelected: (next: string[]) => void }) => (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {NAMED_COLORS.map(([name, hex]) => {
          const active = selected.includes(hex)
          return (
            <button key={hex} type="button" onClick={() => setSelected(active ? selected.filter((x) => x !== hex) : [...selected, hex])} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 6, display: 'inline-flex', alignItems: 'center', gap: 8, background: active ? '#f1f5f9' : '#fff' }}>
              <span style={{ width: 18, height: 18, borderRadius: 6, background: hex, display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }} />
              <span>{name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: 12 }} ref={containerRef}>
      <h1 style={{ margin: '8px 0 12px' }}>NeuroReact — entraînement cognitif</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        {/* Colonne paramètres */}
        <div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Paramètres</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label>
                Mode<br />
                <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                  <option value="stroop">Stroop</option>
                  <option value="numbers">Chiffres</option>
                  <option value="color">Couleur</option>
                  <option value="directions">Directions</option>
                  <option value="numberColor">Chiffre + Couleur</option>
                  <option value="directionColor">Direction + Couleur</option>
                </select>
              </label>

              <label>
                Durée d'apparition (ms)
                <input type="number" value={durationMs} onChange={(e) => setDurationMs(clamp(parseInt(e.target.value || '0', 10), 50, 10000))} min={50} max={10000} step={10} />
              </label>

              <label>
                Intervalle (ms)
                <input type="number" value={intervalMs} onChange={(e) => setIntervalMs(clamp(parseInt(e.target.value || '0', 10), 0, 20000))} min={0} max={20000} step={10} />
              </label>

              <label>
                Nombre de sets
                <input type="number" value={sets} onChange={(e) => setSets(clamp(parseInt(e.target.value || '0', 10), 1, 20))} min={1} max={20} />
              </label>

              <label>
                Répétitions (mode)
                <select value={repsMode} onChange={(e) => setRepsMode(e.target.value as any)}>
                  <option value="count">Par nombre</option>
                  <option value="time">Par durée</option>
                </select>
              </label>

              {repsMode === 'count' ? (
                <label>
                  Nombre d'apparitions
                  <input type="number" value={repsCount} onChange={(e) => setRepsCount(clamp(parseInt(e.target.value || '0', 10), 1, 2000))} min={1} max={2000} />
                </label>
              ) : (
                <label>
                  Durée d'un set (sec)
                  <input type="number" value={repsTimeSec} onChange={(e) => setRepsTimeSec(clamp(parseInt(e.target.value || '0', 10), 5, 3600))} min={5} max={3600} />
                </label>
              )}

              <label>
                Récupération (sec)
                <input type="number" value={restSec} onChange={(e) => setRestSec(clamp(parseInt(e.target.value || '0', 10), 0, 600))} min={0} max={600} />
              </label>

              <label>
                Taille texte (×)
                <input type="range" min={0.5} max={2} step={0.05} value={fontScale} onChange={(e) => setFontScale(parseFloat(e.target.value))} />
              </label>

              <label>
                Beep audio
                <input type="checkbox" checked={beep} onChange={(e) => setBeep(e.target.checked)} />
              </label>

              {beep && (
                <>
                  <label>
                    Fréquence (Hz)
                    <input type="number" value={beepFreq} onChange={(e) => setBeepFreq(clamp(parseInt(e.target.value || '0', 10), 100, 4000))} min={100} max={4000} step={10} />
                  </label>
                  <label>
                    Durée beep (ms)
                    <input type="number" value={beepDurMs} onChange={(e) => setBeepDurMs(clamp(parseInt(e.target.value || '0', 10), 20, 500))} min={20} max={500} step={5} />
                  </label>
                </>
              )}

              <label>
                Plein écran à la lecture
                <input type="checkbox" checked={wantFullscreen} onChange={(e) => setWantFullscreen(e.target.checked)} />
              </label>
            </div>
          </div>

          {/* Sélecteurs spécifiques */}
          {mode === 'stroop' && (
            <ColorPicker title="Couleurs (texte & mots)" selected={stroopColors} setSelected={setStroopColors} />
          )}

          {mode === 'numbers' && (
            <>
              <ColorPicker title="Couleurs du chiffre" selected={digitColors} setSelected={setDigitColors} />
              <CheckboxList
                title="Chiffres"
                options={DIGITS.map(String)}
                selected={digits.map(String)}
                onToggle={(v) => setDigits((cur) => (cur.includes(Number(v)) ? cur.filter((x) => x !== Number(v)) : [...cur, Number(v)]))}
              />
            </>
          )}

          {mode === 'color' && (
            <ColorPicker title="Couleurs à afficher" selected={onlyColors} setSelected={setOnlyColors} />
          )}

          {mode === 'directions' && (
            <CheckboxList
              title="Directions"
              options={DIRECTIONS.map((d) => d.char)}
              selected={dirs}
              onToggle={(v) => setDirs((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))}
              render={(c) => <span style={{ fontSize: 20 }}>{c}</span>}
            />
          )}

          {mode === 'numberColor' && (
            <>
              <ColorPicker title="Couleurs de fond" selected={bgColors} setSelected={setBgColors} />
              <ColorPicker title="Couleurs du chiffre" selected={fgColors} setSelected={setFgColors} />
              <CheckboxList
                title="Chiffres"
                options={DIGITS.map(String)}
                selected={digits.map(String)}
                onToggle={(v) => setDigits((cur) => (cur.includes(Number(v)) ? cur.filter((x) => x !== Number(v)) : [...cur, Number(v)]))}
              />
            </>
          )}

          {mode === 'directionColor' && (
            <>
              <ColorPicker title="Couleurs de fond" selected={bgColors} setSelected={setBgColors} />
              <ColorPicker title="Couleurs de la flèche" selected={fgColors} setSelected={setFgColors} />
              <CheckboxList
                title="Directions"
                options={DIRECTIONS.map((d) => d.char)}
                selected={dirs}
                onToggle={(v) => setDirs((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))}
                render={(c) => <span style={{ fontSize: 20 }}>{c}</span>}
              />
            </>
          )}
        </div>

        {/* Colonne aire de stimulus */}
        <div>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <button onClick={handleStart} disabled={running} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb', marginRight: 8 }}>Démarrer</button>
              <button onClick={handlePauseToggle} disabled={!running} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb', marginRight: 8 }}>{paused ? 'Reprendre' : 'Pause'}</button>
              <button onClick={handleStop} disabled={!running} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}>Stop</button>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {status === 'running' && (<span>Set {currentSet}/{sets} • Rep {currentRep}{repsMode === 'count' ? `/${repsCount}` : ''}</span>)}
              {status === 'rest' && (<span>Récupération : {restCountdown}s</span>)}
              {status === 'finished' && (<span>Terminé</span>)}
              {status === 'idle' && (<span>Prêt</span>)}
            </div>
          </div>

          <div className="card" style={{ height: '70vh', position: 'relative', overflow: 'hidden' , background: stimulus?.bgColor || '#f8fafc'}}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stimulus ? (
                stimulus.kind === 'block' ? (
                  <div style={{ width: '100%', height: '100%' }} />
                ) : (
                  <div style={{
                    fontWeight: 800,
                    color: stimulus.textColor || '#111827',
                    fontSize: `${Math.round(fontScale * 12)}vw`,
                    lineHeight: 1,
                    textShadow: '0 2px 12px rgba(0,0,0,0.15)',
                    userSelect: 'none',
                    textAlign: 'center'
                  }}>
                    {stimulus.content}
                  </div>
                )
              ) : (
                <div style={{ color: '#6b7280' }}>En attente…</div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
              <span>Progression</span>
              <span>{Math.round(progressPerc)}%</span>
            </div>
            <div style={{ height: 10, background: '#e5e7eb', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ width: `${progressPerc}%`, height: '100%', background: '#3b82f6' }} />
            </div>
          </div>

          <div className="card" style={{ marginTop: 12, fontSize: 14, color: '#4b5563' }}>
            <ul>
              <li>Le stimulus s’affiche pendant la <b>durée</b>, puis l’écran est vide pendant l’<b>intervalle</b>.</li>
              <li>En mode <b>Par nombre</b>, chaque set affiche un nombre fixe d’apparitions. En mode <b>Par durée</b>, le set se termine au temps indiqué.</li>
              <li>Le <b>bip</b> nécessite un clic utilisateur (bouton Démarrer) pour être autorisé par le navigateur mobile.</li>
              <li>Active le <b>plein écran</b> pour un entraînement sans distraction.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

