import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app. Without this, Next walks up the tree,
  // finds sibling/parent lockfiles, and infers d:\Projects\triage as the root,
  // which makes the dev watcher recurse over both node_modules trees.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
