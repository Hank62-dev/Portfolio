import { describe, expect, it } from 'vitest';
import { parseName, tidyName } from './library';

describe('tidyName', () => {
  it('drops hashtags and the video-site trailers from a file name with no tags', () => {
    expect(tidyName('Kold - Hẹn Em Hôm Nay ft. Zane.H, Kemm Đá _ Official Lyric Video.mp3')).toBe('Kold - Hẹn Em Hôm Nay ft. Zane.H, Kemm Đá');
    expect(tidyName('Low G _ In Love (ft. JustaTee) _ ‘L2K’ The Album.mp3')).toBe('Low G - In Love (ft. JustaTee)');
    expect(tidyName('Yêu một người có lẽ - Lou Hoàng, Miu Lê _ hqhuy cover (ft. Hziaa).mp3')).toBe('Yêu một người có lẽ - Lou Hoàng, Miu Lê');
    expect(tidyName('Yêu Người Như Anh (Speed Up) _ SKIRIN #videomusic #speedupsong.mp3')).toBe('Yêu Người Như Anh (Speed Up) - SKIRIN');
  });

  it('leaves an ordinary name alone', () => {
    expect(tidyName('Last Night 2.mp3')).toBe('Last Night 2');
  });
});

describe('parseName', () => {
  it('reads "Artist - Song" from a file name with no tags', () => {
    expect(parseName('hqhuy - Yêu Một Người Có Lẽ (cover, ft. Hziaa).mp3')).toEqual({ artist: 'hqhuy', title: 'Yêu Một Người Có Lẽ (cover, ft. Hziaa)' });
  });
  it('treats any other name as a title alone', () => {
    expect(parseName('Nếu Không Phải Em.mp3')).toEqual({ artist: '', title: 'Nếu Không Phải Em' });
  });
});
