import type {
  DriverRouteMapData,
  RouteMapStop,
} from "@/src/screens/RouteMap/types";
import { hasValidCoordinates, toFiniteNumber } from "@/src/screens/RouteMap/types";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeStopsForMap(stops: RouteMapStop[]) {
  return stops
    .filter(hasValidCoordinates)
    .map((stop) => {
      const marker = stop.marker || {};
      return {
        stop_key: String(stop.stop_key),
        lat: toFiniteNumber(stop.latitude),
        lng: toFiniteNumber(stop.longitude),
        label: String(
          marker.label ?? stop.stop_number ?? "",
        ),
        shape: String(marker.shape || "circle"),
        fill_color: String(marker.fill_color || "#198754"),
        border_color: String(marker.border_color || marker.fill_color || "#198754"),
        text_color: String(marker.text_color || "#000000"),
        badge_fill: String(marker.badge_fill || "#ffffff"),
        overlay: String(marker.overlay || "none"),
        is_done: Boolean(marker.is_done ?? stop.is_done),
        is_failed: Boolean(marker.is_failed),
        is_partial: Boolean(marker.is_partial),
        name: String(stop.name || ""),
      };
    });
}

/**
 * Builds an offline-friendly Google Maps HTML page that renders API marker
 * styles (shape/overlay/colors/label) — no planning rules invented in RN.
 */
export function buildRouteMapHtml(params: {
  apiKey: string;
  mapData: DriverRouteMapData;
  selectedStopKey?: string | null;
  regionColor?: string | null;
}): string {
  const stops = serializeStopsForMap(params.mapData.stops || []);
  const base = params.mapData.base_location;
  const baseLat = toFiniteNumber(base?.latitude);
  const baseLng = toFiniteNumber(base?.longitude);
  const baseLocation =
    baseLat != null && baseLng != null
      ? {
          lat: baseLat,
          lng: baseLng,
          name: String(base?.name || "Depot"),
        }
      : null;

  const lineColor = String(
    params.regionColor || params.mapData.region_color || "#198754",
  );
  const selectedKey = params.selectedStopKey
    ? String(params.selectedStopKey)
    : "";

  const payload = JSON.stringify({
    stops,
    baseLocation,
    lineColor,
    selectedKey,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #e8eef5; }
    .pin {
      position: relative;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-weight: 700;
      font-size: 12px;
      line-height: 1;
      box-sizing: border-box;
      border-style: solid;
      border-width: 2px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
      user-select: none;
    }
    .pin.circle { border-radius: 50%; }
    .pin.square { border-radius: 4px; }
    .pin.star {
      width: 36px;
      height: 36px;
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
      border-width: 0;
      box-shadow: none;
    }
    .pin.triangle {
      width: 0;
      height: 0;
      border-left: 17px solid transparent;
      border-right: 17px solid transparent;
      border-bottom-width: 30px;
      border-bottom-style: solid;
      border-top: 0;
      border-radius: 0;
      background: transparent !important;
      box-shadow: none;
      overflow: visible;
    }
    .pin.triangle .label {
      position: absolute;
      top: 12px;
      left: -10px;
      width: 20px;
      text-align: center;
    }
    .pin.hold {
      border-radius: 50%;
      border-style: dashed;
    }
    .pin .overlay {
      position: absolute;
      right: -4px;
      top: -4px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      color: #111;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(0,0,0,0.25);
      font-weight: 800;
    }
    .pin.selected {
      outline: 3px solid #111;
      outline-offset: 2px;
      z-index: 5;
    }
    .depot {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #212529;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const PAYLOAD = ${payload};
    function post(type, data) {
      try {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
      } catch (e) {}
    }
    function buildPinHtml(stop, selected) {
      var shape = stop.shape || 'circle';
      var fill = stop.fill_color || '#198754';
      var border = stop.border_color || fill;
      var text = stop.text_color || '#000';
      var badge = stop.badge_fill || '#fff';
      var cls = 'pin ' + shape + (selected ? ' selected' : '');
      var overlay = '';
      if (stop.overlay === 'check') overlay = '<span class="overlay" style="background:' + badge + '">✓</span>';
      else if (stop.overlay === 'x') overlay = '<span class="overlay" style="background:' + badge + '">✕</span>';
      else if (stop.overlay === 'half') overlay = '<span class="overlay" style="background:' + badge + '">½</span>';

      if (shape === 'triangle') {
        return '<div class="' + cls + '" style="border-bottom-color:' + fill + '"><span class="label" style="color:' + text + '">' +
          String(stop.label || '') + '</span>' + overlay + '</div>';
      }
      return '<div class="' + cls + '" style="background:' + fill + ';border-color:' + border + ';color:' + text + '">' +
        '<span>' + String(stop.label || '') + '</span>' + overlay + '</div>';
    }
    function initMap() {
      var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 11,
        center: { lat: 52.1326, lng: 5.2913 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      var bounds = new google.maps.LatLngBounds();
      var path = [];
      var overlays = [];

      if (PAYLOAD.baseLocation) {
        var depotDiv = document.createElement('div');
        depotDiv.className = 'depot';
        depotDiv.textContent = '⌂';
        var depotOverlay = new google.maps.OverlayView();
        depotOverlay.onAdd = function() {
          this.getPanes().overlayMouseTarget.appendChild(depotDiv);
        };
        depotOverlay.draw = function() {
          var proj = this.getProjection();
          if (!proj) return;
          var point = proj.fromLatLngToDivPixel(new google.maps.LatLng(PAYLOAD.baseLocation.lat, PAYLOAD.baseLocation.lng));
          if (!point) return;
          depotDiv.style.position = 'absolute';
          depotDiv.style.left = (point.x - 14) + 'px';
          depotDiv.style.top = (point.y - 14) + 'px';
        };
        depotOverlay.onRemove = function() { depotDiv.remove(); };
        depotOverlay.setMap(map);
        bounds.extend(PAYLOAD.baseLocation);
      }

      (PAYLOAD.stops || []).forEach(function(stop) {
        if (stop.lat == null || stop.lng == null) return;
        var pos = { lat: stop.lat, lng: stop.lng };
        path.push(pos);
        bounds.extend(pos);
        var el = document.createElement('div');
        el.innerHTML = buildPinHtml(stop, stop.stop_key === PAYLOAD.selectedKey);
        el.style.cursor = 'pointer';
        el.onclick = function(ev) {
          ev.stopPropagation();
          post('marker_press', { stop_key: stop.stop_key });
        };
        var overlay = new google.maps.OverlayView();
        overlay.onAdd = function() {
          this.getPanes().overlayMouseTarget.appendChild(el);
        };
        overlay.draw = function() {
          var proj = this.getProjection();
          if (!proj) return;
          var point = proj.fromLatLngToDivPixel(new google.maps.LatLng(stop.lat, stop.lng));
          if (!point) return;
          el.style.position = 'absolute';
          el.style.left = (point.x - 17) + 'px';
          el.style.top = (point.y - 17) + 'px';
        };
        overlay.onRemove = function() { el.remove(); };
        overlay.setMap(map);
        overlays.push(overlay);
      });

      if (path.length > 1) {
        new google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: PAYLOAD.lineColor || '#198754',
          strokeOpacity: 0.85,
          strokeWeight: 4,
          map: map,
        });
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 48);
      }
      post('map_ready', { count: (PAYLOAD.stops || []).length });
    }
    window.initMap = initMap;
    window.onerror = function(msg) { post('map_error', { message: String(msg) }); };
  </script>
  <script async defer src="https://maps.googleapis.com/maps/api/js?key=${escapeHtml(params.apiKey)}&callback=initMap"></script>
</body>
</html>`;
}
