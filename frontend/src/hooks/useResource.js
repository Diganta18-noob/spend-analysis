import { useEffect, useState } from "react";
export function useResource(load, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function run() {
      setState((previous) => ({ ...previous, loading: true, error: "" }));
      try {
        const data = await load();
        if (active) setState({ data, loading: false, error: "" });
      } catch (error) {
        if (!active) return;
        if (error.status === 401 || error.message === "Unauthorized") {
          sessionStorage.removeItem("admin_token");
          window.location.hash = "#/admin/login";
        }
        setState((previous) => ({
          ...previous,
          loading: false,
          error: error.message,
        }));
      }
    }
    void run();
    return () => {
      active = false;
    };
    // Caller declares stable request inputs; inline load functions must not retrigger requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, revision]);
  return { ...state, refresh: () => setRevision((value) => value + 1) };
}
