export function getOrderStatusId(order: any): number {
  return Number(order?.tmsstatus?.id ?? order?.status ?? 0);
}

/** Order is in pickup phase (status id 1). */
export function isPickupOrder(order: any): boolean {
  return getOrderStatusId(order) === 1;
}

/** Order is in delivery phase (status id 4). */
export function isDeliveryOrder(order: any): boolean {
  return getOrderStatusId(order) === 4;
}

/** Order is in delivery or post-delivery phase (status id 4 or 5). */
export function isDeliveryPhaseOrder(order: any): boolean {
  const id = getOrderStatusId(order);
  return id === 4 || id === 5;
}
