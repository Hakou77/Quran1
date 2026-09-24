import { HIZBS, THUMNS_PER_HIZB, TOTAL_THUMNS, fromThumnId, hizbPageSpan, mushafHizbToPath, pathHizbToMushaf, thumnPage, type Hizb } from '../data/quran';

export type Page = 'today' | 'plan' | 'history' | 'mistakes';
export type TaskId = 'yesterday' | 'new' | 'near' | 'far' | 'links' | 'recite';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type NearMark = 'done' | 'weak';
export type ThemeName = 'light' | 'dark';

export interface Settings {
  baseHizbs: number;
  baseEighths: number;
  dailyFar: 0.5 | 1 | 2;
  restDay: number;
  restScope: 'half' | 'all';
  startedAt: string;
  reminderEnabled: boolean;
  reminderTime: string;
  theme: ThemeName;
}

export interface DailyPlan {
  date: string;
  units: number;
  currentHizb: number;
  currentEighths: number;
  previousHizb: number;
  stableHizbs: number;
  farHizbs: number[];
  farHalf: 0 | 1 | 2;
  cycleDay: number;
  cycleLength: number;
  dailyFar: number;
  isRest: boolean;
  tasks: TaskId[];
  nearThumns: number[];
  weakExtra: number[];
  estimatedPages: number;
  cycleWarn: boolean;
}

export interface DayRecord {
  plan: DailyPlan;
  completed: TaskId[];
  checks: Record<string, boolean>;
  seconds: number;
  errors: number;
  reads: number;
  difficulty: Difficulty | null;
  requiredReads: number;
  quality: number | null;
  yesterdayErrors: 0 | 1 | 2 | null;
  nearMarks: Record<number, NearMark>;
  lastReadAt: number | null;
  fragile: boolean;
}

export interface Mistake {
  id: string;
  surah: string;
  location: string;
  note: string;
  repeats: number;
  createdAt: string;
  dueAt: string;
  reviewedAt: string | null;
  resolved: boolean;
}

export interface TrackerState {
  version: 1;
  settings: Settings;
  records: Record<string, DayRecord>;
  mistakes: Mistake[];
  weakThumns: number[];
  onboarding: boolean;
}

export const STORAGE_KEY = 'wird-tracker-v1';
export const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const TASK_NAMES: Record<TaskId, string> = {
  yesterday: 'تسميع ثمن الأمس',
  new: 'الحفظ الجديد',
  near: 'المراجعة القريبة',
  far: 'المراجعة البعيدة',
  links: 'ربط البدايات',
  recite: 'التسميع لغيرك',
};

export const READ_GAP_MS = 120_000;

export function ar(value: number) {
  return new Intl.NumberFormat('ar-SA', { numberingSystem: 'arab' }).format(value);
}

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function fromKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

export function addDays(key: string, days: number) {
  const date = fromKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function weekStart(key: string) {
  return addDays(key, -((fromKey(key).getDay() + 1) % 7));
}

export function formatDate(key: string, short = false) {
  return fromKey(key).toLocaleDateString('ar-EG', {
    weekday: short ? undefined : 'long',
    day: 'numeric',
    month: 'long',
    numberingSystem: 'arab',
  });
}

export function hijriDate(key: string) {
  try {
    return fromKey(key).toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'arab',
    });
  } catch {
    return formatDate(key);
  }
}

export function ordinal(number: number) {
  return ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'][number - 1] || ar(number);
}

export function unitLabel(unit: number) {
  const safe = Math.max(1, Math.min(480, unit));
  const { hizb, thumn } = fromThumnId(safe);
  return `الثمن ${ordinal(thumn)} من الحزب ${ordinal(hizb)}`;
}

export function thumnLabelShort(unit: number) {
  const { hizb, thumn } = fromThumnId(unit);
  return `الحزب ${ar(hizb)} · الثمن ${ar(thumn)}`;
}

export function defaultSettings(): Settings {
  return {
    baseHizbs: 0,
    baseEighths: 0,
    dailyFar: 1,
    restDay: 5,
    restScope: 'half',
    startedAt: dateKey(),
    reminderEnabled: false,
    reminderTime: '05:30',
    theme: 'light',
  };
}

export function defaultState(): TrackerState {
  return {
    version: 1,
    settings: defaultSettings(),
    records: {},
    mistakes: [],
    weakThumns: [],
    onboarding: true,
  };
}

export function emptyRecord(plan: DailyPlan): DayRecord {
  return {
    plan,
    completed: [],
    checks: {},
    seconds: 0,
    errors: 0,
    reads: 0,
    difficulty: null,
    requiredReads: 3,
    quality: null,
    yesterdayErrors: null,
    nearMarks: {},
    lastReadAt: null,
    fragile: false,
  };
}

function isRecordShape(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validDate(date: unknown): date is string {
  return typeof date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(fromKey(date).getTime())
    && dateKey(fromKey(date)) === date;
}

function integerInRange(number: unknown, min: number, max: number) {
  return typeof number === 'number' && Number.isInteger(number) && number >= min && number <= max;
}

export function isValidState(value: unknown): value is TrackerState {
  if (!isRecordShape(value)) return false;
  const state = value as TrackerState & Record<string, unknown>;
  if (state.version !== 1 || !isRecordShape(state.settings) || !isRecordShape(state.records) || !Array.isArray(state.mistakes)) return false;
  if (state.weakThumns !== undefined && !Array.isArray(state.weakThumns)) return false;
  if (state.onboarding !== undefined && typeof state.onboarding !== 'boolean') return false;
  const settings = state.settings as Settings;
  if (!integerInRange(settings.baseHizbs, 0, 59) || !integerInRange(settings.baseEighths, 0, 7)) return false;
  if (![0.5, 1, 2].includes(settings.dailyFar) || !integerInRange(settings.restDay, 0, 6)) return false;
  if (!['half', 'all'].includes(settings.restScope) || !validDate(settings.startedAt)) return false;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(settings.reminderTime) || typeof settings.reminderEnabled !== 'boolean') return false;
  if (settings.theme !== undefined && !['light', 'dark'].includes(settings.theme)) return false;
  if (!Object.entries(state.records).every(([key, record]) => {
    if (!validDate(key) || !isRecordShape(record)) return false;
    const rec = record as DayRecord & Record<string, unknown>;
    if (!rec.plan || !isRecordShape(rec.plan) || (rec.plan as DailyPlan).date !== key) return false;
    const plan = rec.plan as DailyPlan;
    if (!Array.isArray(plan.tasks) || plan.tasks.length === 0 || plan.tasks.length > 6) return false;
    if (!Array.isArray(plan.nearThumns) || !Array.isArray(plan.weakExtra)) return false;
    if (!Array.isArray(plan.farHizbs)) return false;
    if (!Array.isArray(rec.completed) || !isRecordShape(rec.checks)) return false;
    if (typeof rec.seconds !== 'number' || rec.seconds < 0) return false;
    if (rec.reads !== undefined && (typeof rec.reads !== 'number' || rec.reads < 0)) return false;
    if (rec.nearMarks !== undefined && !isRecordShape(rec.nearMarks)) return false;
    return true;
  })) return false;
  return state.mistakes.every(mistake => isRecordShape(mistake)
    && typeof (mistake as Mistake).id === 'string'
    && typeof (mistake as Mistake).surah === 'string'
    && typeof (mistake as Mistake).location === 'string'
    && typeof (mistake as Mistake).note === 'string'
    && integerInRange((mistake as Mistake).repeats, 1, 100000)
    && validDate((mistake as Mistake).createdAt)
    && validDate((mistake as Mistake).dueAt)
    && ((mistake as Mistake).reviewedAt === null || validDate((mistake as Mistake).reviewedAt))
    && typeof (mistake as Mistake).resolved === 'boolean');
}

function normalizeRecord(raw: unknown): DayRecord | null {
  if (!isRecordShape(raw) || !isRecordShape(raw.plan)) return null;
  const plan = raw.plan as unknown as DailyPlan;
  const base = emptyRecord(plan);
  const nearMarks: Record<number, NearMark> = {};
  if (isRecordShape(raw.nearMarks)) {
    for (const [k, v] of Object.entries(raw.nearMarks)) {
      if (v === 'done' || v === 'weak') nearMarks[Number(k)] = v;
    }
  }
  return {
    ...base,
    completed: Array.isArray(raw.completed) ? (raw.completed as TaskId[]) : [],
    checks: isRecordShape(raw.checks) ? (raw.checks as Record<string, boolean>) : {},
    seconds: typeof raw.seconds === 'number' && raw.seconds >= 0 ? raw.seconds : 0,
    errors: integerInRange(raw.errors, 0, 3) ? raw.errors as number : 0,
    reads: typeof raw.reads === 'number' && raw.reads >= 0 ? raw.reads : 0,
    difficulty: raw.difficulty === 'easy' || raw.difficulty === 'medium' || raw.difficulty === 'hard' ? raw.difficulty : null,
    requiredReads: integerInRange(raw.requiredReads, 1, 5) ? raw.requiredReads as number : 3,
    quality: typeof raw.quality === 'number' ? raw.quality : null,
    yesterdayErrors: raw.yesterdayErrors === 0 || raw.yesterdayErrors === 1 || raw.yesterdayErrors === 2 ? raw.yesterdayErrors : null,
    nearMarks,
    lastReadAt: typeof raw.lastReadAt === 'number' ? raw.lastReadAt : null,
    fragile: raw.fragile === true,
    plan: { ...plan, nearThumns: Array.isArray(plan.nearThumns) ? plan.nearThumns : [], weakExtra: Array.isArray(plan.weakExtra) ? plan.weakExtra : [], estimatedPages: typeof plan.estimatedPages === 'number' ? plan.estimatedPages : 0, cycleWarn: plan.cycleWarn === true },
  };
}

export function normalizeState(raw: unknown): TrackerState | null {
  if (!isValidState(raw)) return null;
  const state = raw as TrackerState;
  const records: Record<string, DayRecord> = {};
  for (const [key, value] of Object.entries(state.records)) {
    const rec = normalizeRecord(value);
    if (rec) records[key] = rec;
  }
  const hasHistory = Object.values(records).some(rec => rec.completed.length > 0);
  return {
    version: 1,
    settings: { ...defaultSettings(), ...state.settings },
    records,
    mistakes: state.mistakes,
    weakThumns: Array.isArray(state.weakThumns) ? state.weakThumns.filter(n => integerInRange(n, 1, TOTAL_THUMNS)) : [],
    onboarding: state.onboarding ?? !hasHistory,
  };
}

export function loadState(): TrackerState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      const normalized = normalizeState(parsed);
      if (normalized) return normalized;
    }
  } catch {
    // The app remains usable when the browser blocks local storage.
  }
  return defaultState();
}

export function nearThumnsOf(units: number): number[] {
  const completed = Math.floor(units / THUMNS_PER_HIZB);
  const inCurrent = units % THUMNS_PER_HIZB;
  const ids: number[] = [];
  if (completed >= 1) {
    const last = completed;
    for (let t = 1; t <= THUMNS_PER_HIZB; t++) ids.push((last - 1) * THUMNS_PER_HIZB + t);
  }
  if (inCurrent > 0 && completed < 60) {
    const current = completed + 1;
    for (let t = 1; t <= inCurrent; t++) ids.push((current - 1) * THUMNS_PER_HIZB + t);
  }
  return ids.filter(id => id >= 1 && id <= units);
}

export function weakRatioLast7(state: TrackerState, date: string): number {
  let weak = 0;
  let total = 0;
  for (let i = 1; i <= 7; i++) {
    const rec = state.records[addDays(date, -i)];
    if (!rec) continue;
    for (const mark of Object.values(rec.nearMarks)) {
      total++;
      if (mark === 'weak') weak++;
    }
    if (rec.yesterdayErrors !== null && rec.yesterdayErrors > 0) {
      total++;
      weak++;
    }
    if (rec.errors >= 2 && rec.completed.includes('far')) {
      total++;
      weak++;
    }
  }
  return total > 0 ? weak / total : 0;
}

export function requiredReads(state: TrackerState, date: string, difficulty: Difficulty | null): number {
  let required = 3;
  if (difficulty === 'hard') required += 1;
  if (weakRatioLast7(state, date) > 0.3) required += 1;
  return Math.min(5, required);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

export function readingAnalytics(state: TrackerState): {
  avgReads: number | null;
  retention: number | null;
  readDays: number;
  pairs: number;
  advice: string | null;
} {
  const dates = Object.keys(state.records).filter(d => state.records[d].completed.includes('new')).sort();
  let readSum = 0;
  let readDays = 0;
  let pairs = 0;
  let held = 0;
  let minCount = 0;
  for (const date of dates) {
    const rec = state.records[date];
    if (rec.reads > 0) {
      readSum += rec.reads;
      readDays++;
      if (rec.reads <= rec.requiredReads) minCount++;
    }
    const nextKey = addDays(date, 1);
    const next = state.records[nextKey];
    if (next && next.completed.includes('yesterday')) {
      pairs++;
      if (next.yesterdayErrors === 0 || next.yesterdayErrors === null) held++;
    }
  }
  const avgReads = readDays > 0 ? Math.round((readSum / readDays) * 10) / 10 : null;
  const retention = pairs > 0 ? Math.round((held / pairs) * 100) : null;
  const alwaysMin = readDays >= 3 && minCount / readDays >= 0.7;
  const weakCount = state.weakThumns.length;
  let advice: string | null = null;
  if (alwaysMin && (weakCount >= 2 || (retention !== null && retention < 80))) {
    advice = 'جرّب ٤ قراءات هذا الأسبوع — تثبيتك يتعثر على الحد الأدنى وحده.';
  } else if (alwaysMin && avgReads !== null && avgReads <= 3) {
    advice = 'كتلة القراءات عند الحد الأدنى. قراءة زائدة واحدة تشتري أمان الغد.';
  }
  return { avgReads, retention, readDays, pairs, advice };
}

export function estimatePages(plan: { units: number; isRest: boolean; nearThumns: number[]; farHizbs: number[]; farHalf: 0 | 1 | 2; cycleWarn: boolean }): number {
  let p = 0;
  const nextUnit = plan.units + 1;
  if (!plan.isRest && plan.units < 480 && nextUnit <= 480) p += 1.25;
  p += plan.nearThumns.length * 1.25;
  for (const h of plan.farHizbs) {
    const { pages } = hizbPageSpan(h);
    p += plan.farHalf ? Math.max(1, Math.round(pages / 2)) : pages;
  }
  return Math.round(p);
}

function fragileExtraFor(state: TrackerState, date: string, units: number): number[] {
  const struggleRec = state.records[addDays(date, -1)];
  const fragileRec = state.records[addDays(date, -2)];
  if (!struggleRec || !fragileRec) return [];
  if ((struggleRec.yesterdayErrors ?? 0) <= 0) return [];
  if (!fragileRec.fragile || !fragileRec.completed.includes('new')) return [];
  const unit = fragileRec.plan.units + 1;
  return unit >= 1 && unit <= units ? [unit] : [];
}

export function calculatePlan(state: TrackerState, date: string): DailyPlan {
  if (state.records[date]) {
    const stored = state.records[date].plan;
    const yesterdayWeak = collectYesterdayWeakNear(state, date, stored.units);
    const fragile = fragileExtraFor(state, date, stored.units);
    const merged = uniqueUnits([...stored.weakExtra, ...state.weakThumns, ...yesterdayWeak, ...fragile]).filter(id => id >= 1 && id <= stored.units);
    return { ...stored, weakExtra: merged, cycleWarn: cycleWarning(stored.cycleLength, Math.floor(stored.units / 8)) };
  }

  const previous = Object.entries(state.records).filter(([key]) => key < date);
  const newUnits = previous.filter(([, record]) => record.completed.includes('new')).length;
  const units = Math.min(480, state.settings.baseHizbs * 8 + state.settings.baseEighths + newUnits);
  const completedPath = Math.floor(units / 8);
  const currentPath = Math.min(60, completedPath + 1);
  const currentHizb = pathHizbToMushaf(currentPath);
  const currentEighths = units >= 480 ? 8 : units % 8;
  const previousPath = units >= 480 ? 59 : Math.max(1, completedPath);
  const previousHizb = pathHizbToMushaf(previousPath);
  const stableHizbs = Math.max(0, previousPath - 1);
  const isRest = fromKey(date).getDay() === state.settings.restDay;
  const dailyFar = state.settings.dailyFar;
  const cycleLength = Math.max(1, Math.ceil(stableHizbs / dailyFar));

  const reviewed = previous.reduce((sum, [, record]) => {
    return sum + (record.completed.includes('far') && !record.plan.isRest ? record.plan.dailyFar : 0);
  }, 0);
  const offset = stableHizbs ? reviewed % stableHizbs : 0;
  const farHizbs = stableHizbs === 0 ? [] : isRest
    ? Array.from({ length: state.settings.restScope === 'all' ? stableHizbs : Math.ceil(stableHizbs / 2) }, (_, i) => pathHizbToMushaf(i + 1))
    : Array.from({ length: Math.min(stableHizbs, Math.max(1, dailyFar)) }, (_, i) => pathHizbToMushaf(((Math.floor(offset) + i) % stableHizbs) + 1));
  const farHalf = !isRest && dailyFar === 0.5 ? (offset % 1 >= 0.5 ? 2 : 1) : 0;
  const nearThumns = nearThumnsOf(units);
  const hasNear = nearThumns.length > 0;
  const tasks: TaskId[] = isRest
    ? [
        ...(hasNear ? (['near'] as const) : []),
        ...(stableHizbs ? (['far'] as const) : []),
        'links', 'recite',
      ]
    : [
        ...(units < 480 ? ([...(units > 0 ? (['yesterday'] as const) : []), 'new'] as const) : []),
        ...(hasNear ? (['near'] as const) : []),
        ...(stableHizbs ? (['far'] as const) : []),
      ];

  const yesterdayWeak = collectYesterdayWeakNear(state, date, units);
  const weakExtra = uniqueUnits([...state.weakThumns, ...yesterdayWeak, ...fragileExtraFor(state, date, units)]).filter(id => id >= 1 && id <= units);

  const partial: DailyPlan = {
    date, units, currentHizb, currentEighths, previousHizb, stableHizbs,
    farHizbs, farHalf, cycleDay: Math.min(cycleLength, Math.floor(offset / dailyFar) + 1),
    cycleLength, dailyFar, isRest, tasks,
    nearThumns, weakExtra, estimatedPages: 0, cycleWarn: false,
  };
  partial.estimatedPages = estimatePages(partial);
  partial.cycleWarn = cycleWarning(cycleLength, completedPath);
  return partial;
}

function cycleWarning(cycleLength: number, completedHizbs: number): boolean {
  const limit = completedHizbs < 20 ? 14 : 10;
  return cycleLength > limit;
}

function collectYesterdayWeakNear(state: TrackerState, date: string, units: number): number[] {
  const yRec = state.records[addDays(date, -1)];
  if (!yRec) return [];
  return Object.entries(yRec.nearMarks)
    .filter(([, mark]) => mark === 'weak')
    .map(([id]) => Number(id))
    .filter(id => id >= 1 && id <= units);
}

function uniqueUnits(ids: number[]): number[] {
  return [...new Set(ids)];
}

export function farLabel(plan: DailyPlan) {
  if (!plan.farHizbs.length) return 'تبدأ حين يستقر أول حزبين';
  if (plan.farHizbs.length === 1) {
    return `${plan.farHalf ? `النصف ${ordinal(plan.farHalf)} من ` : ''}الحزب ${ordinal(plan.farHizbs[0])}`;
  }
  if (plan.farHizbs.length === 2) {
    return `الحزبان ${ordinal(plan.farHizbs[0])} و${ordinal(plan.farHizbs[1])}`;
  }
  return `الأحزاب من ${ar(plan.farHizbs[0])} إلى ${ar(plan.farHizbs[plan.farHizbs.length - 1])}`;
}

export function nearLabel(plan: DailyPlan) {
  if (!plan.currentEighths) return `الحزب ${ordinal(plan.previousHizb)} كاملًا`;
  return `الحزب ${ordinal(plan.previousHizb)} + محفوظك من ${ordinal(plan.currentHizb)}`;
}

export function isDayComplete(record?: DayRecord) {
  return !!record && record.plan.tasks.every(task => record.completed.includes(task));
}

export function getStreak(state: TrackerState, today: string) {
  let current = isDayComplete(state.records[today]) ? today : addDays(today, -1);
  let streak = 0;
  while (isDayComplete(state.records[current])) {
    streak++;
    current = addDays(current, -1);
  }
  return streak;
}

export function totalUnits(state: TrackerState) {
  return Math.min(480, state.settings.baseHizbs * 8 + state.settings.baseEighths
    + Object.values(state.records).filter(record => record.completed.includes('new')).length);
}

export function dueMistakes(state: TrackerState, date: string) {
  return state.mistakes.filter(mistake => !mistake.resolved && mistake.dueAt <= date && mistake.reviewedAt !== date);
}

export function hasMissedReview(state: TrackerState, date: string) {
  const previous = addDays(date, -1);
  if (previous < state.settings.startedAt) return false;
  const record = state.records[previous];
  if (!record) return true;
  return record.plan.tasks.some(task => (task === 'near' || task === 'far') && !record.completed.includes(task));
}

export function farThumnIds(plan: DailyPlan): number[] {
  const ids: number[] = [];
  for (const h of plan.farHizbs) {
    const base = (mushafHizbToPath(h) - 1) * THUMNS_PER_HIZB;
    if (plan.farHalf === 0) for (let t = 1; t <= 8; t++) ids.push(base + t);
    else if (plan.farHalf === 1) for (let t = 1; t <= 4; t++) ids.push(base + t);
    else for (let t = 5; t <= 8; t++) ids.push(base + t);
  }
  return ids;
}

export function getTaskSteps(task: TaskId, plan: DailyPlan, mistakes: Mistake[]) {
  switch (task) {
    case 'yesterday':
      return [{ id: 'yesterday:recited', text: 'سمّعت ثمن الأمس من الذاكرة', detail: 'سجّل عدد الأخطاء أدناه. خطأ أو اثنان لا يمنعان الإتمام؛ أكثر من ذلك أعد التسميع.' }];
    case 'new':
      return [
        { id: 'new:memorized', text: 'حفظت الثمن وربطت بدايته بما قبله', detail: 'تأنّ في مواضع الانتقال؛ الإتقان قبل السرعة.' },
        { id: 'new:first', text: 'سمّعته من الذاكرة للمرة الأولى', detail: 'بعد الحفظ، من غير نظر إلى المصحف.' },
        { id: 'new:second', text: 'سمّعته للمرة الثانية قبل النوم', detail: 'التسميع قبل النوم يثبّت بالنوم — ثلاث تلامسات متباعدة.' },
      ];
    case 'near':
      return [];
    case 'far':
      return [
        { id: 'far:recited', text: `سمّعت ${farLabel(plan)} من الذاكرة`, detail: 'افتح المصحف عند التوقف فقط، وسجّل موضع التعثر.' },
        ...mistakes.map(mistake => ({ id: `far:mistake:${mistake.id}`, text: `أعدت موضع ${mistake.surah}، ${mistake.location}`, detail: mistake.note || 'مراجعة إضافية لموضع يحتاج تثبيتًا.' })),
      ];
    case 'links':
      return [{ id: 'links:done', text: 'قرأت بدايات الأثمان والسور متتابعة', detail: 'من الذاكرة، اربط نهاية كل ثمن ببداية الثمن الذي يليه.' }];
    case 'recite':
      return [{ id: 'recite:done', text: 'سمّعت لشيخ أو صاحب، أو راجعت تسجيلًا لصوتي', detail: 'استمعت بعناية وسجّلت المواضع التي تحتاج تثبيتًا.' }];
  }
}

export function allNearMarked(plan: DailyPlan, record: DayRecord): boolean {
  return plan.nearThumns.length === 0 || plan.nearThumns.every(id => !!record.nearMarks[id]);
}

export function pathHizbMeta(hizb: number): Hizb {
  return HIZBS[hizb - 1];
}

export function thumnPageOf(unit: number): number {
  return thumnPage(unit);
}

export type { Hizb };
