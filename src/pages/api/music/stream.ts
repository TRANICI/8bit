import type { APIRoute } from 'astro';
import { getNetEasePlayableUrl, NETEASE_HEADERS, NETEASE_REQUEST_TIMEOUT_MS } from '../../../lib/netease';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const passHeaders = (upstream: Response) => {
  const headers = new Headers();
  const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
  const contentLength = upstream.headers.get('content-length');
  const contentRange = upstream.headers.get('content-range');
  const acceptRanges = upstream.headers.get('accept-ranges') || 'bytes';
  headers.set('content-type', contentType);
  headers.set('accept-ranges', acceptRanges);
  headers.set('cache-control', 'no-store');
  if (contentLength) headers.set('content-length', contentLength);
  if (contentRange) headers.set('content-range', contentRange);
  return headers;
};

export const GET: APIRoute = async ({ request, url }) => {
  const id = (url.searchParams.get('id') || '').trim();
  if (!/^\d+$/.test(id)) return json({ error: 'Invalid song id' }, 400);
  const br = /^\d+$/.test(url.searchParams.get('br') || '')
    ? (url.searchParams.get('br') as string)
    : undefined;

  try {
    const playable = await getNetEasePlayableUrl(id, br);
    if (!playable.url) {
      return json(
        {
          playable: false,
          reason: playable.message || '版权或会员限制，暂时无法在线播放',
          code: playable.code,
        },
        403,
      );
    }

    const { 'content-type': _contentType, ...streamHeaders } = NETEASE_HEADERS;
    const headers: Record<string, string> = {
      ...streamHeaders,
      accept: 'audio/*,*/*;q=0.9',
    };
    const cookie = import.meta.env.NETEASE_COOKIE || process.env.NETEASE_COOKIE || '';
    if (cookie) headers.cookie = cookie;
    const range = request.headers.get('range');
    if (range) headers.range = range;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NETEASE_REQUEST_TIMEOUT_MS);
    let upstream: Response;
    try {
      upstream = await fetch(playable.url, {
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!upstream.ok && upstream.status !== 206) {
      return json({ error: `Upstream audio failed with ${upstream.status}` }, 502);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: passHeaders(upstream),
    });
  } catch (error) {
    return json(
      {
        error: 'Music stream failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      502,
    );
  }
};
