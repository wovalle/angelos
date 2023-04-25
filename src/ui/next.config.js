/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  experimental: {
    newNextLinkBehavior: true,
  },
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.tsx?/,
      exclude: /(node_modules)/,

      use: [options.defaultLoaders.babel],
    })

    return config
  },
}

module.exports = nextConfig
