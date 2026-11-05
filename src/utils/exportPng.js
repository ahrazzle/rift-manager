// Captures a rendered card node and triggers a PNG download.
// elementRef: React ref object pointing at the card DOM node.
// filename: e.g. 'lck-standings.png' (extension added if missing).
// Returns Promise<void>; throws on capture failure (caller shows hint).
export async function exportPng(elementRef, filename) {
  const node = elementRef?.current;
  if (!node) throw new Error('Nothing to export yet');
  const { default: html2canvas } = await import('html2canvas');
  const name = filename.endsWith('.png') ? filename : `${filename}.png`;
  const canvas = await html2canvas(node, {
    backgroundColor: '#10141b',
    scale: 2,
    onclone: (document, capturedNode) => {
      // Cards enter with `rise` (opacity 0 → 1). Freeze only that entrance
      // on the cloned capture and its ancestors, preserving the live UI.
      for (let element = capturedNode; element; element = element.parentElement) {
        const animations = document.defaultView.getComputedStyle(element).animationName;
        if (animations.split(',').some((name) => name.trim() === 'rise')) {
          element.style.setProperty('animation', 'none', 'important');
          element.style.setProperty('opacity', '1', 'important');
          element.style.setProperty('transform', 'none', 'important');
        }
      }
    },
  });
  // Keep the shared signature in the downloaded image without adding UI to the card.
  const signature = new Image();
  signature.src = `${(import.meta.env?.BASE_URL ?? '/')}brand/rift-manager.svg`;
  let output = canvas;
  try {
    await signature.decode();
    const branded = document.createElement('canvas');
    branded.width = canvas.width;
    branded.height = canvas.height + 144;
    const context = branded.getContext('2d');
    if (!context) throw new Error('Image export unavailable');
    context.fillStyle = '#10141b';
    context.fillRect(0, 0, branded.width, branded.height);
    context.drawImage(canvas, 0, 0);
    context.fillStyle = '#354a62';
    context.fillRect(0, canvas.height, branded.width, 2);
    context.drawImage(signature, 40, canvas.height + 22, 280, 100);
    output = branded;
  } catch {
    // The stats card remains downloadable when the optional signature is unavailable.
  }
  const a = document.createElement('a');
  a.download = name;
  a.href = output.toDataURL('image/png');
  a.click();
}
