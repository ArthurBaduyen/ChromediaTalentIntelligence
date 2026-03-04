/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        brand: "rgb(var(--ds-semantic-action-primary) / <alpha-value>)",
        surface: {
          app: "rgb(var(--ds-semantic-bg-canvas) / <alpha-value>)",
          default: "rgb(var(--ds-semantic-bg-surface) / <alpha-value>)",
          muted: "rgb(var(--ds-semantic-bg-muted) / <alpha-value>)",
          overlay: "rgb(var(--ds-semantic-bg-overlay) / <alpha-value>)"
        },
        text: {
          primary: "rgb(var(--ds-semantic-text-primary) / <alpha-value>)",
          secondary: "rgb(var(--ds-semantic-text-secondary) / <alpha-value>)",
          muted: "rgb(var(--ds-semantic-text-muted) / <alpha-value>)",
          inverse: "rgb(var(--ds-semantic-text-inverse) / <alpha-value>)",
          danger: "rgb(var(--ds-semantic-text-danger) / <alpha-value>)"
        },
        border: {
          default: "rgb(var(--ds-semantic-border-default) / <alpha-value>)",
          subtle: "rgb(var(--ds-semantic-border-subtle) / <alpha-value>)",
          focus: "rgb(var(--ds-semantic-border-focus) / <alpha-value>)",
          danger: "rgb(var(--ds-semantic-border-danger) / <alpha-value>)"
        },
        action: {
          primary: "rgb(var(--ds-semantic-action-primary) / <alpha-value>)",
          "primary-hover": "rgb(var(--ds-semantic-action-primary-hover) / <alpha-value>)",
          secondary: "rgb(var(--ds-semantic-action-secondary) / <alpha-value>)",
          "secondary-hover": "rgb(var(--ds-semantic-action-secondary-hover) / <alpha-value>)",
          ghost: "rgb(var(--ds-semantic-action-ghost) / <alpha-value>)",
          "ghost-hover": "rgb(var(--ds-semantic-action-ghost-hover) / <alpha-value>)",
          danger: "rgb(var(--ds-semantic-action-danger) / <alpha-value>)",
          "danger-hover": "rgb(var(--ds-semantic-action-danger-hover) / <alpha-value>)"
        },
        status: {
          success: "rgb(var(--ds-semantic-status-success) / <alpha-value>)",
          warning: "rgb(var(--ds-semantic-status-warning) / <alpha-value>)",
          danger: "rgb(var(--ds-semantic-status-danger) / <alpha-value>)"
        },
        danger: {
          100: "rgb(254 242 242 / <alpha-value>)"
        }
      },
      spacing: {
        1: "var(--ds-core-space-1)",
        2: "var(--ds-core-space-2)",
        3: "var(--ds-core-space-3)",
        4: "var(--ds-core-space-4)",
        5: "var(--ds-core-space-5)",
        6: "var(--ds-core-space-6)",
        8: "var(--ds-core-space-8)",
        10: "var(--ds-core-space-10)",
        12: "var(--ds-core-space-12)"
      },
      borderRadius: {
        sm: "var(--ds-core-radius-sm)",
        md: "var(--ds-core-radius-md)",
        lg: "var(--ds-core-radius-lg)",
        xl: "var(--ds-core-radius-xl)",
        pill: "var(--ds-core-radius-pill)"
      },
      boxShadow: {
        sm: "var(--ds-core-shadow-sm)",
        md: "var(--ds-core-shadow-md)",
        lg: "var(--ds-core-shadow-lg)"
      },
      fontSize: {
        xs: ["var(--ds-core-type-size-xs)", { lineHeight: "var(--ds-core-type-line-xs)" }],
        sm: ["var(--ds-core-type-size-sm)", { lineHeight: "var(--ds-core-type-line-sm)" }],
        base: ["var(--ds-core-type-size-base)", { lineHeight: "var(--ds-core-type-line-base)" }],
        lg: ["var(--ds-core-type-size-lg)", { lineHeight: "var(--ds-core-type-line-lg)" }],
        xl: ["var(--ds-core-type-size-xl)", { lineHeight: "var(--ds-core-type-line-xl)" }],
        "2xl": ["var(--ds-core-type-size-2xl)", { lineHeight: "var(--ds-core-type-line-2xl)" }]
      }
    }
  },
  plugins: []
};
