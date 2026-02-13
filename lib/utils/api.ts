import { withDebugParams } from '@/lib/utils/debug-client';

export const apiUrl = (path: string) => withDebugParams(path);

export const apiFetch = (path: string, init?: RequestInit) =>
  fetch(apiUrl(path), init);
