import { FrameScheduler } from '../FrameScheduler';

describe('FrameScheduler', () => {
  it('throttles to target fps', () => {
    const s = new FrameScheduler(10); // 10 fps => 100ms period
    expect(s.shouldRun(0)).toBe(true);
    expect(s.shouldRun(50)).toBe(false);
    expect(s.shouldRun(100)).toBe(true);
  });
  it('changes target fps', () => {
    const s = new FrameScheduler(10);
    s.setTargetFps(5); // 200ms
    expect(s.shouldRun(0)).toBe(true);
    expect(s.shouldRun(190)).toBe(false);
    expect(s.shouldRun(200)).toBe(true);
  });
});
