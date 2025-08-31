import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Square, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react";

// === Types ===

type Mode =
  | "stroop"
  | "numbers"
  | "color"
  | "directions"
  | "numberColor"
  | "directionColor";

type Stimulus = {
  kind: "text" | "block";
  content?: string; // for text (words, digits, arrows)
  textColor?: string; // CSS color
  bgColor?: string; // CSS color
};

// === Helpers ===

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function randItem<T>(arr: T[]): T {
  if (!arr || arr.length === 0) throw new Error("Empty selection");
  return arr[Math.floor(Math.random() * arr.length)];
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// === Palettes ===

type ColorSwatch = { key: string; label: string; hex: string };

const PALETTE: ColorSwatch[] = [
  { key: "rouge", label: "Rouge", hex: "#ef4444" },
  { key: "vert", label: "Vert", hex: "#22c55e" },
  { key: "bleu", label: "Bleu", hex: "#3b82f6" },
  { key: "jaune", label: "Jaune", hex: "#eab308" },
  { key: "orange", label: "Orange", hex: "#f97316" },
  { key: "violet", label: "Violet", hex: "#a855f7" },
  { key: "rose", label: "Rose", hex: "#ec4899" },
  { key: "noir", label: "Noir", hex: "#111827" },
  { key: "blanc", label: "Blanc", hex: "#ffffff" },
  { key: "gris", label: "Gris", hex: "#9ca3af" },
];

const DEFAULT_TEXT_COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#eab308"]; // rouge, vert, bleu, jaune
const DEFAULT_BG_COLORS = ["#111827", "#ffffff", "#9ca3af"]; // noir, blanc, gris

const DIGITS = Array.from({ length: 10 }, (_, i) => i); // 0..9

const DIRECTIONS: { label: string; char: string; key: string }[] = [
  { key: "N", label: "Haut", char: "↑" },
  { key: "E", label: "Droite", char: "→" },
  { key: "S", label: "Bas", char: "↓" },
  { key: "W", label: "Gauche", char: "←" },
  { key: "NE", label: "Haut‑Droite", char: "↗" },
  { key: "SE", label: "Bas‑Droite", char: "↘" },
  { key: "SW", label: "Bas‑Gauche", char: "↙" },
  { key: "NW", label: "Haut‑Gauche", char: "↖" },
];

// === UI subcomponents ===

function ColorMultiPicker({
  title,
  selected,
  onChange,
  allowAddHex = false,
}: {
  title: string;
  selected: string[]; // hex strings
  onChange: (next: string[]) => void;
  allowAddHex?: boolean;
}) {
  return (
    <Card className="w-full">
      <CardHeader className="py-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-5 gap-2">
          {PALETTE.map((c) => {
            const active = selected.includes(c.hex);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() =>
                  onChange(
                    active
                      ? selected.filter((x) => x !== c.hex)
                      : [...selected, c.hex]
                  )
                }
                className={`h-10 rounded-xl border flex items-center justify-center text-xs font-medium shadow-sm transition-all ${
                  active ? "ring-2 ring-offset-2" : "opacity-80 hover:opacity-100"
                }`}
                style={{ backgroundColor: c.hex }}
                aria-pressed={active}
                title={c.label}
              >
                <span
                  className="px-2 py-0.5 rounded-lg"
                  style={{
                    background: c.hex === "#ffffff" ? "#e5e7eb" : "rgba(255,255,255,0.65)",
                    color: "#111827",
                  }}
                >
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
        {allowAddHex && (
          <div className="mt-3 flex gap-2 items-center">
            <Label htmlFor="hexadd" className="text-sm">Ajouter une couleur (hex)</Label>
            <Input
              id="hexadd"
              placeholder="#00FFAA"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (/^#([0-9a-fA-F]{3}){1,2}$/.test(val)) {
                    onChange(Array.from(new Set([...selected, val.toUpperCase()])));
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChipsToggle<T extends string | number>({
  title,
  options,
  selected,
  onChange,
  render,
}: {
  title: string;
  options: T[];
  selected: T[];
  onChange: (next: T[]) => void;
  render?: (v: T) => React.ReactNode;
}) {
  return (
    <Card className="w-full">
      <CardHeader className="py-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {options.map((opt, i) => {
            const active = selected.includes(opt);
            return (
              <button
                key={String(opt) + i}
                type="button"
                onClick={() =>
                  onChange(
                    active ? selected.filter((x) => x !== opt) : [...selected, opt]
                  )
                }
                className={`px-3 py-2 rounded-xl border text-sm shadow-sm transition-all ${
                  active ? "bg-primary text-primary-foreground" : "bg-background"
                }`}
                aria-pressed={active}
              >
                {render ? render(opt) : String(opt)}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function NumberInput({
  label,
  value,
  setValue,
  min = 0,
  max = 100000,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="grid grid-cols-2 items-center gap-3">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(clamp(parseInt(e.target.value || "0", 10), min, max))}
          min={min}
          max={max}
          step={step}
        />
        {suffix && <span className="text-muted-foreground text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

// === Main component ===

export default function NeuroReactApp() {
  const [mode, setMode] = useState<Mode>("stroop");

  // Common params
  const [durationMs, setDurationMs] = useState(750);
  const [intervalMs, setIntervalMs] = useState(750);
  const [sets, setSets] = useState(3);
  const [repsMode, setRepsMode] = useState<"count" | "time">("count");
  const [repsCount, setRepsCount] = useState(20);
  const [repsTimeSec, setRepsTimeSec] = useState(60);
  const [restSec, setRestSec] = useState(30);
  const [fontScale, setFontScale] = useState(1.0);

  // Audio
  const [beep, setBeep] = useState(true);
  const [beepFreq, setBeepFreq] = useState(1200);
  const [beepDurMs, setBeepDurMs] = useState(80);

  // Fullscreen
  const [wantFullscreen, setWantFullscreen] = useState(false);

  // Selections
  const [stroopColors, setStroopColors] = useState<string[]>(DEFAULT_TEXT_COLORS);
  const [digitColors, setDigitColors] = useState<string[]>(DEFAULT_TEXT_COLORS);
  const [onlyColors, setOnlyColors] = useState<string[]>(DEFAULT_TEXT_COLORS);
  const [digits, setDigits] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  const [dirs, setDirs] = useState<string[]>(DIRECTIONS.map((d) => d.char));

  const [bgColors, setBgColors] = useState<string[]>(DEFAULT_BG_COLORS);
  const [fgColors, setFgColors] = useState<string[]>(DEFAULT_TEXT_COLORS);

  // Runtime state
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<"idle" | "running" | "rest" | "finished">("idle");
  const [currentSet, setCurrentSet] = useState(0);
  const [currentRep, setCurrentRep] = useState(0);
  const [restCountdown, setRestCountdown] = useState(0);
  const [stimulus, setStimulus] = useState<Stimulus | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const stopFlag = useRef(false);
  const pauseRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Prepare AudioContext lazily
  useEffect(() => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        audioCtxRef.current = null;
      }
    }
  }, []);

  const playBeep = async () => {
    if (!beep) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      await ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = beepFreq;
      gain.gain.value = 0.1; // gentle volume
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }, beepDurMs);
    } catch {}
  };

  const ensureFullscreen = async () => {
    if (!wantFullscreen) return;
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen();
      } catch {}
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
  };

  // Stimulus generators per mode
  const nextStimulus = (): Stimulus => {
    switch (mode) {
      case "stroop": {
        const available = stroopColors.length ? stroopColors : DEFAULT_TEXT_COLORS;
        const textColor = randItem(available);
        // Choose a COLOR NAME from selected palette. Find its label.
        const colorName = (() => {
          const selectedSwatches = PALETTE.filter((p) => available.includes(p.hex));
          const pick = randItem(selectedSwatches.length ? selectedSwatches : PALETTE);
          return pick.label.toUpperCase();
        })();
        return { kind: "text", content: colorName, textColor, bgColor: undefined };
      }
      case "numbers": {
        const d = randItem(digits.length ? digits : DIGITS);
        const c = randItem(digitColors.length ? digitColors : DEFAULT_TEXT_COLORS);
        return { kind: "text", content: String(d), textColor: c };
      }
      case "color": {
        const c = randItem(onlyColors.length ? onlyColors : DEFAULT_TEXT_COLORS);
        return { kind: "block", bgColor: c };
      }
      case "directions": {
        const d = randItem(dirs.length ? dirs : DIRECTIONS.map((x) => x.char));
        return { kind: "text", content: d, textColor: "#111827" };
      }
      case "numberColor": {
        const bg = randItem(bgColors.length ? bgColors : DEFAULT_BG_COLORS);
        const fg = randItem(fgColors.length ? fgColors : DEFAULT_TEXT_COLORS);
        const d = randItem(digits.length ? digits : DIGITS);
        return { kind: "text", content: String(d), textColor: fg, bgColor: bg };
      }
      case "directionColor": {
        const bg = randItem(bgColors.length ? bgColors : DEFAULT_BG_COLORS);
        const fg = randItem(fgColors.length ? fgColors : DEFAULT_TEXT_COLORS);
        const d = randItem(dirs.length ? dirs : DIRECTIONS.map((x) => x.char));
        return { kind: "text", content: d, textColor: fg, bgColor: bg };
      }
      default:
        return { kind: "text", content: "?", textColor: "#111827" };
    }
  };

  const totalRepsPerSet = useMemo(() => (repsMode === "count" ? repsCount : undefined), [repsMode, repsCount]);

  // Core runner
  const runSession = async () => {
    stopFlag.current = false;
    pauseRef.current = false;
    setRunning(true);
    setPaused(false);
    setStatus("running");
    setCurrentSet(1);
    setCurrentRep(0);

    await ensureFullscreen();
    await audioCtxRef.current?.resume?.();

    for (let setIdx = 1; setIdx <= sets; setIdx++) {
      if (stopFlag.current) break;
      setCurrentSet(setIdx);

      if (repsMode === "count") {
        for (let rep = 1; rep <= repsCount; rep++) {
          if (stopFlag.current) break;
          // pause gate
          while (pauseRef.current) await sleep(100);

          // show stimulus
          setStimulus(nextStimulus());
          setCurrentRep(rep);
          playBeep();
          await sleep(durationMs);

          // hide
          setStimulus(null);
          await sleep(intervalMs);
        }
      } else {
        // time mode
        const endAt = Date.now() + repsTimeSec * 1000;
        let rep = 0;
        while (Date.now() < endAt) {
          if (stopFlag.current) break;
          while (pauseRef.current) await sleep(100);
          rep++;
          setCurrentRep(rep);
          setStimulus(nextStimulus());
          playBeep();
          await sleep(durationMs);
          setStimulus(null);
          await sleep(intervalMs);
        }
      }

      if (setIdx < sets && !stopFlag.current) {
        setStatus("rest");
        // recovery countdown
        for (let t = restSec; t > 0; t--) {
          setRestCountdown(t);
          await sleep(1000);
          if (stopFlag.current) break;
        }
        setStatus("running");
      }
    }

    setStimulus(null);
    setRunning(false);
    setPaused(false);
    setStatus("finished");
    setCurrentRep(0);
    await exitFullscreen();
  };

  const handleStart = () => {
    if (running) return;
    runSession();
  };

  const handleStop = async () => {
    stopFlag.current = true;
    setRunning(false);
    setPaused(false);
    setStatus("idle");
    setStimulus(null);
    setCurrentRep(0);
    await exitFullscreen();
  };

  const handlePauseToggle = () => {
    if (!running) return;
    const nv = !paused;
    setPaused(nv);
    pauseRef.current = nv;
  };

  const progressPerc = useMemo(() => {
    if (status === "running" && repsMode === "count" && totalRepsPerSet) {
      const pctPerSet = 100 / sets;
      const repsPct = (currentRep / totalRepsPerSet) * pctPerSet;
      return clamp((currentSet - 1) * pctPerSet + repsPct, 0, 100);
    }
    return status === "finished" ? 100 : currentSet > 0 ? (currentSet / sets) * 100 : 0;
  }, [status, repsMode, totalRepsPerSet, currentRep, currentSet, sets]);

  // === UI ===
  return (
    <div ref={containerRef} className="w-full h-full p-3 sm:p-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Left column: Controls */}
      <div className="xl:col-span-1 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 items-center gap-3">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={(v: Mode) => setMode(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stroop">Stroop</SelectItem>
                    <SelectItem value="numbers">Chiffres</SelectItem>
                    <SelectItem value="color">Couleur</SelectItem>
                    <SelectItem value="directions">Directions</SelectItem>
                    <SelectItem value="numberColor">Chiffre + Couleur</SelectItem>
                    <SelectItem value="directionColor">Direction + Couleur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <NumberInput label="Durée d'apparition" value={durationMs} setValue={setDurationMs} min={50} max={10000} step={10} suffix="ms" />
              <NumberInput label="Intervalle entre apparitions" value={intervalMs} setValue={setIntervalMs} min={0} max={20000} step={10} suffix="ms" />
              <NumberInput label="Nombre de sets" value={sets} setValue={setSets} min={1} max={20} step={1} />

              <div className="grid grid-cols-2 items-center gap-3">
                <Label>Répétitions</Label>
                <Select value={repsMode} onValueChange={(v: any) => setRepsMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Par nombre</SelectItem>
                    <SelectItem value="time">Par durée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {repsMode === "count" ? (
                <NumberInput label="Nombre d'apparitions" value={repsCount} setValue={setRepsCount} min={1} max={2000} step={1} />
              ) : (
                <NumberInput label="Durée d'un set" value={repsTimeSec} setValue={setRepsTimeSec} min={5} max={3600} step={1} suffix="sec" />
              )}

              <NumberInput label="Récupération" value={restSec} setValue={setRestSec} min={0} max={600} step={1} suffix="sec" />

              <div className="grid grid-cols-2 items-center gap-3">
                <Label>Police (taille relative)</Label>
                <div className="px-2">
                  <Slider
                    value={[fontScale]}
                    onValueChange={(v) => setFontScale(v[0])}
                    min={0.5}
                    max={2.0}
                    step={0.05}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 items-center gap-3">
                <Label>Beep audio</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={beep} onCheckedChange={setBeep} />
                  {beep ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
              </div>
              {beep && (
                <div className="grid grid-cols-2 gap-3">
                  <NumberInput label="Fréquence" value={beepFreq} setValue={setBeepFreq} min={100} max={4000} step={10} suffix="Hz" />
                  <NumberInput label="Durée du beep" value={beepDurMs} setValue={setBeepDurMs} min={20} max={500} step={5} suffix="ms" />
                </div>
              )}

              <div className="grid grid-cols-2 items-center gap-3">
                <Label>Plein écran à la lecture</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={wantFullscreen} onCheckedChange={setWantFullscreen} />
                  {wantFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mode-specific selectors */}
        {mode === "stroop" && (
          <ColorMultiPicker title="Couleurs (pour le texte et les mots)" selected={stroopColors} onChange={setStroopColors} allowAddHex />
        )}

        {mode === "numbers" && (
          <div className="space-y-4">
            <ColorMultiPicker title="Couleurs du chiffre" selected={digitColors} onChange={setDigitColors} allowAddHex />
            <ChipsToggle<number>
              title="Sélection des chiffres"
              options={DIGITS}
              selected={digits}
              onChange={setDigits}
            />
          </div>
        )}

        {mode === "color" && (
          <ColorMultiPicker title="Couleurs à afficher" selected={onlyColors} onChange={setOnlyColors} allowAddHex />
        )}

        {mode === "directions" && (
          <ChipsToggle<string>
            title="Directions disponibles"
            options={DIRECTIONS.map((d) => d.char)}
            selected={dirs}
            onChange={setDirs}
            render={(c) => <span className="text-lg">{c}</span>}
          />
        )}

        {mode === "numberColor" && (
          <div className="space-y-4">
            <ColorMultiPicker title="Couleurs de fond" selected={bgColors} onChange={setBgColors} allowAddHex />
            <ColorMultiPicker title="Couleurs du chiffre" selected={fgColors} onChange={setFgColors} allowAddHex />
            <ChipsToggle<number> title="Chiffres" options={DIGITS} selected={digits} onChange={setDigits} />
          </div>
        )}

        {mode === "directionColor" && (
          <div className="space-y-4">
            <ColorMultiPicker title="Couleurs de fond" selected={bgColors} onChange={setBgColors} allowAddHex />
            <ColorMultiPicker title="Couleurs de la flèche" selected={fgColors} onChange={setFgColors} allowAddHex />
            <ChipsToggle<string>
              title="Directions"
              options={DIRECTIONS.map((d) => d.char)}
              selected={dirs}
              onChange={setDirs}
              render={(c) => <span className="text-lg">{c}</span>}
            />
          </div>
        )}
      </div>

      {/* Right column: Preview/Player */}
      <div className="xl:col-span-2 grid grid-rows-[auto,1fr,auto] gap-4">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Aire de stimulus</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={paused ? "secondary" : "default"} onClick={handlePauseToggle} disabled={!running}>
                  {paused ? (
                    <>
                      <Play className="w-4 h-4 mr-1" /> Reprendre
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-1" /> Pause
                    </>
                  )}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleStop} disabled={!running}>
                  <Square className="w-4 h-4 mr-1" /> Stop
                </Button>
                <Button size="sm" onClick={handleStart} disabled={running}>
                  <Play className="w-4 h-4 mr-1" /> Démarrer
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="relative w-full h-[55vh] sm:h-[60vh] md:h-[65vh] lg:h-[70vh] xl:h-[72vh] rounded-2xl border bg-muted flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: stimulus?.bgColor ?? undefined }}
            >
              {/* Blank stage grid for alignment */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] [background-size:16px_16px]" />
              {stimulus ? (
                stimulus.kind === "block" ? (
                  <div className="w-full h-full" />
                ) : (
                  <div
                    className="font-bold select-none text-center"
                    style={{
                      color: stimulus.textColor || "#111827",
                      fontSize: `${Math.round(fontScale * 12)}vw`,
                      lineHeight: 1,
                      textShadow: "0 2px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    {stimulus.content}
                  </div>
                )
              ) : (
                <div className="text-muted-foreground text-sm">En attente…</div>
              )}

              {/* Status badges */}
              <div className="absolute top-3 left-3 text-xs px-2 py-1 rounded-lg bg-white/70 shadow-sm">
                {status === "running" && <span>Set {currentSet} / {sets} • Rep {currentRep}{repsMode === "count" ? `/${repsCount}` : ""}</span>}
                {status === "rest" && <span>Récupération : {restCountdown}s</span>}
                {status === "finished" && <span>Terminé</span>}
                {status === "idle" && <span>Prêt</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="tabular-nums">{Math.round(progressPerc)}%</span>
          </div>
          <Progress value={progressPerc} />
        </div>

        <Card>
          <CardContent className="pt-4">
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Le stimulus reste affiché pendant la <strong>"Durée d'apparition"</strong>, puis l'écran est vide pendant l'<strong>"Intervalle"</strong>.</li>
              <li>Le mode <strong>Par nombre</strong> exécute un nombre d'apparitions fixe par set. Le mode <strong>Par durée</strong> répète jusqu'à la fin du temps indiqué.</li>
              <li>Activez <strong>"Plein écran"</strong> pour l'entraînement en mobilité (smartphone/tablette).</li>
              <li>Le <strong>bip</strong> utilise l'API Web Audio (déclenché au clic sur Démarrer pour respecter les règles des navigateurs).</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
