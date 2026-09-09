export const LOCKED_ADD_PRODUCT_STATUS_ID = 31;
export const SUPERADMIN_ROLE = 'superadmin';

export function getOrderStatusId(order: any): number {
  return Number(order?.tmsstatus?.id ?? order?.status ?? 0);
}

export function isSuperAdminRole(role?: string | null): boolean {
  return String(role || '').toLowerCase() === SUPERADMIN_ROLE;
}

/** Status 31 locks add/update product for everyone except superadmin. */
export function isProductActionLockedForRole(
  order: any,
  role?: string | null,
): boolean {
  return getOrderStatusId(order) === LOCKED_ADD_PRODUCT_STATUS_ID && !isSuperAdminRole(role);
}

export function isPickupOrder(order: any): boolean {
  return getOrderStatusId(order) === 1 || getOrderStatusId(order) === 37 || getOrderStatusId(order) === 42;
}

export function isDeliveryOrder(order: any): boolean {
  return getOrderStatusId(order) === 4;
}

export function isDeliveryPhaseOrder(order: any): boolean {
  const id = getOrderStatusId(order);
  return id === 4 || id === 5;
}

/** Rejection allowed original statuses: 2 / 4 / 5 only (status 3 is NOT allowed). */
export function isRejectionAllowedOrder(order: any): boolean {
  if (!order || isPickupOrder(order)) return false;
  const id = getOrderStatusId(order);
  return id === 2 || id === 4 || id === 5;
}
