import 'leaflet';

declare module 'leaflet' {
  interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }

  interface HeatLayer extends Layer {
    setLatLngs(latlngs: HeatLatLng[]): this;
    setOptions(options: HeatLayerOptions): this;
  }

  type HeatLatLng = [number, number, number];

  function heatLayer(latlngs: HeatLatLng[], options?: HeatLayerOptions): HeatLayer;
}
