/**
 * Runtime style properties applied to a converted SVG path.
 */
interface SvgPathStyle {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fillRule?: string;
    clipRule?: string;
}
/**
 * Complete SVG path definition including its drawing commands.
 */
interface SvgPathDefinition extends SvgPathStyle {
    d: string;
}

interface PresetShape {
    preset: string;
    viewBox: string;
    paths: SvgPathDefinition[];
}
type PresetStyleOverrideInput = SvgPathStyle | SvgPathStyle[] | ((path: SvgPathDefinition, index: number) => SvgPathStyle | null | undefined);
interface PresetShapeOptions {
    preset: string;
    styleOverrides?: PresetStyleOverrideInput;
}
/** Lists the preset names that have been pre-generated. */
declare function listPresetNames(): string[];
/**
 * Produces a pre-generated preset shape.
 * Additional XML parsing and conversion is avoided to keep the bundle small.
 */
declare function createPresetShape(options: PresetShapeOptions): PresetShape;
/** Returns the serialized SVG element for a preset using the same options as `createPresetShape`. */
declare function getPresetShapeSvg(options: PresetShapeOptions): string;

export { PresetShape, PresetShapeOptions, PresetStyleOverrideInput, createPresetShape, getPresetShapeSvg, listPresetNames };
