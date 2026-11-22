import * as FileSystem from 'expo-file-system/legacy';

import { smartClient } from '@/infrastructure/api/client';
import {
  isR2Ref,
  presignReadBatch,
  resolveLegacyMediaUrl,
  uploadMediaToR2,
} from '../mediaService';

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  uploadAsync: jest.fn(),
  FileSystemUploadType: { BINARY_CONTENT: 0 },
}));

jest.mock('@/infrastructure/api/client', () => ({
  GO_API_URL: 'https://api.example.com',
  smartClient: {
    post: jest.fn(),
  },
}));

const mockGetInfoAsync = FileSystem.getInfoAsync as jest.MockedFunction<typeof FileSystem.getInfoAsync>;
const mockUploadAsync = FileSystem.uploadAsync as jest.MockedFunction<typeof FileSystem.uploadAsync>;
const mockPost = smartClient.post as jest.MockedFunction<typeof smartClient.post>;

describe('mediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isR2Ref', () => {
    it('returns true for r2:// references', () => {
      expect(isR2Ref('r2://media/123/video.mp4')).toBe(true);
      expect(isR2Ref('  r2://media/123  ')).toBe(true);
    });

    it('returns false for non-r2 values', () => {
      expect(isR2Ref('https://cdn.example.com/a.mp4')).toBe(false);
      expect(isR2Ref('/uploads/a.mp4')).toBe(false);
      expect(isR2Ref('')).toBe(false);
      expect(isR2Ref(null)).toBe(false);
      expect(isR2Ref(undefined)).toBe(false);
    });
  });

  describe('resolveLegacyMediaUrl', () => {
    it('passes http(s):// URLs through', () => {
      expect(resolveLegacyMediaUrl('https://cdn.example.com/a.mp4')).toBe(
        'https://cdn.example.com/a.mp4',
      );
      expect(resolveLegacyMediaUrl('http://localhost:9090/x.png')).toBe(
        'http://localhost:9090/x.png',
      );
    });

    it('maps /uploads/... to GO_API_URL', () => {
      expect(resolveLegacyMediaUrl('/uploads/avatar.png')).toBe(
        'https://api.example.com/uploads/avatar.png',
      );
    });

    it('returns undefined for r2:// refs and invalid/empty values', () => {
      expect(resolveLegacyMediaUrl('r2://media/123')).toBeUndefined();
      expect(resolveLegacyMediaUrl('')).toBeUndefined();
      expect(resolveLegacyMediaUrl(null)).toBeUndefined();
      expect(resolveLegacyMediaUrl('/other/path.png')).toBeUndefined();
    });
  });

  describe('presignReadBatch', () => {
    it('returns empty object without calling API when no r2 refs are provided', async () => {
      const res = await presignReadBatch(['https://example.com/a.mp4', '']);
      expect(res).toEqual({});
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('deduplicates refs, chunks by 50, and unwraps data.urls', async () => {
      const refs = Array.from({ length: 55 }, (_, i) => `r2://media/${i}`);
      refs.push('r2://media/0'); // duplicate

      mockPost
        .mockResolvedValueOnce({
          data: {
            data: {
              urls: { 'r2://media/0': { url: 'https://r2.signed/0', expires_at: '2026-01-01T00:00:00Z' } },
            },
          },
        } as never)
        .mockResolvedValueOnce({
          data: {
            urls: { 'r2://media/54': { url: 'https://r2.signed/54', expires_at: '2026-01-01T00:00:00Z' } },
          },
        } as never);

      const res = await presignReadBatch(refs);
      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(mockPost).toHaveBeenNthCalledWith(1, '/media/presign-read', {
        refs: expect.arrayContaining(['r2://media/0', 'r2://media/49']),
      });
      expect(mockPost).toHaveBeenNthCalledWith(2, '/media/presign-read', {
        refs: expect.arrayContaining(['r2://media/50', 'r2://media/54']),
      });
      expect(res['r2://media/0']?.url).toBe('https://r2.signed/0');
      expect(res['r2://media/54']?.url).toBe('https://r2.signed/54');
    });
  });

  describe('uploadMediaToR2', () => {
    it('presigns, uploads binary content to R2, and confirms', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 1024,
        uri: 'file:///tmp/v.mp4',
        isDirectory: false,
        modificationTime: 0,
      });
      mockPost
        .mockResolvedValueOnce({
          data: {
            data: {
              media_id: 'm1',
              object_key: 'form/m1.mp4',
              media_ref: 'r2://form/m1.mp4',
              upload_url: 'https://r2.upload/put',
              headers: { 'Content-Type': 'video/mp4' },
              expires_at: '2026-01-01T00:00:00Z',
            },
          },
        } as never)
        .mockResolvedValueOnce({
          data: {
            data: {
              media_id: 'm1',
              object_key: 'form/m1.mp4',
              media_ref: 'r2://form/m1.mp4',
              preview_url: 'https://r2.signed/preview',
              expires_at: '2026-01-01T00:00:00Z',
            },
          },
        } as never);
      mockUploadAsync.mockResolvedValue({ status: 200, body: '', headers: {}, mimeType: null });

      const result = await uploadMediaToR2('/tmp/v.mp4', 'form_recording', {
        resourceId: 'w1',
      });

      expect(mockGetInfoAsync).toHaveBeenCalledWith('file:///tmp/v.mp4');
      expect(mockPost).toHaveBeenNthCalledWith(1, '/media/presign-upload', {
        purpose: 'form_recording',
        filename: 'v.mp4',
        content_type: 'video/mp4',
        size_bytes: 1024,
        resource_id: 'w1',
      });
      expect(mockUploadAsync).toHaveBeenCalledWith('https://r2.upload/put', 'file:///tmp/v.mp4', {
        httpMethod: 'PUT',
        uploadType: 0,
        headers: { 'Content-Type': 'video/mp4' },
      });
      expect(mockPost).toHaveBeenNthCalledWith(2, '/media/confirm', { media_id: 'm1' });
      expect(result).toEqual({
        mediaRef: 'r2://form/m1.mp4',
        previewUrl: 'https://r2.signed/preview',
      });
    });

    it('throws when file does not exist', async () => {
      mockGetInfoAsync.mockResolvedValue({ exists: false, uri: 'file:///tmp/missing.mp4', isDirectory: false });
      await expect(uploadMediaToR2('/tmp/missing.mp4', 'avatar')).rejects.toThrow(
        'Media file not found',
      );
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('throws when R2 PUT returns non-2xx', async () => {
      mockGetInfoAsync.mockResolvedValue({
        exists: true,
        size: 500,
        uri: 'file:///tmp/v.mp4',
        isDirectory: false,
        modificationTime: 0,
      });
      mockPost.mockResolvedValueOnce({
        data: {
          data: {
            media_id: 'm1',
            media_ref: 'r2://form/m1.mp4',
            upload_url: 'https://r2.upload/put',
            headers: {},
          },
        },
      } as never);
      mockUploadAsync.mockResolvedValue({ status: 403, body: 'Forbidden', headers: {}, mimeType: null });

      await expect(uploadMediaToR2('file:///tmp/v.mp4', 'challenge_attempt')).rejects.toThrow(
        'R2 upload failed with status 403',
      );
      expect(mockPost).toHaveBeenCalledTimes(1);
    });
  });
});
