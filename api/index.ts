import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const { app } = _require("./_bundle.cjs") as any;
export default app;
