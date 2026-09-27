import { describe, expect, it } from "vitest";
import { moveItem, removeItem } from "./reorder";

describe("moveItem", () => {
  it("preserves the initial order when never moved", () => {
    const items = ["a", "b", "c"];
    expect(items).toEqual(["a", "b", "c"]);
  });

  it("moves an item up (toward index 0)", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
  });

  it("moves an item down (toward the end)", () => {
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("is a no-op when moving the first item up", () => {
    const items = ["a", "b", "c"];
    expect(moveItem(items, 0, -1)).toBe(items);
  });

  it("is a no-op when moving the last item down", () => {
    const items = ["a", "b", "c"];
    expect(moveItem(items, 2, 1)).toBe(items);
  });

  it("does not mutate the original array", () => {
    const items = ["a", "b", "c"];
    moveItem(items, 0, 1);
    expect(items).toEqual(["a", "b", "c"]);
  });

  it("moves items correctly by index even with duplicate values", () => {
    const items = ["track.mp3", "track.mp3", "other.mp3"];
    expect(moveItem(items, 0, 1)).toEqual(["track.mp3", "track.mp3", "other.mp3"]);
    // Confirm it's actually the object at index 0 that moved, not "the first match of the value" —
    // use distinct-but-equal-looking objects to prove index (not identity/value) drives the move.
    const a = { name: "track.mp3", id: 1 };
    const b = { name: "track.mp3", id: 2 };
    const moved = moveItem([a, b], 0, 1);
    expect(moved).toEqual([b, a]);
    expect(moved[0]).toBe(b);
    expect(moved[1]).toBe(a);
  });
});

describe("removeItem", () => {
  it("removes the item at the given index", () => {
    expect(removeItem(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });

  it("removing after a reorder still targets the correct (moved) item", () => {
    const reordered = moveItem(["a", "b", "c"], 0, 1); // -> ["b", "a", "c"]
    expect(removeItem(reordered, 0)).toEqual(["a", "c"]);
  });

  it("is a no-op for an out-of-range index", () => {
    const items = ["a", "b"];
    expect(removeItem(items, 5)).toBe(items);
    expect(removeItem(items, -1)).toBe(items);
  });

  it("does not mutate the original array", () => {
    const items = ["a", "b", "c"];
    removeItem(items, 1);
    expect(items).toEqual(["a", "b", "c"]);
  });

  it("removes correctly by index when items have duplicate values", () => {
    const items = ["dup.wav", "dup.wav", "unique.wav"];
    expect(removeItem(items, 0)).toEqual(["dup.wav", "unique.wav"]);
    expect(removeItem(items, 1)).toEqual(["dup.wav", "unique.wav"]);
  });
});
