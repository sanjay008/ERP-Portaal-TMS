import apiConstants from "@/src/api/apiConstants";
import type {
  DriverAssignedRegionsData,
  DriverRouteMapData,
} from "@/src/screens/RouteMap/types";
import ApiService from "@/src/utils/Apiservice";

type AuthUser = {
  user?: {
    id?: number | string;
    role?: string;
    verify_token?: string;
  };
  relaties?: {
    id?: number | string;
  };
};

export function buildDriverRouteAuth(userData: AuthUser | null | undefined) {
  return {
    token: userData?.user?.verify_token,
    relaties_id: userData?.relaties?.id,
    user_id: userData?.user?.id,
    role: userData?.user?.role,
  };
}

export function isRouteMapApiSuccess(res: any) {
  return (
    Boolean(res?.status) &&
    (res?.status_code == null || Number(res.status_code) === 200)
  );
}

export async function fetchDriverAssignedRegions(
  userData: AuthUser | null | undefined,
  date: string,
): Promise<any> {
  return ApiService(apiConstants.get_driver_assigned_regions, {
    customData: {
      ...buildDriverRouteAuth(userData),
      date,
    },
  });
}

export async function fetchDriverRouteMap(
  userData: AuthUser | null | undefined,
  params: { region_id: number | string; date: string },
): Promise<any> {
  return ApiService(apiConstants.get_driver_route_map, {
    customData: {
      ...buildDriverRouteAuth(userData),
      region_id: params.region_id,
      date: params.date,
    },
  });
}

export function parseAssignedRegionsData(
  res: any,
): DriverAssignedRegionsData | null {
  if (!isRouteMapApiSuccess(res)) return null;
  const data = res?.data;
  if (!data || typeof data !== "object") return null;
  return {
    planning_date: data.planning_date,
    default_date: data.default_date,
    regions: Array.isArray(data.regions) ? data.regions : [],
  };
}

export function parseRouteMapData(res: any): DriverRouteMapData | null {
  if (!isRouteMapApiSuccess(res)) return null;
  const data = res?.data;
  if (!data || typeof data !== "object") return null;
  return {
    ...data,
    stops: Array.isArray(data.stops) ? data.stops : [],
  };
}
