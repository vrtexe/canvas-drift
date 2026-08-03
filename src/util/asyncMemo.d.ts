import { type DependencyList } from 'react';
export declare function useAsyncMemo<T>(asyncFn: () => Promise<T>, dependencies: DependencyList): T | null;
