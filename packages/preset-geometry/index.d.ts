export interface PresetShapePath {
  d: string;
  fill: string;
  stroke: string;
}

export interface PresetShape {
  preset: string;
  viewBox: string;
  paths: PresetShapePath[];
}

export interface StyleOverrides {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface GetPresetShapeSvgOptions {
  preset: string;
  styleOverrides?: () => StyleOverrides;
}

export function createPresetShape(presetName: string): PresetShape;
export function getPresetShapeSvg(options: string | GetPresetShapeSvgOptions): string;
export function listPresetNames(): string[];
