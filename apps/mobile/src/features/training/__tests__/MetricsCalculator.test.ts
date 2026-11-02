/**
 * Pruebas unitarias de MetricsCalculator con valores conocidos.
 * No requiere GPS real ni dispositivo.
 */

import { MetricsCalculator, metricsCalculator } from '../infrastructure/MetricsCalculator';

describe('MetricsCalculator', () => {
  const calc = new MetricsCalculator();

  describe('ritmo y velocidad', () => {
    it('calcula ritmo para 5 km en 25 minutos (5:00 min/km)', () => {
      const resultado = calc.calcular({
        distanciaMetros: 5000,
        duracionSegundos: 1500,
        tiempoEnMovimientoSegundos: 1500,
        elevacionGanadaMetros: 0,
        elevacionPerdidaMetros: 0,
      });
      expect(resultado.ritmoSegundosPorKm).toBeCloseTo(300, 0); // 5 min/km = 300 seg/km
      expect(resultado.ritmoFormateado).toBe('5:00');
      expect(resultado.velocidadKmh).toBeCloseTo(12, 1); // 5km / (1500/3600)h = 12 km/h
    });

    it('calcula ritmo para 10 km en 50 minutos (5:00 min/km)', () => {
      const resultado = calc.calcular({
        distanciaMetros: 10000,
        duracionSegundos: 3000,
        tiempoEnMovimientoSegundos: 3000,
        elevacionGanadaMetros: 0,
        elevacionPerdidaMetros: 0,
      });
      expect(resultado.ritmoSegundosPorKm).toBeCloseTo(300, 0);
      expect(resultado.ritmoFormateado).toBe('5:00');
    });

    it('devuelve ritmo null cuando distancia es 0', () => {
      const resultado = calc.calcular({
        distanciaMetros: 0,
        duracionSegundos: 100,
        tiempoEnMovimientoSegundos: 100,
        elevacionGanadaMetros: 0,
        elevacionPerdidaMetros: 0,
      });
      expect(resultado.ritmoSegundosPorKm).toBeNull();
      expect(resultado.ritmoFormateado).toBe('--:--');
      expect(resultado.velocidadKmh).toBe(0);
    });

    it('devuelve ritmo null cuando tiempo en movimiento es 0', () => {
      const resultado = calc.calcular({
        distanciaMetros: 1000,
        duracionSegundos: 100,
        tiempoEnMovimientoSegundos: 0,
        elevacionGanadaMetros: 0,
        elevacionPerdidaMetros: 0,
      });
      expect(resultado.ritmoSegundosPorKm).toBeNull();
    });
  });

  describe('tiempo en movimiento vs transcurrido', () => {
    it('usa tiempo en movimiento para ritmo, no transcurrido', () => {
      // 5 km, 1500s transcurridos pero 1200s en movimiento (300s de pausa)
      const resultado = calc.calcular({
        distanciaMetros: 5000,
        duracionSegundos: 1500,
        tiempoEnMovimientoSegundos: 1200,
        elevacionGanadaMetros: 0,
        elevacionPerdidaMetros: 0,
      });
      expect(resultado.ritmoSegundosPorKm).toBeCloseTo(240, 0); // 1200s / 5km = 240 seg/km = 4:00
      expect(resultado.ritmoFormateado).toBe('4:00');
    });
  });

  describe('elevación', () => {
    it('calcula elevación total ganada + perdida', () => {
      const resultado = calc.calcular({
        distanciaMetros: 1000,
        duracionSegundos: 300,
        tiempoEnMovimientoSegundos: 300,
        elevacionGanadaMetros: 50,
        elevacionPerdidaMetros: 30,
      });
      expect(resultado.elevacionMetros).toBe(80);
      expect(resultado.distanciaGanadaMetros).toBe(50);
      expect(resultado.distanciaPerdidaMetros).toBe(30);
    });
  });

  describe('calorías', () => {
    it('calcula calorías estimadas (70kg, 8 MET, 1 hora)', () => {
      const resultado = calc.calcular({
        distanciaMetros: 10000,
        duracionSegundos: 3600,
        tiempoEnMovimientoSegundos: 3600,
        elevacionGanadaMetros: 0,
        elevacionPerdidaMetros: 0,
      });
      // 8 MET * 70 kg * 1 hora = 560 calorías
      expect(resultado.calorias).toBe(560);
    });
  });

  describe('formateo', () => {
    it('formatea tiempo como mm:ss', () => {
      const calc2 = new MetricsCalculator();
      expect(calc2.formatearTiempo(0)).toBe('0:00');
      expect(calc2.formatearTiempo(65)).toBe('1:05');
      expect(calc2.formatearTiempo(3665)).toBe('61:05');
    });

    it('formatea distancia en km', () => {
      const calc2 = new MetricsCalculator();
      expect(calc2.formatearDistancia(0)).toBe('0.00');
      expect(calc2.formatearDistancia(5000)).toBe('5.00');
      expect(calc2.formatearDistancia(12345)).toBe('12.35');
    });
  });

  describe('instancia exportada', () => {
    it('metricsCalculator es una instancia de MetricsCalculator', () => {
      expect(metricsCalculator).toBeInstanceOf(MetricsCalculator);
    });
  });
});
