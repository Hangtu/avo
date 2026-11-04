type LocationParts = Pick<Location, "hash" | "pathname" | "search">;
type HistoryUpdater = Pick<History, "state" | "replaceState">;

/** Remove only the legacy fragment Facebook appends after OAuth redirects. */
export function removeFacebookOAuthFragment(location: LocationParts, history: HistoryUpdater): boolean {
  if (location.hash !== "#_=_") return false;

  history.replaceState(history.state, "", `${location.pathname}${location.search}`);
  return true;
}
