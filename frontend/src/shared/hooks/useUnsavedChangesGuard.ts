import { useEffect } from "react";

const DEFAULT_MESSAGE = "You have unsaved changes. Are you sure you want to leave this page?";

export function useUnsavedChangesGuard(isDirty: boolean, message = DEFAULT_MESSAGE) {
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, message]);
}

