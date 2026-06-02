// Image compression Web Worker
// Uses OffscreenCanvas when available for non-blocking compression

self.onmessage = async function (e) {
  const { imageBitmap, maxWidth, format, quality } = e.data;

  try {
    var blob;

    if (typeof OffscreenCanvas !== 'undefined') {
      var width = imageBitmap.width;
      var height = imageBitmap.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      var canvas = new OffscreenCanvas(width, height);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0, width, height);

      blob = await canvas.convertToBlob({
        type: format || 'image/jpeg',
        quality: quality || 0.85
      });

      imageBitmap.close();
    } else {
      // Fallback: return null so main thread uses inline compression
      self.postMessage({ fallback: true });
      return;
    }

    self.postMessage({ blob: blob, size: blob.size });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'Compression failed',
      fallback: true
    });
  }
};
