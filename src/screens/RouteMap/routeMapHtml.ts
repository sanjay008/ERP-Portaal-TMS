import type {
  DriverRouteMapData,
  RouteMapBaseLocation,
  RouteMapStop,
  RoutePathPoint,
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

export type RouteMapInjectPayload = {
  stops: ReturnType<typeof serializeStopsForMap>;
  /** Road path from API — polyline uses this only (never stop-to-stop). */
  routePath: { lat: number; lng: number }[];
  baseLocation: { lat: number; lng: number; name: string } | null;
  lineColor: string;
  selectedKey: string;
};

export function serializeStopsForMap(stops: RouteMapStop[]) {
  return stops
    .filter(hasValidCoordinates)
    .map((stop) => {
      const marker = stop.marker || {};
      return {
        stop_key: String(stop.stop_key),
        lat: toFiniteNumber(stop.latitude) as number,
        lng: toFiniteNumber(stop.longitude) as number,
        label: String(marker.label ?? stop.stop_number ?? ""),
        shape: String(marker.shape || "circle"),
        fill_color: String(marker.fill_color || "#198754"),
        border_color: String(
          marker.border_color || marker.fill_color || "#198754",
        ),
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

function serializeBase(
  base?: RouteMapBaseLocation | null,
): RouteMapInjectPayload["baseLocation"] {
  const baseLat = toFiniteNumber(base?.latitude);
  const baseLng = toFiniteNumber(base?.longitude);
  if (baseLat == null || baseLng == null) return null;
  return {
    lat: baseLat,
    lng: baseLng,
    name: String(base?.name || "Depot"),
  };
}

/** Normalize API route_path → valid lat/lng points for the road polyline. */
export function serializeRoutePath(
  routePath?: RoutePathPoint[] | null,
): { lat: number; lng: number }[] {
  if (!Array.isArray(routePath) || routePath.length === 0) return [];
  const points: { lat: number; lng: number }[] = [];
  for (const point of routePath) {
    const lat = toFiniteNumber(point?.lat);
    const lng = toFiniteNumber(point?.lng);
    if (lat == null || lng == null) continue;
    points.push({ lat, lng });
  }
  return points;
}

/** Payload pushed into the already-loaded map via injectJavaScript. */
export function buildRouteMapPayload(
  mapData?: DriverRouteMapData | null,
  regionColor?: string | null,
): RouteMapInjectPayload {
  return {
    stops: serializeStopsForMap(mapData?.stops || []),
    routePath: serializeRoutePath(mapData?.route_path),
    baseLocation: serializeBase(mapData?.base_location),
    lineColor: String(regionColor || mapData?.region_color || "#4E83E7"),
    selectedKey: "",
  };
}

/**
 * Stable Google Maps shell — loads once. Route pins arrive later via
 * window.__updateRouteMap(payload) without remounting the WebView.
 */
export function buildRouteMapHtml(apiKey: string): string {
  const initial = JSON.stringify(buildRouteMapPayload(null));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #eef2f6; }
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
    .pin.hold { border-radius: 50%; border-style: dashed; }
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
    .depot {
      width: 28px;
      height: 28px;
      border-radius: 8px;
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
    var map = null;
    var polyline = null;
    var layerOverlays = [];
    var pendingPayload = ${initial};
    var mapReady = false;
    var meMarker = null;
    var meCircle = null;
    var pendingMe = null;

    function post(type, data) {
      try {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type, data: data || {} }));
      } catch (e) {}
    }

    function clearLayers() {
      for (var i = 0; i < layerOverlays.length; i++) {
        try { layerOverlays[i].setMap(null); } catch (e) {}
      }
      layerOverlays = [];
      if (polyline) {
        try { polyline.setMap(null); } catch (e) {}
        polyline = null;
      }
    }

    function buildPinHtml(stop) {
      var shape = stop.shape || 'circle';
      var fill = stop.fill_color || '#198754';
      var border = stop.border_color || fill;
      var text = stop.text_color || '#000';
      var badge = stop.badge_fill || '#fff';
      var cls = 'pin ' + shape;
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

    function addHtmlOverlay(lat, lng, html, onClick, anchorX, anchorY) {
      var el = document.createElement('div');
      el.innerHTML = html;
      el.style.cursor = onClick ? 'pointer' : 'default';
      if (onClick) {
        el.onclick = function(ev) {
          ev.stopPropagation();
          onClick();
        };
      }
      var overlay = new google.maps.OverlayView();
      overlay.onAdd = function() {
        this.getPanes().overlayMouseTarget.appendChild(el);
      };
      overlay.draw = function() {
        var proj = this.getProjection();
        if (!proj) return;
        var point = proj.fromLatLngToDivPixel(new google.maps.LatLng(lat, lng));
        if (!point) return;
        el.style.position = 'absolute';
        el.style.left = (point.x - anchorX) + 'px';
        el.style.top = (point.y - anchorY) + 'px';
      };
      overlay.onRemove = function() { el.remove(); };
      overlay.setMap(map);
      layerOverlays.push(overlay);
    }

    function renderPayload(payload) {
      if (!map || !payload) return;
      clearLayers();
      var bounds = new google.maps.LatLngBounds();
      var hasPoint = false;

      if (payload.baseLocation) {
        addHtmlOverlay(
          payload.baseLocation.lat,
          payload.baseLocation.lng,
          '<div class="depot">⌂</div>',
          null,
          14,
          14
        );
        bounds.extend(payload.baseLocation);
        hasPoint = true;
      }

      // Markers from stops[] only — never used to build the road line.
      (payload.stops || []).forEach(function(stop) {
        if (stop.lat == null || stop.lng == null) return;
        bounds.extend({ lat: stop.lat, lng: stop.lng });
        hasPoint = true;
        addHtmlOverlay(
          stop.lat,
          stop.lng,
          buildPinHtml(stop),
          function() { post('marker_press', { stop_key: stop.stop_key }); },
          17,
          17
        );
      });

      // Road polyline from API route_path only (same as web planning).
      // No Google Directions in-app; no stop-to-stop straight default.
      var routePath = payload.routePath || [];
      if (routePath.length >= 2) {
        for (var i = 0; i < routePath.length; i++) {
          bounds.extend(routePath[i]);
          hasPoint = true;
        }
        polyline = new google.maps.Polyline({
          path: routePath,
          geodesic: false,
          strokeColor: payload.lineColor || '#4E83E7',
          strokeOpacity: 0.95,
          strokeWeight: 5,
          map: map,
        });
      }

      if (hasPoint) {
        map.fitBounds(bounds, 56);
      }
      if (pendingMe) applyMyLocation(pendingMe, false);
      post('route_rendered', {
        stops: (payload.stops || []).length,
        routePath: routePath.length,
      });
    }

    function applyMyLocation(pos, pan) {
      if (!map || !pos) return;
      var latLng = { lat: Number(pos.lat), lng: Number(pos.lng) };
      if (!isFinite(latLng.lat) || !isFinite(latLng.lng)) return;
      pendingMe = latLng;
      if (!meMarker) {
        meMarker = new google.maps.Marker({
          position: latLng,
          map: map,
          zIndex: 1000,
          clickable: false,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#1A73E8',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
        });
        meCircle = new google.maps.Circle({
          map: map,
          center: latLng,
          radius: 70,
          fillColor: '#1A73E8',
          fillOpacity: 0.18,
          strokeColor: '#1A73E8',
          strokeOpacity: 0.35,
          strokeWeight: 1,
          clickable: false,
        });
      } else {
        meMarker.setPosition(latLng);
        if (meCircle) meCircle.setCenter(latLng);
      }
      if (pan) {
        map.panTo(latLng);
        if ((map.getZoom() || 0) < 14) map.setZoom(15);
      }
    }

    window.__focusMyLocation = function(lat, lng) {
      pendingMe = { lat: lat, lng: lng };
      if (!mapReady) return;
      applyMyLocation(pendingMe, true);
    };

    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 7,
        center: { lat: 52.1326, lng: 5.2913 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: 'greedy',
      });
      mapReady = true;
      post('map_ready', { count: 0 });
      if (pendingPayload) {
        renderPayload(pendingPayload);
      }
      if (pendingMe) applyMyLocation(pendingMe, true);
    }

    window.__updateRouteMap = function(payload) {
      pendingPayload = payload || {
        stops: [],
        routePath: [],
        baseLocation: null,
        lineColor: '#4E83E7',
        selectedKey: '',
      };
      if (!mapReady) return;
      renderPayload(pendingPayload);
    };

    window.initMap = initMap;
    window.gm_authFailure = function() {
      post('maps_auth_failure', { message: 'Google Maps authentication failed (invalid/restricted API key or billing).' });
    };
    window.onerror = function(msg) { post('map_error', { message: String(msg) }); };
  </script>
  <script async defer src="https://maps.googleapis.com/maps/api/js?key=${escapeHtml(apiKey)}&callback=initMap"></script>
</body>
</html>`;
}
