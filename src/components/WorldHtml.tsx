import { Html } from "@react-three/drei";
import type { ComponentProps, MutableRefObject } from "react";

/**
 * Shared fixed-viewport DOM portal for drei <Html transform> panels.
 * ScrollControls rebinds R3F `events.connected` to the scrolling div, which scrolls
 * `position: absolute; top: 0` Html layers off-screen on stations > 0. Portalling into
 * a fixed full-viewport layer keeps every station's 3D-transformed HTML crisp & clickable.
 */
export const htmlPortalRef: MutableRefObject<HTMLDivElement | null> = { current: null };

type WorldHtmlProps = ComponentProps<typeof Html>;

export function WorldHtml({ zIndexRange = [14, 1], ...props }: WorldHtmlProps): JSX.Element {
  const portal = htmlPortalRef.current
    ? (htmlPortalRef as MutableRefObject<HTMLElement>)
    : undefined;
  return <Html portal={portal} zIndexRange={zIndexRange} {...props} />;
}
