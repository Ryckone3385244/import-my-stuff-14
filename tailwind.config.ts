import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "0.625rem",  // 10px mobile
        md: "1rem",           // 16px tablet
        lg: "1.5rem",         // 24px desktop
        xl: "2rem",           // 32px large screens
      },
      screens: {
        sm: "640px",
        md: "768px",          // tablets get 768px max-width
        lg: "1024px",
        xl: "1140px",         // xl (1280-1535px) uses 1140px
        "2xl": "1400px",      // 1536px+ uses 1400px (original)
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
          dark: "hsl(var(--primary-dark))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          title: "hsl(var(--card-title))",
        },
        "green-card": {
          DEFAULT: "hsl(var(--green-card))",
          foreground: "hsl(var(--green-card-foreground))",
          title: "hsl(var(--green-card-title))",
        },
        "black-card": {
          DEFAULT: "hsl(var(--black-card))",
          foreground: "hsl(var(--black-card-foreground))",
          title: "hsl(var(--black-card-title))",
        },
        "gray-card": {
          DEFAULT: "hsl(var(--gray-card))",
          foreground: "hsl(var(--gray-card-foreground))",
          title: "hsl(var(--gray-card-title))",
        },
        "transparent-card": {
          DEFAULT: "transparent",
          foreground: "hsl(var(--transparent-card-foreground))",
          title: "hsl(var(--transparent-card-title))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        heading: "var(--font-heading)",
        body: "var(--font-body)",
      },
      fontSize: {
        'h1': 'var(--h1-size)',
        'h2': 'var(--h2-size)',
        'h3': 'var(--h3-size)',
        'h4': 'var(--h4-size)',
        'h5': 'var(--h5-size)',
        'h6': 'var(--h6-size)',
        '5xl': 'var(--text-5xl, 3rem)',
        '4xl': 'var(--text-4xl, 2.25rem)',
        '3xl': 'var(--text-3xl, 1.875rem)',
        '2xl': 'var(--text-2xl, 1.5rem)',
        'xl': 'var(--text-xl, 1.25rem)',
        'lg': 'var(--text-lg, 1.125rem)',
        'base': 'var(--text-base, 1rem)',
        'sm': 'var(--text-sm, 0.875rem)',
        'xs': 'var(--text-xs, 0.75rem)',
      },
      lineHeight: {
        'base': 'var(--line-height-base, 1.5)',
        'heading': 'var(--line-height-heading, 1.2)',
      },
      letterSpacing: {
        'base': 'var(--letter-spacing-base, normal)',
        'heading': 'var(--letter-spacing-heading, -0.02em)',
      },
      fontWeight: {
        'heading': 'var(--font-weight-heading, 700)',
        'body': 'var(--font-weight-body, 400)',
      },
      spacing: {
        'card': 'var(--card-padding)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(30px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-in": {
          "0%": {
            transform: "translateX(-100%)",
          },
          "100%": {
            transform: "translateX(0)",
          },
        },
        "scroll": {
          "0%": {
            transform: "translateX(0)",
          },
          "100%": {
            transform: "translateX(-50%)",
          },
        },
        "slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(100px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-in-right": {
          "0%": {
            opacity: "0",
            transform: "translateX(50px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "stretch-in": {
          "0%": {
            maxHeight: "0",
            opacity: "0",
          },
          "100%": {
            maxHeight: "1000px",
            opacity: "1",
          },
        },
        "form-appear": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        "fade-up": "fade-up 0.8s ease-out",
        "slide-in": "slide-in 0.4s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "stretch-in": "stretch-in 0.5s ease-out",
        "form-appear": "form-appear 0.4s ease-out 0.3s forwards",
        "scroll": "scroll 30s linear infinite",
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        "glow-strong": "var(--shadow-glow-strong)",
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        inner: "var(--shadow-inner)",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-hero": "var(--gradient-hero)",
        "gradient-card": "var(--gradient-card)",
        "gradient-title": "var(--gradient-title)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
