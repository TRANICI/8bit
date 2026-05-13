export type NetEaseArtist = { name?: string };
export type NetEaseAlbum = { name?: string; picUrl?: string; picId?: number };
export type NetEaseSong = {
  id?: number;
  name?: string;
  duration?: number;
  fee?: number;
  album?: NetEaseAlbum;
  artists?: NetEaseArtist[];
};

export const NETEASE_HEADERS = {
  'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
  referer: 'https://music.163.com/',
  origin: 'https://music.163.com',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
};

const SEARCH_URL = 'https://music.163.com/api/search/get/web?csrf_token=';
const PLAYER_URL = 'https://music.163.com/api/song/enhance/player/url';
const DEFAULT_BR = '320000';
export const NETEASE_REQUEST_TIMEOUT_MS = 8000;

export const getNetEaseCookie = () =>
  (import.meta.env.NETEASE_COOKIE || process.env.NETEASE_COOKIE || '').trim();

const withOptionalCookie = (headers: Record<string, string>) => {
  const cookie = getNetEaseCookie();
  return cookie ? { ...headers, cookie } : headers;
};

export const getNetEaseRequestSignal = (timeoutMs = NETEASE_REQUEST_TIMEOUT_MS) =>
  AbortSignal.timeout(timeoutMs);

const picFromAlbum = (album?: NetEaseAlbum) => {
  if (album?.picUrl) return album.picUrl;
  if (album?.picId) return `https://p1.music.126.net/${album.picId}.jpg`;
  return '';
};

const normalizeSong = (song: NetEaseSong) => ({
  provider: 'netease',
  id: String(song.id ?? ''),
  title: song.name ?? 'Untitled',
  artist: song.artists?.map((artist) => artist.name).filter(Boolean).join(' / ') || 'Unknown artist',
  album: song.album?.name ?? '',
  duration: song.duration ?? 0,
  artwork: picFromAlbum(song.album),
  playable: song.fee === 0 || song.fee === 8,
});

export async function searchNetEaseSongs(query: string, limit: number) {
  const body = new URLSearchParams({
    s: query,
    type: '1',
    limit: String(limit),
    offset: '0',
  });
  const response = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: withOptionalCookie(NETEASE_HEADERS),
    body,
    signal: getNetEaseRequestSignal(),
  });
  if (!response.ok) throw new Error(`NetEase search failed with ${response.status}`);
  const data = await response.json();
  const songs = Array.isArray(data?.result?.songs) ? data.result.songs : [];
  return songs.map(normalizeSong).filter((song) => song.id);
}

export async function getNetEasePlayableUrl(id: string, br = DEFAULT_BR) {
  const params = new URLSearchParams({
    id,
    ids: JSON.stringify([Number(id)]),
    br,
  });
  const response = await fetch(`${PLAYER_URL}?${params}`, {
    headers: withOptionalCookie(NETEASE_HEADERS),
    signal: getNetEaseRequestSignal(),
  });
  if (!response.ok) throw new Error(`NetEase player url failed with ${response.status}`);
  const data = await response.json();
  const item = Array.isArray(data?.data) ? data.data[0] : null;
  return {
    url: item?.url || '',
    code: item?.code ?? 0,
    br: item?.br ?? 0,
    message: item?.message || '',
    level: item?.level || '',
    encodeType: item?.encodeType || '',
    vipAuthed: Boolean(getNetEaseCookie()),
  };
}
