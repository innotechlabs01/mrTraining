import { getVideoState, hasPlayableVideo } from '../videoState';

describe('videoState utilities', () => {
  describe('getVideoState', () => {
    it('returns "no-video-with-hint" for undefined videoUrl', () => {
      expect(getVideoState(undefined)).toBe('no-video-with-hint');
    });

    it('returns "no-video-with-hint" for null videoUrl', () => {
      expect(getVideoState(null as any)).toBe('no-video-with-hint');
    });

    it('returns "no-video-with-hint" for empty string videoUrl', () => {
      expect(getVideoState('')).toBe('no-video-with-hint');
    });

    it('returns "error" for invalid URL (non-absolute)', () => {
      expect(getVideoState('not-a-url')).toBe('error');
      expect(getVideoState('ftp://example.com/video.mp4')).toBe('error');
      expect(getVideoState('//host/video.mp4')).toBe('error');
      expect(getVideoState('/local/path.mp4')).toBe('error');
    });

    it('returns "error" for URL with whitespace', () => {
      expect(getVideoState(' https://example.com/video.mp4')).toBe('error');
      expect(getVideoState('https://example.com/video.mp4 ')).toBe('error');
      expect(getVideoState('https://exa mple.com/video.mp4')).toBe('error');
    });

    it('returns "has-video" for valid absolute http/https URLs', () => {
      expect(getVideoState('https://cdn.example.com/video.mp4')).toBe('has-video');
      expect(getVideoState('http://localhost:9090/media/x.mp4')).toBe('has-video');
      expect(getVideoState('https://youtu.be/abc123')).toBe('has-video');
      expect(getVideoState('HTTPS://EXAMPLE.COM/x.mp4')).toBe('has-video');
      expect(getVideoState('https://x.co/a.mp4?token=1#t=2')).toBe('has-video');
    });
  });

  describe('hasPlayableVideo', () => {
    it('returns false for no URL', () => {
      expect(hasPlayableVideo(undefined)).toBe(false);
      expect(hasPlayableVideo('')).toBe(false);
    });

    it('returns false for invalid URL', () => {
      expect(hasPlayableVideo('not-a-url')).toBe(false);
      expect(hasPlayableVideo('ftp://example.com/video.mp4')).toBe(false);
    });

    it('returns true for valid playable URL', () => {
      expect(hasPlayableVideo('https://cdn.example.com/video.mp4')).toBe(true);
      expect(hasPlayableVideo('http://localhost:9090/media/x.mp4')).toBe(true);
    });
  });
});