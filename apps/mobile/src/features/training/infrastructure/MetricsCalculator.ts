/**
 * MetricsCalculator — cálculos puros de métricas de running.
 *
 * Testeable con valores conocidos. No depende de Expo ni de React.
 */

export interface MetricaEntrada {
  distanciaMetros: number;
  duracionSegundos: number;
  tiempoEnMovimientoSegundos: number;
  elevacionGanadaMetros: number;
  elevacionPerdidaMetros: number;
  frecuenciaCardiaca?: number | null;
  cadencia?: number | null;
}

export interface MetricaSalida {
  distanciaKm: number;
  distanciaMetros: number;
  duracionSegundos: number;
  tiempoEnMovimientoSegundos: number;
  ritmoSegundosPorKm: number | null;
  ritmoFormateado: string;
  velocidadMetrosPorSegundo: number;
  velocidadKmh: number;
  calorias: number;
  elevacionMetros: number;
  distanciaGanadaMetros: number;
  distanciaPerdidaMetros: number;
  frecuenciaCardiaca?: number | null;
  cadencia?: number | null;
}

/**
 * Calcula todas las métricas derivadas a partir de entradas brutas.
 * No tiene efectos secundarios.
 */
export class MetricsCalculator {
  calcular(entrada: MetricaEntrada): MetricaSalida {
    const distanciaKm = entrada.distanciaMetros / 1000;
    const tiempoMovHoras = entrada.tiempoEnMovimientoSegundos / 3600;

    let ritmoSegundosPorKm: number | null = null;
    let ritmoFormateado = '--:--';
    let velocidadMps = 0;
    let velocidadKmh = 0;

    if (distanciaKm > 0 && entrada.tiempoEnMovimientoSegundos > 0) {
      ritmoSegundosPorKm = entrada.tiempoEnMovimientoSegundos / distanciaKm;
      velocidadMps = entrada.distanciaMetros / entrada.tiempoEnMovimientoSegundos;
      velocidadKmh = velocidadMps * 3.6;

      const min = Math.floor(ritmoSegundosPorKm / 60);
      const seg = Math.floor(ritmoSegundosPorKm % 60);
      ritmoFormateado = `${min}:${seg.toString().padStart(2, '0')}`;
    }

    // Estimación simple de calorías: MET * peso * tiempo_horas
    // MET running ≈ 8.0 (correr a ritmo moderado). Peso asume 70kg si no se sabe.
    const pesoAsumidoKg = 70;
    const met = 8.0;
    const calorias = Math.round(met * pesoAsumidoKg * tiempoMovHoras);

    return {
      distanciaKm,
      distanciaMetros: entrada.distanciaMetros,
      duracionSegundos: entrada.duracionSegundos,
      tiempoEnMovimientoSegundos: entrada.tiempoEnMovimientoSegundos,
      ritmoSegundosPorKm,
      ritmoFormateado,
      velocidadMetrosPorSegundo: velocidadMps,
      velocidadKmh,
      calorias,
      elevacionMetros: entrada.elevacionGanadaMetros + entrada.elevacionPerdidaMetros,
      distanciaGanadaMetros: entrada.elevacionGanadaMetros,
      distanciaPerdidaMetros: entrada.elevacionPerdidaMetros,
      frecuenciaCardiaca: entrada.frecuenciaCardiaca ?? null,
      cadencia: entrada.cadencia ?? null,
    };
  }

  /**
   * Calcula el ritmo promedio de un segmento (split).
   */
  calcularRitmoSplit(distanciaMetros: number, duracionSegundos: number): number | null {
    if (distanciaMetros <= 0 || duracionSegundos <= 0) return null;
    return (duracionSegundos / distanciaMetros) * 1000; // segundos por km
  }

  /**
   * Formatea segundos como mm:ss.
   */
  formatearTiempo(segundos: number): string {
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg.toString().padStart(2, '0')}`;
  }

  /**
   * Formatea distancia en metros como km string.
   */
  formatearDistancia(metros: number): string {
    return (metros / 1000).toFixed(2);
  }
}

export const metricsCalculator = new MetricsCalculator();
