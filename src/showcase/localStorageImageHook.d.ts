export default function useLocalStorage<T extends ImageBitmap | null>(key: string, initialValue: T): readonly [T, (value: T) => void];
