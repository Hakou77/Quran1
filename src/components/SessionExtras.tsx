import { useEffect, useState } from 'react';
import {
  ArrowLeft, BookOpen, Check, CircleHelp, Flame, Moon, RefreshCw, Sparkles, Sun, Zap,
} from 'lucide-react';
import {
  ar, READ_GAP_MS, readingAnalytics, thumnLabelShort,
  type DailyPlan, type DayRecord, type Difficulty, type TrackerState,
} from '../lib/tracker';
import { HIZBS, SURAHS, fromThumnId, hizbLabel, hizbPageSpan, mushafHizbToPath, pathHizbToMushaf, thumnId, toAr, RIWAYAH } from '../data/quran';

const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'easy', label: 'سهل', hint: 'معروف، أتقنته' },
  { id: 'medium', label: 'متوسط', hint: 'يحتاج تثبيتًا' },
  { id: 'hard', label: 'صعب', hint: 'متشابهات أو جديد' },
];

export function TimeMark({ label }: { label: string }) {
  return (
    <div className="time-mark" aria-hidden="true">
      <span>{label}</span>
    </div>
  );
}

export function ReadsCounter({
  record, required, onRead, onDifficulty, blockedHint,
}: {
  record: DayRecord;
  required: number;
  onRead: () => void;
  onDifficulty: (d: Difficulty) => void;
  blockedHint: string | null;
}) {
  const reads = record.reads;
  const quality = reads - required;
  return (
    <div className="reads-block">
      <div className="reads-header">
        <span className="reads-title"><BookOpen size={15} /> اقرأه من المصحف بتمعن</span>
        <span className="reads-progress">{ar(reads)} / {ar(required)} <small>قراءات مطلوبة</small></span>
      </div>
      <div className="reads-difficulty" role="radiogroup" aria-label="صعوبة الثمن">
        {DIFFICULTIES.map(d => (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={record.difficulty === d.id}
            className={`diff-chip ${record.difficulty === d.id ? 'selected' : ''}`}
            onClick={() => onDifficulty(d.id)}
          >
            <strong>{d.label}</strong>
            <small>{d.hint}</small>
          </button>
        ))}
      </div>
      <div className="reads-counter">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            className={`read-dot ${n <= reads ? 'filled' : ''} ${n === reads + 1 ? 'next' : ''}`}
            onClick={onRead}
            disabled={n <= reads}
            aria-label={`القراءة ${ar(n)}`}
          >
            {n <= reads ? <Check size={14} /> : ar(n)}
          </button>
        ))}
      </div>
      <p className="reads-hint">
        {blockedHint
          ? blockedHint
          : reads < required
            ? 'اقرأ بتمعن وتجويد، لا نقراً سريعاً — كل قراءة تخدم التسميع الغيبي.'
            : quality <= 0
              ? 'وصلت للحد الأدنى. قراءة زائدة تشتري أمان الغد.'
              : `إتقان راسخ: زائدة ${ar(quality)} عن المطلوب.`}
      </p>
      <div className="science-note">
        <Sparkles size={14} />
        <span>٣ قراءات مركّزة + تسميع بعد الفجر + تسميع قبل النوم = ٣ تلامسات متباعدة — هذا ما يقيسه النظام.</span>
      </div>
    </div>
  );
}

export function YesterdayErrors({
  value, onPick,
}: {
  value: 0 | 1 | 2 | null;
  onPick: (errors: 0 | 1 | 2) => void;
}) {
  const options: { v: 0 | 1 | 2; label: string; danger?: boolean }[] = [
    { v: 0, label: 'بلا خطأ' },
    { v: 1, label: 'خطأ / اثنان' },
    { v: 2, label: 'أكثر', danger: true },
  ];
  return (
    <div className="error-counter">
      <div>
        <strong>كيف كان التسميع؟</strong>
        <span>عدد مرات التوقف أو الخطأ</span>
      </div>
      <div className="error-options">
        {options.map(o => (
          <button
            key={o.v}
            type="button"
            className={`${value === o.v ? 'selected' : ''} ${o.danger && value === o.v ? 'danger' : ''}`}
            onClick={() => onPick(o.v)}
            aria-pressed={value === o.v}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function NearGrid({
  plan, record, onCycle, onMarkAll,
}: {
  plan: DailyPlan;
  record: DayRecord;
  onCycle: (id: number) => void;
  onMarkAll: () => void;
}) {
  const hizbs = [...new Set(plan.nearThumns.map(id => fromThumnId(id).hizb))];
  const marked = plan.nearThumns.filter(id => record.nearMarks[id]).length;
  const allDone = plan.nearThumns.length > 0 && marked === plan.nearThumns.length;
  if (!plan.nearThumns.length) {
    return <p className="reads-hint">لا مراجعة قريبة بعد أول حزب مكتمل.</p>;
  }
  return (
    <div className="near-grid-block">
      <div className="near-grid-header">
        <div>
          <span className="reads-title"><RefreshCw size={15} /> اضغط للتسميع — ثانية لموضع ضعيف</span>
          <p>{ar(marked)} / {ar(plan.nearThumns.length)} ثمن</p>
        </div>
        <button type="button" className="text-button" onClick={onMarkAll}>
          {allDone ? 'إلغاء الكل' : 'تمّت كل الأثمان'}
        </button>
      </div>
      <div className="near-hizb-groups">
        {hizbs.map(h => (
          <div key={h} className="near-hizb-group">
            <div className="near-hizb-label">
              <strong>الحزب {ar(h)}</strong>
              <small>{hizbLabel(h)}</small>
            </div>
            <div className="near-thumns">
              {Array.from({ length: 8 }, (_, i) => i + 1).map(t => {
                const id = thumnId(h, t);
                const included = plan.nearThumns.includes(id);
                const mark = record.nearMarks[id];
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!included}
                    onClick={() => included && onCycle(id)}
                    className={`thumn-cell ${!included ? 'off' : ''} ${mark === 'done' ? 'done' : ''} ${mark === 'weak' ? 'weak' : ''}`}
                    aria-label={`${thumnLabelShort(id)}${mark ? ` — ${mark === 'done' ? 'تم' : 'ضعيف'}` : ''}`}
                  >
                    {toAr(t)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="near-legend">
        <span><i className="dot done" /> تمّ التسميع</span>
        <span><i className="dot weak" /> موضع ضعيف — يعود غدًا في ورد إضافي</span>
      </div>
    </div>
  );
}

export function WeakExtraCard({
  plan, onClear,
}: {
  plan: DailyPlan;
  onClear: (unit: number) => void;
}) {
  if (!plan.weakExtra.length) return null;
  return (
    <section className="weak-extra-card" aria-label="ورد إضافي">
      <div className="weak-extra-head">
        <span className="weak-kicker"><Flame size={14} /> ورد إضافي</span>
        <p>المواضع التي تكررت فيها الأخطاء — مرة إضافية اليوم.</p>
      </div>
      <div className="weak-chips">
        {plan.weakExtra.map(id => (
          <button key={id} type="button" className="weak-chip" onClick={() => onClear(id)}>
            <span>{thumnLabelShort(id)}</span>
            <Check size={13} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function CycleBar({ plan }: { plan: DailyPlan }) {
  if (plan.cycleLength <= 1 && !plan.cycleWarn) return null;
  const filled = plan.cycleDay - 1;
  return (
    <div className="cycle-bar-wrap">
      <div className="cycle-bar-meta">
        <span>الدورة {ar(plan.cycleDay)} / {ar(plan.cycleLength)}</span>
        <span>{ar(plan.stableHizbs)} حزب مستقر</span>
      </div>
      <div className="cycle-bar" role="progressbar" aria-valuemin={1} aria-valuemax={plan.cycleLength} aria-valuenow={plan.cycleDay}>
        {Array.from({ length: plan.cycleLength }, (_, i) => (
          <i key={i} className={i < filled ? 'filled' : i === filled ? 'current' : ''} />
        ))}
      </div>
      {plan.cycleWarn && (
        <p className="cycle-warn"><CircleHelp size={13} /> الدورة {ar(plan.cycleLength)} يومًا — قصّرها برفع مقدار البعيدة.</p>
      )}
    </div>
  );
}

export function FirstDayCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section className="first-day-card">
      <div className="first-day-head">
        <Sparkles size={15} />
        <strong>ترتيب مقترح ليومك</strong>
      </div>
      <ul>
        <li><Sun size={13} /> الفجر: تسميع الأمس ← حفظ الثمن ← تسميعه.</li>
        <li><Zap size={13} /> الضحى: البعيدة من الذاكرة.</li>
        <li><RefreshCw size={13} /> العصر: القريبة.</li>
        <li><Moon size={13} /> قبل النوم: تسميع أخير للثمن.</li>
      </ul>
      <p>التطبيق أداة تتبع — المعيار ثبات القديم.</p>
      <button type="button" className="text-button" onClick={onDismiss}>فهمت، ابدأ <ArrowLeft size={14} /></button>
    </section>
  );
}

export function ReadingStats({ state }: { state: TrackerState }) {
  const a = readingAnalytics(state);
  if (!a.readDays || !a.pairs || a.avgReads === null || a.retention === null) return null;
  const alwaysMin = a.readDays >= 3 && a.avgReads <= 3;
  return (
    <section className="reading-stats">
      <div className="reading-stats-main">
        <span>متوسط قراءاتك {toAr(a.avgReads)}</span>
        <em>×</em>
        <span>نسبة تثبيت اليوم التالي {toAr(a.retention)}٪</span>
      </div>
      {a.advice && <p className="reading-advice">{a.advice}</p>}
      {!a.advice && alwaysMin && (
        <p className="reading-advice muted">تثبيتك يعتمد على الحد الأدنى — راقِب مواضع الضعف المتكررة.</p>
      )}
    </section>
  );
}

export function PathMap({ plan }: { plan: DailyPlan }) {
  const units = plan.units;
  const completed = Math.floor(units / 8);
  const currentPath = Math.min(60, completed + 1);
  const current = pathHizbToMushaf(currentPath);
  const inCurrent = units >= 480 ? 8 : units % 8;
  const distant = new Set(plan.farHizbs);
  const nearHizbs = new Set(plan.nearThumns.map(id => fromThumnId(id).hizb));
  const pages = Math.round(units * 1.25);
  const ajza = (completed / 2).toFixed(1);

  function kindOf(n: number): 'distant' | 'near' | 'current' | 'done' | 'future' {
    const pathIdx = mushafHizbToPath(n);
    if (n === current && units < 480) return 'current';
    if (distant.has(n)) return 'distant';
    if (nearHizbs.has(n)) return 'near';
    if (pathIdx <= completed) return 'done';
    return 'future';
  }

  function eighthsFor(n: number): number {
    const pathIdx = mushafHizbToPath(n);
    if (n === current && units < 480) return inCurrent;
    if (pathIdx <= completed || units >= 480) return 8;
    return 0;
  }

  return (
    <section className="path-map-section">
      <div className="section-heading">
        <h2>المسار</h2>
        <span>رواية {RIWAYAH} · يبدأ من الحزب ٦٠ · ثمانية أثمان في كل حزب</span>
      </div>
      <div className="path-stats">
        <div className="path-stat"><small>محفوظ</small><strong>{ar(units)} ثمن</strong></div>
        <div className="path-stat"><small>نحو</small><strong>{ar(pages)} صفحة</strong></div>
        <div className="path-stat"><small>أجزاء</small><strong>{toAr(ajza)}</strong></div>
      </div>
      <div className="path-legend">
        <span><i className="dot distant" /> بعيدة / مستقرة</span>
        <span><i className="dot near" /> قريبة</span>
        <span><i className="dot current" /> جاري</span>
        <span><i className="dot future" /> لم يُحفظ</span>
      </div>
      <div className="path-juz-list">
        {Array.from({ length: 30 }, (_, j) => 30 - j).map(juz => {
          const a = juz * 2;
          const b = juz * 2 - 1;
          return (
            <div key={juz} className="path-juz">
              <div className="path-juz-head">
                <strong>جزء {toAr(juz)}</strong>
                <span>{SURAHS[HIZBS[b - 1].surah]}</span>
              </div>
              <div className="path-hizbs">
                <HizbCell n={a} kind={kindOf(a)} inCurrent={eighthsFor(a)} />
                <HizbCell n={b} kind={kindOf(b)} inCurrent={eighthsFor(b)} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HizbCell({ n, kind, inCurrent }: { n: number; kind: string; inCurrent: number }) {
  const h = HIZBS[n - 1];
  return (
    <div className={`hizb-cell k-${kind}`}>
      <div className="hizb-cell-top">
        <span>{toAr(n)}</span>
        <small>ص {toAr(h.page)}</small>
      </div>
      <div className="hizb-cell-label">{hizbLabel(n)}</div>
      <div className="hizb-eighths">
        {Array.from({ length: 8 }, (_, i) => {
          const filled = kind === 'current' ? i < inCurrent : kind !== 'future';
          return <i key={i} className={filled ? 'on' : ''} />;
        })}
      </div>
    </div>
  );
}

export function useReadGate(lastReadAt: number | null) {
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(null), 4500);
    return () => window.clearTimeout(t);
  }, [hint]);

  function tryRead(onAllowed: () => void) {
    const now = Date.now();
    if (lastReadAt && now - lastReadAt < READ_GAP_MS) {
      const secs = Math.ceil((READ_GAP_MS - (now - lastReadAt)) / 1000);
      setHint(`اقرأ بتمعن وتجويد، لا نقراً سريعاً — كل قراءة تحتاج ${ar(Math.max(1, Math.ceil(secs / 60)))} دقيقة تمهّد.`);
      return;
    }
    onAllowed();
  }

  return { hint, setHint, tryRead };
}

export function farSpanLabel(plan: DailyPlan): string {
  if (!plan.farHizbs.length) return '';
  const parts = plan.farHizbs.map(h => {
    const span = hizbPageSpan(h);
    if (plan.farHalf === 0) return `ص ${toAr(span.start)}–${toAr(span.end)}`;
    const mid = Math.round((span.start + span.end) / 2);
    return plan.farHalf === 1 ? `ص ${toAr(span.start)}–${toAr(mid)}` : `ص ${toAr(mid + 1)}–${toAr(span.end)}`;
  });
  return parts.join(' · ');
}

