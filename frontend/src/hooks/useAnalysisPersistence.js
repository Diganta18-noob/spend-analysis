import { useRef, useState } from "react";
import { updateAnalysis } from "../services/apiService";

// Owned by the portal container so pending edits survive leaving a viewer.
export function useAnalysisPersistence({
  analysis,
  onChange,
  getToken,
  admin = false,
}) {
  const sessions = useRef(new Map());
  const [states, setStates] = useState({});
  const persisted =
    analysis?.id && analysis.id !== "sample" && !analysis.session_only;
  const state = states[analysis?.id] || {
    state: "saved",
    error: "",
    edits: [],
  };
  const notify = (id, session, status, error = "") =>
    setStates((previous) => ({
      ...previous,
      [id]: { state: status, error, edits: [...session.pending.values()] },
    }));
  async function flush() {
    if (!persisted) return;
    const id = analysis.id;
    const session = sessions.current.get(id);
    if (!session || session.busy || !session.pending.size) return;
    session.busy = true;
    notify(id, session, "saving");
    try {
      while (session.pending.size) {
        const edits = [...session.pending.values()];
        const credentials = admin
          ? { admin: true }
          : { userToken: await getToken() };
        if (!admin && !credentials.userToken)
          throw new Error("Sign in again to save changes");
        await updateAnalysis(id, { edits }, credentials);
        onChange((previous) =>
          !previous || previous.id !== id
            ? previous
            : {
                ...previous,
                transactions: previous.transactions.map((row, index) => {
                  const edit =
                    session.pending.get(index) ||
                    edits.find((item) => item.index === index);
                  return edit ? { ...row, cat: edit.cat } : row;
                }),
              },
        );
        for (const edit of edits)
          if (session.pending.get(edit.index) === edit)
            session.pending.delete(edit.index);
        notify(id, session, session.pending.size ? "saving" : "saved");
      }
    } catch (error) {
      notify(id, session, "failed", error.message);
    } finally {
      session.busy = false;
    }
  }
  function apply(edits) {
    onChange((previous) => ({
      ...previous,
      transactions: previous.transactions.map((row, index) => {
        const edit = edits.find((item) => item.index === index);
        return edit ? { ...row, cat: edit.cat } : row;
      }),
    }));
    if (persisted) {
      if (!sessions.current.has(analysis.id))
        sessions.current.set(analysis.id, { pending: new Map(), busy: false });
      const session = sessions.current.get(analysis.id);
      for (const edit of edits) session.pending.set(edit.index, edit);
      notify(analysis.id, session, "saving");
      void flush();
    }
  }
  const visibleAnalysis =
    analysis && state.edits.length
      ? {
          ...analysis,
          transactions: analysis.transactions.map((row, index) => {
            const edit = state.edits.find((item) => item.index === index);
            return edit ? { ...row, cat: edit.cat } : row;
          }),
        }
      : analysis;
  return {
    analysis: visibleAnalysis,
    editCategory: (index, cat) => apply([{ index, cat }]),
    editMerchantCategory: (indices, cat) =>
      apply(indices.map((index) => ({ index, cat }))),
    saveState: persisted ? state.state : "local",
    saveError: state.error,
    retrySave: flush,
  };
}
