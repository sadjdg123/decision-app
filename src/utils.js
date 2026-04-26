import { STORAGE_KEY, MAX_HISTORY, MAX_WEIGHT, defaultData } from "./constants";

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function clampWeight(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.min(MAX_WEIGHT, Math.round(number)));
}

export function sanitizeItem(item) {
  if (typeof item === "string") {
    const name = item.trim();
    return name ? { name, weight: 1 } : null;
  }

  if (!isPlainObject(item)) return null;

  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (!name) return null;

  return { name, weight: clampWeight(item.weight) };
}

export function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];

  const map = new Map();
  items.forEach((item) => {
    const clean = sanitizeItem(item);
    if (!clean) return;

    const existing = map.get(clean.name);
    if (existing) {
      map.set(clean.name, { name: clean.name, weight: Math.min(MAX_WEIGHT, existing.weight + clean.weight) });
    } else {
      map.set(clean.name, clean);
    }
  });

  return Array.from(map.values());
}

export function sanitizeTemplateMap(value, fallback) {
  if (!isPlainObject(value)) return fallback;

  const entries = Object.entries(value)
    .filter(([name, list]) => typeof name === "string" && name.trim() && Array.isArray(list))
    .map(([name, list]) => [name.trim(), sanitizeItems(list)])
    .filter(([, list]) => list.length > 0);

  return entries.length ? Object.fromEntries(entries) : fallback;
}

export function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => isPlainObject(item) && typeof item.result === "string" && item.result.trim())
    .map((item) => ({
      type: typeof item.type === "string" && item.type.trim() ? item.type.trim() : "记录",
      result: item.result.trim(),
      time: typeof item.time === "string" && item.time.trim() ? item.time : new Date().toISOString()
    }))
    .slice(0, MAX_HISTORY);
}

export function normalizeData(value) {
  return {
    foodTemplates: sanitizeTemplateMap(value?.foodTemplates, defaultData.foodTemplates),
    peopleTemplates: sanitizeTemplateMap(value?.peopleTemplates, defaultData.peopleTemplates),
    history: normalizeHistory(value?.history)
  };
}

export function loadData() {
  if (typeof window === "undefined") return defaultData;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : defaultData;
  } catch {
    return defaultData;
  }
}

export function saveData(data) {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
    return true;
  } catch {
    return false;
  }
}

export function totalWeight(cleanItems) {
  return cleanItems.reduce((sum, item) => sum + item.weight, 0);
}

export function weightedNames(cleanItems) {
  return cleanItems.flatMap((item) => Array(item.weight).fill(item.name));
}

export function pickWeightedIndex(cleanItems, weightTotal = totalWeight(cleanItems)) {
  if (!weightTotal) return -1;

  let cursor = Math.floor(Math.random() * weightTotal);
  for (let index = 0; index < cleanItems.length; index += 1) {
    cursor -= cleanItems[index].weight;
    if (cursor < 0) return index;
  }

  return cleanItems.length - 1;
}

export function pickWeightedName(cleanItems, weightTotal = totalWeight(cleanItems)) {
  const index = pickWeightedIndex(cleanItems, weightTotal);
  return index >= 0 ? cleanItems[index].name : "";
}

export function rollDiceValue() {
  return Math.floor(Math.random() * 6) + 1;
}

export function rollDiceValues(count = 1) {
  return Array.from({ length: count }, () => rollDiceValue());
}

export function mod360(value) {
  return ((value % 360) + 360) % 360;
}

export function getWheelLabelPosition(angleStart, angleSize, radius) {
  const labelAngle = angleStart + angleSize / 2;
  const radians = (labelAngle * Math.PI) / 180;
  const readableAngle = labelAngle > 90 && labelAngle < 270 ? labelAngle + 180 : labelAngle;

  return {
    labelAngle,
    readableAngle,
    x: Math.sin(radians) * radius,
    y: -Math.cos(radians) * radius
  };
}

export function getFinalRotationForTarget(currentRotation, targetCenterAngle) {
  const desiredRotation = mod360(-targetCenterAngle);
  const delta = mod360(desiredRotation - mod360(currentRotation));
  return currentRotation + 1440 + delta;
}

export function triggerVibration(pattern = 25) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

export function formatTime(value) {
  try {
    return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "刚刚";
  }
}

export function getSavedOptionNames() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const foodNames = Object.keys(data?.foodTemplates || {});
    const peopleNames = Object.keys(data?.peopleTemplates || {});
    return [...foodNames, ...peopleNames];
  } catch {
    return [];
  }
}

export function runSelfTests() {
  const sample = sanitizeItems([{ name: "A", weight: 3 }]);
  console.assert(weightedNames(sample).length === 3, "weightedNames should expand weights");
  console.assert(pickWeightedIndex(sample) === 0, "pickWeightedIndex should pick the only item");
  console.assert(pickWeightedName(sample) === "A", "pickWeightedName should pick the only item name");
  console.assert(rollDiceValue() >= 1 && rollDiceValue() <= 6, "rollDiceValue should be from 1 to 6");
  console.assert(mod360(getFinalRotationForTarget(0, 30)) === 330, "target center 30 degrees should align under top pointer");
  console.assert(sanitizeItems([{ name: " A ", weight: 2 }, { name: "A", weight: 3 }])[0].weight === 5, "duplicate item weights should merge");
  console.assert(sanitizeItems([{ name: "A", weight: 99 }])[0].weight === MAX_WEIGHT, "weights should be clamped");
  console.assert(normalizeHistory([{ type: "吃什么", result: " 麦当劳 ", time: "2026-01-01T00:00:00.000Z" }])[0].result === "麦当劳", "history should be normalized");
}
