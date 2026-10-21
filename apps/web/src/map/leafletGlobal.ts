import L from 'leaflet';

// leaflet.heat is a legacy plugin that attaches itself to the global `L`.
(window as unknown as { L: typeof L }).L = L;
