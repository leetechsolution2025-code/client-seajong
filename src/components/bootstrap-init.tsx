"use client";

import { useEffect } from "react";

// Safe patch for touch / mobile emulation where releasePointerCapture throws NotFoundError
if (typeof window !== "undefined" && typeof Element !== "undefined") {
  const origRelease = Element.prototype.releasePointerCapture;
  if (origRelease) {
    Element.prototype.releasePointerCapture = function (pointerId: number) {
      try {
        if (this.hasPointerCapture && !this.hasPointerCapture(pointerId)) {
          return;
        }
        return origRelease.call(this, pointerId);
      } catch {
        // Silently swallow NotFoundError / InvalidPointerId when pointer is inactive
      }
    };
  }

  const origSet = Element.prototype.setPointerCapture;
  if (origSet) {
    Element.prototype.setPointerCapture = function (pointerId: number) {
      try {
        return origSet.call(this, pointerId);
      } catch {
        // Silently swallow InvalidPointerId
      }
    };
  }

  window.addEventListener("error", (event) => {
    if (
      event?.message &&
      (event.message.includes("releasePointerCapture") ||
        event.message.includes("No active pointer"))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

export function BootstrapInit() {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return null;
}

