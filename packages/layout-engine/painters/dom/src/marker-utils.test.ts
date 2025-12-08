import { describe, it, expect } from 'vitest';
import { calculateMarkerLeftPosition } from './marker-utils.js';

describe('calculateMarkerLeftPosition', () => {
  it('calculates position for standard hanging indent', () => {
    // Standard list: left=48, firstLine=0, hanging=48
    // Text starts at: 48 + (0 - 48) = 0px from border edge
    // Marker width: 24px
    // Marker should start at: 0 - 24 = -24px
    const indent = { left: 48, firstLine: 0, hanging: 48 };
    const markerWidth = 24;
    const position = calculateMarkerLeftPosition(indent, markerWidth);
    expect(position).toBe(-24);
  });

  it('calculates position for hanging indent at level 1', () => {
    // Level 1 list: left=96, firstLine=0, hanging=96
    // Text starts at: 96 + (0 - 96) = 0px from border edge
    // Marker width: 24px
    // Marker should start at: 0 - 24 = -24px
    const indent = { left: 96, firstLine: 0, hanging: 96 };
    const markerWidth = 24;
    const position = calculateMarkerLeftPosition(indent, markerWidth);
    expect(position).toBe(-24);
  });

  it('handles first line indent with hanging', () => {
    // List with first line indent: left=48, firstLine=24, hanging=48
    // Text starts at: 48 + (24 - 48) = 24px from border edge
    // Marker width: 24px
    // Marker should start at: 24 - 24 = 0px
    const indent = { left: 48, firstLine: 24, hanging: 48 };
    const markerWidth = 24;
    const position = calculateMarkerLeftPosition(indent, markerWidth);
    expect(position).toBe(0);
  });

  it('handles missing indent values', () => {
    // No indent specified - all values default to 0
    // Text starts at: 0 + (0 - 0) = 0px from border edge
    // Marker width: 24px
    // Marker should start at: 0 - 24 = -24px
    const indent = {};
    const markerWidth = 24;
    const position = calculateMarkerLeftPosition(indent, markerWidth);
    expect(position).toBe(-24);
  });

  it('handles undefined indent', () => {
    // Undefined indent - all values default to 0
    // Marker should start at: 0 - 24 = -24px
    const markerWidth = 24;
    const position = calculateMarkerLeftPosition(undefined, markerWidth);
    expect(position).toBe(-24);
  });

  it('handles partial indent properties', () => {
    // Only left specified: left=48
    // Text starts at: 48 + (0 - 0) = 48px from border edge
    // Marker width: 24px
    // Marker should start at: 48 - 24 = 24px
    const indent = { left: 48 };
    const markerWidth = 24;
    const position = calculateMarkerLeftPosition(indent, markerWidth);
    expect(position).toBe(24);
  });

  it('handles zero marker width', () => {
    // Standard hanging indent with zero-width marker
    const indent = { left: 48, firstLine: 0, hanging: 48 };
    const markerWidth = 0;
    const position = calculateMarkerLeftPosition(indent, markerWidth);
    expect(position).toBe(0);
  });

  it('handles larger marker widths', () => {
    // Standard hanging indent with larger marker
    // Text starts at: 48 + (0 - 48) = 0px from border edge
    // Marker width: 48px
    // Marker should start at: 0 - 48 = -48px
    const indent = { left: 48, firstLine: 0, hanging: 48 };
    const markerWidth = 48;
    const position = calculateMarkerLeftPosition(indent, markerWidth);
    expect(position).toBe(-48);
  });

  it('calculates correctly for nested list levels', () => {
    // Level 2 list: left=144, firstLine=0, hanging=144
    // Text starts at: 144 + (0 - 144) = 0px from border edge
    // Marker width: 24px
    // Marker should start at: 0 - 24 = -24px
    const indent = { left: 144, firstLine: 0, hanging: 144 };
    const markerWidth = 24;
    const position = calculateMarkerLeftPosition(indent, markerWidth);
    expect(position).toBe(-24);
  });

  it('handles positive textIndent scenarios', () => {
    // firstLine > hanging: left=48, firstLine=60, hanging=48
    // Text starts at: 48 + (60 - 48) = 60px from border edge
    // Marker width: 24px
    // Marker should start at: 60 - 24 = 36px
    const indent = { left: 48, firstLine: 60, hanging: 48 };
    const markerWidth = 24;
    const position = calculateMarkerLeftPosition(indent, markerWidth);
    expect(position).toBe(36);
  });
});
