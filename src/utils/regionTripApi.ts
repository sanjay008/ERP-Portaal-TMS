import apiConstants from '@/src/api/apiConstants';
import ApiService from '@/src/utils/Apiservice';

type TripUserContext = {
  UserData: any;
  selectRegionData?: any;
  region_id?: number | string;
};

export const getCurrentTimeString = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

export const buildDateTime = (date: string, time: string) => {
  const normalizedTime = time.trim().length === 5 ? `${time}:00` : time;
  return `${date} ${normalizedTime}`;
};

export const tripOn = async ({
  UserData,
  selectRegionData,
  region_id,
  planning_date,
  started_at,
}: TripUserContext & {
  planning_date: string;
  started_at: string;
}) => {
  const payload = {
    token: UserData?.user?.verify_token,
    relaties_id: UserData?.relaties?.id,
    user_id: UserData?.user?.id,
    role: UserData?.user?.role,
    region_id: region_id ?? selectRegionData?.id,
    planning_date,
    started_at,
  };

  console.log('[tripOn] request', payload);

  const response = await ApiService(apiConstants.start_region_trip, {
    customData: payload,
  });

  console.log('[tripOn] response', response);
  return response;
};

export const tripOff = async ({
  UserData,
  selectRegionData,
  region_id,
  planning_date,
  ended_at,
}: TripUserContext & {
  planning_date: string;
  ended_at: string;
}) => {
  const payload = {
    token: UserData?.user?.verify_token,
    relaties_id: UserData?.relaties?.id,
    user_id: UserData?.user?.id,
    role: UserData?.user?.role,
    region_id: region_id ?? selectRegionData?.id,
    planning_date,
    ended_at,
  };

  console.log('[tripOff] request', payload);

  const response = await ApiService(apiConstants.end_region_trip, {
    customData: payload,
  });

  console.log('[tripOff] response', response);
  return response;
};
