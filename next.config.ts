import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `next dev` only trusts `localhost` by default. Reaching the dev server on any other
   * origin (127.0.0.1, or the WSL host IP from a Windows browser) makes it reject the HMR
   * websocket upgrade, which silently aborts the client bootstrap: the page renders but
   * never hydrates, so nothing is clickable and scroll-reveal never fires. Trusting these
   * origins keeps dev usable however you reach it. No effect on production builds.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
