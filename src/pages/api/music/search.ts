import type { APIRoute } from 'astro';
import { getNetEasePlayableUrl, searchNetEaseSongs } from '../../../lib/netease';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const parseLimit = (value: string | null) => {
  const limit = Number(value);
  if (!Number.isFinite(limit)) return 10;
  return Math.min(20, Math.max(1, Math.trunc(limit)));
};

export const GET: APIRoute = async ({ url }) => {
  const query = (url.searchParams.get('q') || '').trim();
  const id = (url.searchParams.get('id') || '').trim();
  const limit = parseLimit(url.searchParams.get('limit'));
  const br = /^\d+$/.test(url.searchParams.get('br') || '')
    ? (url.searchParams.get('br') as string)
    : undefined;

  try {
    if (id) {
      if (!/^\d+$/.test(id)) return json({ error: 'Invalid song id' }, 400);
      const playable = await getNetEasePlayableUrl(id, br);
      if (!playable.url) {
        return json({
          provider: 'netease',
          id,
          playable: false,
          url: '',
          reason: playable.message || '版权或会员限制，暂时无法在线播放',
          code: playable.code,
        });
      }
      return json({
        provider: 'netease',
        id,
        playable: true,
        url: playable.url,
        br: playable.br,
        level: playable.level,
        encodeType: playable.encodeType,
        vipAuthed: playable.vipAuthed,
      });
    }

    if (query.length < 2) return json({ error: 'Search query must be at least 2 characters' }, 400);
    const results = await searchNetEaseSongs(query, limit);
    return json({ provider: 'netease', query, results });
  } catch (error) {
    return json(
      {
        error: 'Music provider request failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      502,
    );
  }
};
