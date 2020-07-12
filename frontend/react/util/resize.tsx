/* eslint-disable @typescript-eslint/no-type-alias */
export type LayoutMap = Map<string, [number, number]>;

export interface ResizeableState {
  sizes: LayoutMap;
}

export type ResizeableComponent<P, S extends ResizeableState> = React.Component<P, S>;

export function handleLayoutChange<P, S extends ResizeableState>(
  layout: ReactGridLayout.Layout[],
  component: ResizeableComponent<P, S>): void {

  if (layout.length === 0) {
    return;
  }

  component.setState(state => {
    const currentMap = state.sizes;
    const layoutMap: LayoutMap = new Map();

    let changed = false;

    for(const item of layout) {
      const currentLayout = currentMap.get(item.i);
      const hasLayoutChange = currentLayout === undefined ||
          currentLayout[0] !== item.w || currentLayout[1] !== item.h;

      if (hasLayoutChange) {
        layoutMap.set(item.i, [item.w, item.h]);
        changed = true;
      } else if (currentLayout) {
        layoutMap.set(item.i, currentLayout);
      } else {
        layoutMap.set(item.i, [item.w, item.h]);
      }
    }

    if (changed) {
      return { sizes: layoutMap };
    } else {
      return { sizes: currentMap };
    }
  });
}
