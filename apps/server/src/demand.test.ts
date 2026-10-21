import { describe, expect, it } from 'vitest';
import { cellSizeForZoom, MAX_AGGREGATION_ZOOM } from './demand.js';

describe('cellSizeForZoom', () => {
  it('halves the cell size with each zoom level', () => {
    expect(cellSizeForZoom(10) / cellSizeForZoom(11)).toBe(2);
  });

  it('stops shrinking past the max aggregation zoom', () => {
    expect(cellSizeForZoom(19)).toBe(cellSizeForZoom(MAX_AGGREGATION_ZOOM));
    expect(cellSizeForZoom(MAX_AGGREGATION_ZOOM) * 111_000).toBeGreaterThan(100);
  });
});
