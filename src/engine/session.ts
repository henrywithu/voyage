/** Keep the reader's place when Vite replaces a scene or shader module. */
interface ReadingSession {
  entered: boolean;
  scroll: number;
  selected: number;
  muted: boolean;
  time: number;
}
export const readingSession: ReadingSession = import.meta.hot?.data
  .readingSession ?? {
  entered: false,
  scroll: 0,
  selected: 0,
  muted: false,
  time: 0,
};
if (import.meta.hot)
  import.meta.hot.dispose((data) => {
    data.readingSession = readingSession;
  });
