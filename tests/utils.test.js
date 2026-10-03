import test from "node:test";
import assert from "node:assert/strict";
import { defaultData, MAX_HISTORY, STORAGE_KEY } from "../src/constants.js";
import {
  normalizeData,
  sanitizeItems,
  totalWeight,
  getFinalRotationForTarget,
  mod360,
  pickWeightedIndex,
  rollDiceValues,
  saveData,
  loadData,
  formatTime,
} from "../src/utils.js";

test("blank templates and deletion of the final template survive storage round trips", () => {
  const oldWindow = globalThis.window;
  const memory = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => memory.get(key),
      setItem: (key, value) => memory.set(key, value),
    },
  };
  try {
    const data = {
      foodTemplates: { 新模板: [] },
      peopleTemplates: {},
      history: [],
    };
    assert.equal(saveData(data), true);
    assert.deepEqual(loadData(), data);
    assert.ok(memory.has(STORAGE_KEY));
  } finally {
    globalThis.window = oldWindow;
  }
});

test("missing or malformed data falls back, but intentionally empty maps remain empty", () => {
  assert.deepEqual(
    normalizeData(null).foodTemplates,
    defaultData.foodTemplates,
  );
  assert.deepEqual(
    normalizeData({ foodTemplates: 42 }).foodTemplates,
    defaultData.foodTemplates,
  );
  assert.deepEqual(normalizeData({ foodTemplates: {} }).foodTemplates, {});
});

test("weighted selection follows exact cumulative boundaries", () => {
  const items = [
    { name: "A", weight: 2 },
    { name: "B", weight: 1 },
    { name: "C", weight: 3 },
  ];
  const random = Math.random;
  try {
    for (const [sample, expected] of [
      [0, 0],
      [1.99 / 6, 0],
      [2 / 6, 1],
      [3 / 6, 2],
      [0.9999, 2],
    ]) {
      Math.random = () => sample;
      assert.equal(pickWeightedIndex(items), expected);
    }
    assert.equal(pickWeightedIndex([]), -1);
    Math.random = () => 0;
    assert.deepEqual(rollDiceValues(6), [1, 1, 1, 1, 1, 1]);
    Math.random = () => 0.9999;
    assert.deepEqual(rollDiceValues(6), [6, 6, 6, 6, 6, 6]);
  } finally {
    Math.random = random;
  }
});

test("every weighted segment center aligns with the top pointer across repeated spins", () => {
  const items = sanitizeItems([
    { name: "A", weight: 20 },
    { name: "B", weight: 1 },
    { name: "C", weight: 3 },
  ]);
  const total = totalWeight(items);
  let rotation = 0;
  for (let round = 0; round < 100; round += 1) {
    const index = round % items.length;
    const center =
      ((totalWeight(items.slice(0, index)) + items[index].weight / 2) / total) *
      360;
    const next = getFinalRotationForTarget(rotation, center);
    assert.ok(next >= rotation + 1440);
    const error = mod360(next + center);
    assert.ok(error < 1e-8 || error > 360 - 1e-8);
    rotation = next;
  }
});

test("duplicate options, bad weights and history are normalized", () => {
  assert.deepEqual(
    sanitizeItems([
      { name: " A ", weight: 2 },
      { name: "A", weight: 30 },
      { name: "", weight: 1 },
      { name: "B", weight: -2 },
    ]),
    [
      { name: "A", weight: 20 },
      { name: "B", weight: 1 },
    ],
  );
  const data = normalizeData({
    history: Array.from({ length: 80 }, () => ({
      type: "吃什么",
      result: " A ",
    })),
  });
  assert.equal(data.history.length, MAX_HISTORY);
  assert.equal(data.history[0].result, "A");
  assert.equal(formatTime("broken"), "刚刚");
});

test("storage errors are reported without throwing", () => {
  const oldWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem() {
        throw new Error("denied");
      },
      setItem() {
        throw new Error("full");
      },
    },
  };
  try {
    assert.equal(saveData(defaultData), false);
    assert.deepEqual(loadData(), defaultData);
  } finally {
    globalThis.window = oldWindow;
  }
});
