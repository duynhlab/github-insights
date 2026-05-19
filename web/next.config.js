/** @type {import('next').NextConfig} */
const repo = process.env.GH_PAGES_BASE || "";
module.exports = {
  output: "export",
  images: { unoptimized: true },
  basePath: repo,
  assetPrefix: repo,
  trailingSlash: true,
};
