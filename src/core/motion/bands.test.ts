import { describe, expect, it } from 'vitest';
import tuningJson from '../../data/tuning.json';
import { SIM_EPSILON, type BandEdges } from '../types';
import { bandForSpeed } from './bands';
import { paramsFromJson } from './testkit';

const edges = paramsFromJson(tuningJson).colorBandEdges;

describe('bandForSpeed (movement-and-gears check 15)', () => {
  it.each([
    [0, 0],
    [1.49, 0],
    [1.5, 1],
    [4.5, 2],
    [7.49, 2],
    [7.5, 3],
    [10.5, 4],
    [12, 4],
  ])('band(%f) = %i', (speed, band) => {
    expect(bandForSpeed(speed, edges)).toBe(band);
  });

  it('puts every gear speed in its own band', () => {
    expect([0, 3, 6, 9, 12].map((s) => bandForSpeed(s, edges))).toEqual([0, 1, 2, 3, 4]);
  });

  it.each(edges.map((edge, i) => [edge, i]))('edge %f: just below is band %i, on it and above is one higher', (edge, below) => {
    expect(bandForSpeed(edge - 1e-6, edges)).toBe(below);
    expect(bandForSpeed(edge, edges)).toBe(below + 1);
    expect(bandForSpeed(edge + 1e-6, edges)).toBe(below + 1);
  });

  it('counts a speed within SIM_EPSILON below an edge as reaching it (accumulated floats)', () => {
    expect(bandForSpeed(4.5 - SIM_EPSILON / 2, edges)).toBe(2);
    expect(bandForSpeed(4.5 - SIM_EPSILON * 10, edges)).toBe(1);
  });

  it('is above every edge for very high speeds', () => {
    expect(bandForSpeed(1000, edges)).toBe(4);
  });

  it('uses the edges it is given, not the shipped ones', () => {
    const custom: BandEdges = [1, 2, 3, 4];
    expect(bandForSpeed(2.5, custom)).toBe(2);
    expect(bandForSpeed(4, custom)).toBe(4);
  });
});
