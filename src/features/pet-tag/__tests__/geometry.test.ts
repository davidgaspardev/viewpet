import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import { createRoundedRectShape } from "../geometry/createRoundedRectShape";
import { createPetTagGeometry } from "../geometry/createPetTagGeometry";
import { createCircleTagGeometry } from "../geometry/createCircleTagGeometry";
import {
  createTextGeometry,
  createTextFillGeometry,
} from "../geometry/createTextGeometry";

// ─── createRoundedRectShape ──────────────────────────────────────────────────

describe("createRoundedRectShape", () => {
  test("returns a THREE.Shape", () => {
    const shape = createRoundedRectShape(100, 50, 5);
    expect(shape).toBeInstanceOf(THREE.Shape);
  });

  test("shape has curves (not a plain polygon)", () => {
    const shape = createRoundedRectShape(100, 50, 10);
    expect(shape.curves.length).toBeGreaterThan(0);
  });

  test("shape points stay within bounding dimensions", () => {
    const width = 300;
    const height = 100;
    const radius = 20;
    const shape = createRoundedRectShape(width, height, radius);
    const pts = shape.getPoints(32);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(-width / 2 - 0.01);
      expect(p.x).toBeLessThanOrEqual(width / 2 + 0.01);
      expect(p.y).toBeGreaterThanOrEqual(-height / 2 - 0.01);
      expect(p.y).toBeLessThanOrEqual(height / 2 + 0.01);
    }
  });

  test("shape is closed (first and last sampled point are equal)", () => {
    const shape = createRoundedRectShape(200, 80, 10);
    const pts = shape.getPoints(64);
    const first = pts[0];
    const last = pts[pts.length - 1];
    expect(Math.abs(first.x - last.x)).toBeLessThan(0.01);
    expect(Math.abs(first.y - last.y)).toBeLessThan(0.01);
  });

  test("radius=0 produces a plain rectangle shape", () => {
    const shape = createRoundedRectShape(100, 60, 0);
    // Without curves, only line segments — curves array may still include 0-control curves
    const pts = shape.getPoints(16);
    expect(pts.length).toBeGreaterThan(0);
  });
});

// ─── createPetTagGeometry ────────────────────────────────────────────────────

describe("createPetTagGeometry", () => {
  test("returns an ExtrudeGeometry", () => {
    const geo = createPetTagGeometry(300, 100, 20);
    expect(geo).toBeInstanceOf(THREE.ExtrudeGeometry);
  });

  test("has a bounding box that matches the specified width and height", () => {
    const width = 300;
    const height = 100;
    const geo = createPetTagGeometry(width, height, 20);
    geo.computeBoundingBox();
    const { min, max } = geo.boundingBox!;
    const actualWidth = max.x - min.x;
    const actualHeight = max.y - min.y;
    expect(actualWidth).toBeCloseTo(width, 0);
    expect(actualHeight).toBeCloseTo(height, 0);
  });

  test("geometry is centered at origin in XY", () => {
    const geo = createPetTagGeometry(300, 100, 20);
    geo.computeBoundingBox();
    const { min, max } = geo.boundingBox!;
    const centerX = (min.x + max.x) / 2;
    const centerY = (min.y + max.y) / 2;
    expect(Math.abs(centerX)).toBeLessThan(0.1);
    expect(Math.abs(centerY)).toBeLessThan(0.1);
  });

  test("extrudes to depth of 5 units", () => {
    const geo = createPetTagGeometry(300, 100, 20);
    geo.computeBoundingBox();
    const depth = geo.boundingBox!.max.z - geo.boundingBox!.min.z;
    expect(depth).toBeCloseTo(5, 1);
  });

  test("uses default radius without throwing", () => {
    expect(() => createPetTagGeometry(200, 80)).not.toThrow();
  });
});

// ─── createCircleTagGeometry ─────────────────────────────────────────────────

describe("createCircleTagGeometry", () => {
  test("returns an ExtrudeGeometry", () => {
    const geo = createCircleTagGeometry(60);
    expect(geo).toBeInstanceOf(THREE.ExtrudeGeometry);
  });

  test("bounding box width and height equal 2× radius", () => {
    const radius = 60;
    const geo = createCircleTagGeometry(radius);
    geo.computeBoundingBox();
    const { min, max } = geo.boundingBox!;
    const width = max.x - min.x;
    const height = max.y - min.y;
    expect(width).toBeCloseTo(radius * 2, 0);
    expect(height).toBeCloseTo(radius * 2, 0);
  });

  test("geometry is centered at origin in XY", () => {
    const geo = createCircleTagGeometry(50);
    geo.computeBoundingBox();
    const { min, max } = geo.boundingBox!;
    const centerX = (min.x + max.x) / 2;
    const centerY = (min.y + max.y) / 2;
    expect(Math.abs(centerX)).toBeLessThan(0.5);
    expect(Math.abs(centerY)).toBeLessThan(0.5);
  });

  test("extrudes to the specified depth", () => {
    const geo = createCircleTagGeometry(60, 8);
    geo.computeBoundingBox();
    const depth = geo.boundingBox!.max.z - geo.boundingBox!.min.z;
    expect(depth).toBeCloseTo(8, 1);
  });

  test("uses default parameters without throwing", () => {
    expect(() => createCircleTagGeometry()).not.toThrow();
  });
});

// ─── createTextGeometry ──────────────────────────────────────────────────────

describe("createTextGeometry", () => {
  test("returns a BufferGeometry", () => {
    const geo = createTextGeometry("REX");
    expect(geo).toBeInstanceOf(THREE.BufferGeometry);
  });

  test("geometry has vertices", () => {
    const geo = createTextGeometry("REX");
    const position = geo.getAttribute("position");
    expect(position).toBeDefined();
    expect(position.count).toBeGreaterThan(0);
  });

  test("longer text produces wider geometry", () => {
    const short = createTextGeometry("AB");
    const long = createTextGeometry("ABCDEFGH");
    short.computeBoundingBox();
    long.computeBoundingBox();
    const shortWidth = short.boundingBox!.max.x - short.boundingBox!.min.x;
    const longWidth = long.boundingBox!.max.x - long.boundingBox!.min.x;
    expect(longWidth).toBeGreaterThan(shortWidth);
  });

  test("geometry is centered at X=0", () => {
    const geo = createTextGeometry("REX");
    geo.computeBoundingBox();
    const { min, max } = geo.boundingBox!;
    const centerX = (min.x + max.x) / 2;
    expect(Math.abs(centerX)).toBeLessThan(0.5);
  });

  test("larger font size produces taller geometry", () => {
    const small = createTextGeometry("A", 10);
    const large = createTextGeometry("A", 20);
    small.computeBoundingBox();
    large.computeBoundingBox();
    const smallH = small.boundingBox!.max.y - small.boundingBox!.min.y;
    const largeH = large.boundingBox!.max.y - large.boundingBox!.min.y;
    expect(largeH).toBeGreaterThan(smallH);
  });
});

// ─── createTextFillGeometry ──────────────────────────────────────────────────

describe("createTextFillGeometry", () => {
  test("returns a BufferGeometry", () => {
    const geo = createTextFillGeometry("REX");
    expect(geo).toBeInstanceOf(THREE.BufferGeometry);
  });

  test("fill geometry is shallower than cutter geometry", () => {
    const fill = createTextFillGeometry("REX");
    const cutter = createTextGeometry("REX");
    fill.computeBoundingBox();
    cutter.computeBoundingBox();
    const fillDepth =
      fill.boundingBox!.max.z - fill.boundingBox!.min.z;
    const cutterDepth =
      cutter.boundingBox!.max.z - cutter.boundingBox!.min.z;
    expect(fillDepth).toBeLessThan(cutterDepth);
  });

  test("fill geometry Z position is higher than cutter (sits inside engraving)", () => {
    const fill = createTextFillGeometry("REX");
    const cutter = createTextGeometry("REX");
    fill.computeBoundingBox();
    cutter.computeBoundingBox();
    expect(fill.boundingBox!.min.z).toBeGreaterThan(
      cutter.boundingBox!.min.z
    );
  });
});
