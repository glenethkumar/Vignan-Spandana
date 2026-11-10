/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: '#FAFAFA',
        card: '#FFFFFF',
        'soft-card': '#F7F7F7',
        'hairline': '#E6E8EB',
        'input-border': '#D0D5DD',
        ink: '#111111',
        'text-main': '#1F2933',
        muted: '#6B7280',
        'icon-box': '#F5F6F8',
        brand: {
          DEFAULT: '#014A97',
          dark: '#0B2038',
          accent: '#0498ED',
          50: '#EAF3FC',
          100: '#D0E4FA',
        },
        issue: {
          DEFAULT: '#C2410C',
          icon: '#EA580C',
          tint: '#FFF1E6',
          border: '#FDBA74',
        },
        banner: {
          error: '#FDF1EE',
          'error-border': '#F5C9C0',
          'error-text': '#7F1D1D',
        },
        status: {
          green: '#10B981',
          'green-bg': '#ECFDF5',
          'green-text': '#047857',
        }
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
        panel: '24px',
        'panel-lg': '28px',
        pill: '9999px',
        btn: '9999px',
        input: '12px',
        'icon-box': '12px',
        phone: '44px',
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0, 0, 0, 0.06)',
        'soft-hover': '0 12px 36px rgba(0, 0, 0, 0.09)',
        modal: '0 20px 40px rgba(0, 0, 0, 0.12)',
      },
      letterSpacing: {
        eyebrow: '0.18em',
        sub: '0.2em',
        tightest: '-0.045em',
        tighter: '-0.035em',
      }
    },
  },
  plugins: [],
}

