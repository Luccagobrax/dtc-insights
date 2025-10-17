export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        neometric: ['Neometric', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        platform: '#E4E4E6',
      },
      boxShadow: {
        card: '0 10px 30px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
