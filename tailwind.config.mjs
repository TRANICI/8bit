/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          base: '#0a0420',
          grid: '#1a0a3a',
          deep: '#06021a',
        },
        neon: {
          cyan: '#00f0ff',
          magenta: '#ff00cc',
          yellow: '#ffea00',
          lime: '#7cff5b',
        },
        type: {
          base: '#e6e0ff',
          dim: '#9b8cc7',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', '"VT323"', 'monospace'],
        terminal: ['"VT323"', 'ui-monospace', 'monospace'],
        accent: ['"Silkscreen"', '"Press Start 2P"', 'monospace'],
      },
      boxShadow: {
        dither: '4px 4px 0 0 #ff00cc',
        'dither-cyan': '4px 4px 0 0 #00f0ff',
        'dither-yellow': '4px 4px 0 0 #ffea00',
      },
    },
  },
  plugins: [],
};
