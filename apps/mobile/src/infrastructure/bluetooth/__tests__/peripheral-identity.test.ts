import { identifyPeripheral } from '../peripheral-identity';

describe('identifyPeripheral', () => {
  it('recognises a Garmin watch from the advertised name', () => {
    const id = identifyPeripheral({ name: 'Forerunner 265' });
    expect(id).toEqual({ source: 'garmin', name: 'Forerunner 265', brand: 'Garmin' });
  });

  it('prefers the model number reported by the Device Information Service', () => {
    const id = identifyPeripheral({ name: 'GARMIN 1234', manufacturer: 'Garmin', model: 'Venu 3' });
    expect(id.name).toBe('Venu 3');
    expect(id.source).toBe('garmin');
  });

  it('recognises a newer Garmin model (fenix/instinct/epix family)', () => {
    expect(identifyPeripheral({ name: 'fenix 7X' }).source).toBe('garmin');
    expect(identifyPeripheral({ name: 'Instinct 2 Solar' }).source).toBe('garmin');
  });

  it('recognises an Apple Watch and keeps it on the apple_watch source', () => {
    const id = identifyPeripheral({ name: 'Apple Watch de Juan', manufacturer: 'Apple Inc.' });
    expect(id.source).toBe('apple_watch');
    expect(id.brand).toBe('Apple');
  });

  it('treats a chest strap as a heart-rate source, not as a run recorder', () => {
    const polar = identifyPeripheral({ name: 'Polar H10', manufacturer: 'Polar Electro Oy' });
    expect(polar.source).toBeNull();
    expect(polar.brand).toBe('Polar Electro Oy');
    expect(polar.name).toBe('Polar H10');
  });

  it('keeps a Garmin strap branded Garmin instead of generic', () => {
    const strap = identifyPeripheral({ name: 'HRM-Dual:1234' });
    expect(strap.source).toBeNull();
    expect(strap.brand).toBe('Garmin');
  });

  it('does not invent a model when the device only advertises an unknown name', () => {
    const id = identifyPeripheral({ name: 'SM-R900' });
    expect(id).toEqual({ source: null, name: 'SM-R900', brand: 'Bluetooth' });
  });

  it('falls back to a neutral label when nothing is reported', () => {
    expect(identifyPeripheral({})).toEqual({
      source: null,
      name: 'Dispositivo Bluetooth',
      brand: 'Bluetooth',
    });
  });
});
