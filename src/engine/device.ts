/** Preserve the distinction between a touch device and a narrow desktop window. */
export const isMobileDevice=navigator.maxTouchPoints>0&&/Android|iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
