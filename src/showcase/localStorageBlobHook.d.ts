export declare function useLocalStorageBlob<T extends Blob | null | undefined>(key: string, initialValue: T): readonly [T, (value: T) => void];
