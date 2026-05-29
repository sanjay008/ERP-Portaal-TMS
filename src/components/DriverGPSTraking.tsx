import useUserGPS from '../hooks/useUserGPS';

export default function DriverGPSTraking() {
    const {
        userCoordinate,
        isSending,
        permissionDenied,
        isGpsTracking,
        setIsGpsTracking,
    } = useUserGPS();
    return null
}