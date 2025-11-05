import type { CollaborationParams, SocketRequest } from '../types/service-types.js';
import type { SuperDocCollaboration } from './collaboration.js';

export const generateParams = (request: SocketRequest, instance?: SuperDocCollaboration): CollaborationParams => {
  const params = request.params ?? {};
  const { documentId, ...rest } = params;
  if (!documentId) {
    throw new Error('Collaboration request missing required "documentId" param');
  }

  const queryString = request.url.split('?')[1] || '';
  const queryParams = Object.fromEntries(new URLSearchParams(queryString)) as Record<string, string>;

  const cookies = parseCookie(request.headers?.cookie);
  const headers = request.headers || {};
  const connection: Record<string, unknown> = {};

  return {
    documentId,
    cookies,
    instance,
    headers,
    connection,
    params: { ...rest, ...queryParams },
  };
};

export function parseCookie(rawCookie?: string): Record<string, string> {
  if (!rawCookie) {
    return {};
  }

  return rawCookie
    .split(';')
    .map((pair) => pair.trim())
    .reduce<Record<string, string>>((cookies, pair) => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx < 0) return cookies;
      const name = pair.slice(0, eqIdx).trim();
      let value = pair.slice(eqIdx + 1).trim();

      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      try {
        value = decodeURIComponent(value);
      } catch {
        // ignore malformed sequences
      }
      cookies[name] = value;
      return cookies;
    }, {});
}
