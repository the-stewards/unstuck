// Next's bundler aliases "server-only" to a no-op for server bundles and to
// a throwing shim for client bundles. Vitest runs in plain Node, outside
// that pipeline, so the real "server-only" package would throw on every
// import — this file stands in for it in vitest.config.ts instead.
export {};
