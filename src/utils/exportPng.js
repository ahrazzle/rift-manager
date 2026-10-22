// Captures a rendered card node and triggers a PNG download.
// elementRef: React ref object pointing at the card DOM node.
// filename: e.g. 'lck-standings.png' (extension added if missing).
// Returns Promise<void>; throws on capture failure (caller shows hint).
export async function exportPng(elementRef, filename) {
  const node = elementRef?.current;
  if (!node) throw new Error('Nothing to export yet');
  const { default: html2canvas } = await import('html2canvas');
  const name = filename.endsWith('.png') ? filename : `${filename}.png`;
  const canvas = await html2canvas(node, { backgroundColor: '#10141b', scale: 2 });
  const a = document.createElement('a');
  a.download = name;
  a.href = canvas.toDataURL('image/png');
  a.click();
}
