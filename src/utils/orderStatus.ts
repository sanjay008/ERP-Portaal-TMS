export function getOrderStatusId(order: any): number {
  return Number(order?.tmsstatus?.id ?? order?.status ?? 0);
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
