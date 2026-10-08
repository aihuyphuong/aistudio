import { createStore, del, get, set } from 'idb-keyval';
import { useEffect, useState } from 'react';
import { uid } from './id';

// File nhị phân (audio, ảnh, video) lưu trong IndexedDB; dự án chỉ giữ id.
const store = createStore('aistudio-assets', 'blobs');

export async function putAsset(blob: Blob, id = uid('asset_')): Promise<string> {
  await set(id, blob, store);
  return id;
}

export const getAsset = (id: string) => get<Blob>(id, store);
export const deleteAsset = (id: string) => del(id, store);

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/** Trả về object URL cho asset, tự thu hồi khi đổi id hoặc unmount. */
export function useAssetUrl(id: string | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!id) {
      setUrl(undefined);
      return;
    }
    let objectUrl: string | undefined;
    let cancelled = false;
    getAsset(id).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url;
}

export function mediaDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement(blob.type.startsWith('video') ? 'video' : 'audio');
    const url = URL.createObjectURL(blob);
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(el.duration) ? el.duration : 0);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được thời lượng media'));
    };
    el.src = url;
  });
}

/** Object URL cho nhiều asset cùng lúc (dùng cho trình phát timeline). */
export function useAssetUrls(ids: (string | undefined)[]): Record<string, string> {
  const key = [...new Set(ids.filter((x): x is string => !!x))].sort().join('|');
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const created: string[] = [];
    let cancelled = false;
    Promise.all(
      key
        .split('|')
        .filter(Boolean)
        .map(async (id) => {
          const blob = await getAsset(id);
          if (!blob) return null;
          const url = URL.createObjectURL(blob);
          created.push(url);
          return [id, url] as const;
        }),
    ).then((pairs) => {
      if (!cancelled) setUrls(Object.fromEntries(pairs.filter((p) => !!p)));
    });
    return () => {
      cancelled = true;
      created.forEach(URL.revokeObjectURL);
    };
  }, [key]);
  return urls;
}
