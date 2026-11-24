export async function prepareImage(file) {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return file;
  let bitmap;
  try {
    if (typeof createImageBitmap === 'function') bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    else {
      const source = URL.createObjectURL(file);
      try { bitmap = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source; }); }
      finally { URL.revokeObjectURL(source); }
    }
  }
  catch { throw new Error('This phone image format cannot be read here. Export it as JPEG or choose a PDF/image from Files.'); }
  const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob || blob.size > 5 * 1024 * 1024) throw new Error('This image is still larger than 5 MB. Choose a smaller image.');
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

