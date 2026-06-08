/**
 * Image compression using Web Worker with inline Canvas fallback.
 */

let compressionWorker: Worker | null = null;

function getWorker(): Worker | null {
  if (compressionWorker) return compressionWorker;
  try {
    compressionWorker = new Worker('/workers/image-compressor.worker.js');
    return compressionWorker;
  } catch {
    return null;
  }
}

async function compressImageInline(file: File, maxWidth: number = 1920): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: file.type }));
            } else {
              resolve(file);
            }
          },
          file.type,
          0.85
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function compressImage(file: File, maxWidth: number = 1920): Promise<File> {
  const worker = getWorker();
  if (!worker) {
    return compressImageInline(file, maxWidth);
  }

  try {
    const imageBitmap = await createImageBitmap(file);
    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      const handler = (e: MessageEvent) => {
        worker.removeEventListener('message', handler);
        if (e.data.fallback) {
          resolve(null);
        } else {
          resolve(e.data.blob);
        }
      };
      worker.addEventListener('message', handler);
      worker.postMessage({ imageBitmap, maxWidth, format: file.type, quality: 0.85 });
    });

    imageBitmap.close();

    if (compressedBlob) {
      return new File([compressedBlob], file.name, { type: file.type });
    }
  } catch {
    // Worker compression failed, fall back to inline
  }

  return compressImageInline(file, maxWidth);
}
