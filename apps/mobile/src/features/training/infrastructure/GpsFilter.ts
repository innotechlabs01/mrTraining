/**
 * GpsFilter — filtro de posiciones GPS con validaciones documentadas.
 *
 * Todos los parámetros son configurables y sus efectos secundarios documentados.
 * Testeable con posiciones sintéticas.
 */

export interface GpsPointRaw {
  lat: number;
  lng: number;
  alt?: number | null;
  timestamp: string;
  accuracy?: number | null;
}

export interface GpsPointFiltered extends GpsPointRaw {
  valido: boolean;
  motivoDescartado?: string;
}

export interface GpsFilterConfig {
  maxPrecisionMetros: number;
  maxVelocidadMps: number;
  maxGapSegundos: number;
  minDistanciaEntrePuntosMetros: number;
}

export const DEFAULT_GPS_FILTER_CONFIG: GpsFilterConfig = {
  maxPrecisionMetros: 50.0,
  maxVelocidadMps: 8.0,
  maxGapSegundos: 300,
  minDistanciaEntrePuntosMetros: 1.0,
};

/**
 * Resultado del filtro.
 */
export interface FiltroResultado {
  puntosValidos: GpsPointFiltered[];
  puntosDescartados: GpsPointFiltered[];
  calidad: number; // 0.0 a 1.0
  distanciaTotalMetros: number;
}

/**
 * Filtra una lista de puntos GPS crudos aplicando:
 * 1. Validación de coordenadas
 * 2. Precisión mínima
 * 3. Detección de duplicados por timestamp
 * 4. Detección de saltos GPS (velocidad imposible)
 * 5. Gap de tiempo (nuevo segmento)
 * 6. Movimiento estático
 */
export class GpsFilter {
  private config: GpsFilterConfig;
  private ultimoPuntoValido: GpsPointFiltered | null = null;

  constructor(config: GpsFilterConfig = DEFAULT_GPS_FILTER_CONFIG) {
    this.config = config;
  }

  filtrar(puntos: GpsPointRaw[]): FiltroResultado {
    const validos: GpsPointFiltered[] = [];
    const descartados: GpsPointFiltered[] = [];
    let distanciaTotal = 0;
    let distanciaDesdeUltimoSplit = 0;

    for (const punto of puntos) {
      const resultado = this.procesarPunto(punto);

      if (resultado.valido) {
        validos.push(resultado);
        distanciaTotal += resultado.distanciaDesdeAnteriorMetros ?? 0;
        distanciaDesdeUltimoSplit += resultado.distanciaDesdeAnteriorMetros ?? 0;
        this.ultimoPuntoValido = resultado;
      } else {
        descartados.push(resultado);
      }
    }

    const total = validos.length + descartados.length;
    const calidad = total > 0 ? validos.length / total : 1.0;

    return {
      puntosValidos: validos,
      puntosDescartados: descartados,
      calidad,
      distanciaTotalMetros: distanciaTotal,
    };
  }

  reset(): void {
    this.ultimoPuntoValido = null;
  }

  private procesarPunto(punto: GpsPointRaw): GpsPointFiltered & { distanciaDesdeAnteriorMetros?: number } {
    // 1. Coordenadas válidas
    if (!this.coordenadasValidas(punto.lat, punto.lng)) {
      return { ...punto, valido: false, motivoDescartado: 'coordenadas_invalidas' };
    }

    // 2. Precisión
    const accuracy = punto.accuracy ?? 0;
    if (accuracy > this.config.maxPrecisionMetros) {
      return { ...punto, valido: false, motivoDescartado: `precision_insuficiente_${accuracy}m` };
    }

    // El primer punto no tiene anterior: siempre válido si pasó coordenadas y precisión
    if (!this.ultimoPuntoValido) {
      return { ...punto, valido: true };
    }

    // 3. Duplicado por timestamp
    if (punto.timestamp === this.ultimoPuntoValido.timestamp) {
      return { ...punto, valido: false, motivoDescartado: 'duplicado_timestamp' };
    }

    // 4. Distancia y tiempo desde último punto válido
    let distanciaDesdeAnterior = 0;
    let tiempoDesdeAnteriorSegundos = 0;

    distanciaDesdeAnterior = haversineMetros(
      this.ultimoPuntoValido.lat,
      this.ultimoPuntoValido.lng,
      punto.lat,
      punto.lng
    );
    const t1 = new Date(this.ultimoPuntoValido.timestamp).getTime();
    const t2 = new Date(punto.timestamp).getTime();
    tiempoDesdeAnteriorSegundos = (t2 - t1) / 1000;

    // 5. Salto GPS
    if (tiempoDesdeAnteriorSegundos > 0) {
      const velocidad = distanciaDesdeAnterior / tiempoDesdeAnteriorSegundos;
      if (velocidad > this.config.maxVelocidadMps) {
        return {
          ...punto,
          valido: false,
          motivoDescartado: `salto_gps_${velocidad.toFixed(1)}mps`,
        };
      }
    }

    // 6. Gap de tiempo — nuevo segmento, no acumulamos distancia
    if (tiempoDesdeAnteriorSegundos > this.config.maxGapSegundos) {
      distanciaDesdeAnterior = 0;
    }

    // 7. Movimiento estático
    if (distanciaDesdeAnterior < this.config.minDistanciaEntrePuntosMetros) {
      return { ...punto, valido: false, motivoDescartado: 'movimiento_estatico' };
    }

    return {
      ...punto,
      valido: true,
      distanciaDesdeAnteriorMetros: distanciaDesdeAnterior,
    };
  }

  private coordenadasValidas(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && isFinite(lat) && isFinite(lng);
  }
}

export function haversineMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
