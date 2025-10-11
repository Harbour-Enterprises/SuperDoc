export async function loadPresetDefinitions() {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const response = await fetch(new URL('../definitions/presetShapeDefinitions.xml', import.meta.url), {
      headers: {
        Accept: 'application/xml,text/xml,text/plain',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to load XML (${response.status})`);
    }
    return response.text();
  }
  throw new Error('Unsupported environment: fetch is not available.');
}
