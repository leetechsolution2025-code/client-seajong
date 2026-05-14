"use client";

import { useEffect } from "react";

export function BootstrapInit() {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return null;
}
