import { useEffect, useState } from 'react';
import localforage from 'localforage';

async function imageBitmapToBytes(
  imageBitmap: ImageBitmap,
): Promise<{ bytes: ImageDataArray; width: number; height: number }> {
  const { width, height } = imageBitmap;

  // 1. Create an offscreen canvas matching the bitmap dimensions
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 2. Draw the ImageBitmap onto the canvas
  ctx?.drawImage(imageBitmap, 0, 0);

  // 3. Extract the underlying RGBA pixel bytes
  const imageData = ctx?.getImageData(0, 0, width, height);
  return {
    bytes: imageData!.data, // Uint8ClampedArray
    width: width,
    height: height,
  };
}

async function bytesToImageBitmap(
  bytes: Uint8ClampedArray,
  width: number,
  height: number,
) {
  // 1. Wrap the raw Uint8ClampedArray back into ImageData
  const imageData = new ImageData(new Uint8ClampedArray(bytes), width, height);

  // 2. Convert the ImageData into a brand new ImageBitmap
  const imageBitmap = await createImageBitmap(imageData);

  return imageBitmap;
}

export default function useLocalStorage<T extends ImageBitmap | null>(
  key: string,
  initialValue: T,
) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      localforage
        .getItem<{
          bytes: Uint8ClampedArray;
          width: number;
          height: number;
        }>(key)
        .then((item) => {
          if (item) {
            const parsed = item!;
            if (parsed && parsed.bytes && parsed.width && parsed.height) {
              const { bytes, width, height } = parsed;
              bytesToImageBitmap(bytes, width, height).then((bitmap) => {
                setStoredValue(bitmap as T);
              });
            } else {
              setStoredValue(initialValue);
            }
          } else {
            setStoredValue(initialValue);
          }
        });
    } catch (error) {
      console.error(error);
      setStoredValue(initialValue);
    }
  }, []);

  function setValue(value: T) {
    try {
      setStoredValue(value);
      if (value) {
        imageBitmapToBytes(value).then(({ bytes, width, height }) => {
          localforage.setItem(key, { bytes, width, height });
        });
      } else {
        localforage.removeItem(key);
      }
    } catch (error) {
      console.error(error);
    }
  }

  return [storedValue, setValue] as const;
}
