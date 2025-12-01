export function goBackOrPopTo(
  navigation: any,
  targetScreen: string,
  params?: any
) {
  const state = navigation.getState();
  const routes = state.routes;

  // Find last occurrence of targetScreen in stack
  const lastIndex = routes
    .map((r: any, i: number) => ({ name: r.name, index: i }))
    .filter(r => r.name === targetScreen)
    .map(r => r.index)
    .pop();

  if (lastIndex !== undefined) {
    // Target screen exists in stack
    const popCount = routes.length - 1 - lastIndex;
    if (popCount > 0) {
      navigation.pop(popCount);
    }

    // Pass params if provided
    if (params) {
      navigation.navigate(targetScreen, {
        ...params,
        _fromBack: true,
      });
    }
  } else {
    // Target screen not in stack
    navigation.navigate(targetScreen, params);
  }
}
