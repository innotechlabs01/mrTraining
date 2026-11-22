import { hasVideoSource, isPlayableVideoUrl } from '../isPlayableVideoUrl';

describe('isPlayableVideoUrl', () => {
  it('accepts absolute http/https URLs with a host', () => {
    expect(isPlayableVideoUrl('https://cdn.example.com/video.mp4')).toBe(true);
    expect(isPlayableVideoUrl('http://localhost:9090/media/x.mp4')).toBe(true);
    expect(isPlayableVideoUrl('https://youtu.be/abc123')).toBe(true);
    expect(isPlayableVideoUrl('HTTPS://EXAMPLE.COM/x.mp4')).toBe(true);
    expect(isPlayableVideoUrl('https://x.co/a.mp4?token=1#t=2')).toBe(true);
  });

  it('rejects null, undefined and empty strings', () => {
    expect(isPlayableVideoUrl('')).toBe(false);
    expect(isPlayableVideoUrl(null)).toBe(false);
    expect(isPlayableVideoUrl(undefined)).toBe(false);
  });

  it('rejects any URL containing whitespace', () => {
    expect(isPlayableVideoUrl('   ')).toBe(false);
    expect(isPlayableVideoUrl(' https://x.co/a.mp4')).toBe(false);
    expect(isPlayableVideoUrl('https://x.co/a.mp4 ')).toBe(false);
    expect(isPlayableVideoUrl('https://x .co/a.mp4')).toBe(false);
    expect(isPlayableVideoUrl('https://x.co/a b.mp4')).toBe(false);
  });

  it('rejects non-absolute or non-http values', () => {
    expect(isPlayableVideoUrl('not-a-url')).toBe(false);
    expect(isPlayableVideoUrl('ftp://x')).toBe(false);
    expect(isPlayableVideoUrl('//host/x')).toBe(false);
    expect(isPlayableVideoUrl('/media/x.mp4')).toBe(false);
    expect(isPlayableVideoUrl('file:///x.mp4')).toBe(false);
  });

  it('rejects http(s) values without a host and r2:// refs', () => {
    expect(isPlayableVideoUrl('http://')).toBe(false);
    expect(isPlayableVideoUrl('https://')).toBe(false);
    expect(isPlayableVideoUrl('http:///path')).toBe(false);
    expect(isPlayableVideoUrl('r2://media/123.mp4')).toBe(false);
  });
});

describe('hasVideoSource', () => {
  it('accepts both r2:// refs and absolute http(s) URLs', () => {
    expect(hasVideoSource('r2://media/123.mp4')).toBe(true);
    expect(hasVideoSource('https://cdn.example.com/video.mp4')).toBe(true);
  });

  it('rejects empty or invalid values', () => {
    expect(hasVideoSource('')).toBe(false);
    expect(hasVideoSource(null)).toBe(false);
    expect(hasVideoSource(undefined)).toBe(false);
    expect(hasVideoSource('not-a-url')).toBe(false);
  });
});
