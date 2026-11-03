type LocationParts = Pick<Location, "hash" | "pathname" | "search">;
type HistoryUpdater = Pick<History, "state" | "replaceState">;

/**
 * Read the OAuth error code and remove it from the URL so a reload or a share
 * cannot repeat a stale message. Other query params and the fragment survive.
 * Returns null (and never touches history) when there is no error.
 */
export function takeAuthCallbackError(
  location: LocationParts,
  history: HistoryUpdater,
): string | null {
  const params = new URLSearchParams(location.search);
  const code = params.get("error");
  if (!code) return null;

  params.delete("error");
  params.delete("error_description");
  const query = params.toString();
  history.replaceState(
    history.state,
    "",
    `${location.pathname}${query ? `?${query}` : ""}${location.hash}`,
  );
  return code;
}
