import {
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Blockquote,
  Button,
  Card,
  Checkbox,
  Chip,
  Container,
  createTheme,
  Dialog,
  Indicator,
  MantineColorsTuple,
  MantineThemeOverride,
  Mark,
  NavLink,
  Pagination,
  Paper,
  Radio,
  rem,
  SegmentedControl,
  Select,
  Stepper,
  Switch,
  ThemeIcon,
  Timeline,
  Tooltip,
	alpha,
	CSSVariablesResolver
} from "@mantine/core";

const CONTAINER_SIZES: Record<string, string> = {
  xxs: rem("200px"),
  xs: rem("300px"),
  sm: rem("400px"),
  md: rem("500px"),
  lg: rem("600px"),
  xl: rem("1400px"),
  xxl: rem("1600px"),
};

const zincColors: MantineColorsTuple = ["#fafafa","#f4f4f5","#e4e4e7","#d4d4d8","#a1a1aa","#52525b","#3f3f46","#27272a","#18181b","#09090b","#71717A"];
const slateColors: MantineColorsTuple = ["#f8fafc","#f1f5f9","#e2e8f0","#cbd5e1","#94a3b8","#475569","#334155","#1e293b","#0f172a","#020817","#64748B"];
const grayColors: MantineColorsTuple = ["#f9fafb","#f3f4f6","#e5e7eb","#d1d5db","#9ca3af","#4b5563","#374151","#1f2937","#111827","#030712","#6B7280"];
const neutralColors: MantineColorsTuple = ["#fafafa","#f5f5f5","#e5e5e5","#d4d4d4","#a3a3a3","#525252","#404040","#262626","#171717","#0a0a0a","#737373"];
const stoneColors: MantineColorsTuple = ["#fafaf9","#f5f5f4","#e7e5e4","#d6d3d1","#a8a29e","#57534e","#44403c","#292524","#1c1917","#0c0a09","#78716C"];
const redColors: MantineColorsTuple = ["#FEF2F2","#FEE2E2","#FECACA","#FCA5A5","#F87171","#DC2626","#B91C1C","#991B1B","#7F1D1D","#450A0A","#EF4444"];
const roseColors: MantineColorsTuple = ["#fff1f2","#ffe4e6","#fecdd3","#fda4af","#fb7185","#e11d48","#be123c","#9f1239","#881337","#4c0519","#F43F5E"];
const orangeColors: MantineColorsTuple = ["#fff7ed","#ffedd5","#fed7aa","#fdba74","#fb923c","#f97316","#ea580c","#9a3412","#7c2d12","#431407","#F97316"];
const amberColors: MantineColorsTuple = ["#FFFBEB","#FEF3C7","#FDE68A","#FCD34D","#FBBF24","#f59e0b","#D97706","#92400E","#78350F","#451A03","#F59E0B"];
const yellowColors: MantineColorsTuple = ["#fefce8","#fef9c3","#fef08a","#fde047","#facc15","#ca8a04","#a16207","#854d0e","#713f12","#3f2c06","#F59E0B"];
const limeColors: MantineColorsTuple = ["#f7fee7","#ecfccb","#d9f99d","#bef264","#a3e635","#4d7c0f","#3f6212","#365314","#1a2e05","#0f1903","#84CC16"];
const greenColors: MantineColorsTuple = ["#F0FDF4","#DCFCE7","#BBF7D0","#86EFAC","#4ADE80","#22c55e","#16A34A","#166534","#14532D","#052E16","#10B981"];
const emeraldColors: MantineColorsTuple = ["#ecfdf5","#d1fae5","#a7f3d0","#6ee7b7","#34d399","#059669","#047857","#065f46","#064e3b","#022c22","#10B981"];
const tealColors: MantineColorsTuple = ["#f0fdfa","#ccfbf1","#99f6e4","#5eead4","#2dd4bf","#0d9488","#0f766e","#115e59","#134e4a","#042f2e","#14B8A6"];
const cyanColors: MantineColorsTuple = ["#ecfeff","#cffafe","#a5f3fc","#67e8f9","#22d3ee","#0891b2","#0e7490","#155e75","#164e63","#083344","#06B6D4"];
const skyColors: MantineColorsTuple = ["#f0f9ff","#e0f2fe","#bae6fd","#7dd3fc","#38bdf8","#0284c7","#0369a1","#075985","#0c4a6e","#082f49","#0EA5E9"];
const blueColors: MantineColorsTuple = ["#eff6ff","#dbeafe","#bfdbfe","#93c5fd","#60a5fa","#3b82f6","#2563eb","#1e40af","#1e3a8a","#172554","#3B82F6"];
const indigoColors: MantineColorsTuple = ["#eef2ff","#e0e7ff","#c7d2fe","#a5b4fc","#818cf8","#4f46e5","#4338ca","#3730a3","#312e81","#1e1b4b","#6366F1"];
const violetColors: MantineColorsTuple = ["#f5f3ff","#ede9fe","#ddd6fe","#c4b5fd","#a78bfa","#7c3aed","#6d28d9","#5b21b6","#4c1d95","#1e1b4b","#8B5CF6"];
const purpleColors: MantineColorsTuple = ["#faf5ff","#f3e8ff","#e9d5ff","#d8b4fe","#c084fc","#9333ea","#7e22ce","#6b21a8","#581c87","#2e1065","#A855F7"];
const fuchsiaColors: MantineColorsTuple = ["#fdf4ff","#fae8ff","#f5d0fe","#f0abfc","#e879f9","#c026d3","#a21caf","#86198f","#701a75","#4a044e","#D946EF"];
const pinkColors: MantineColorsTuple = ["#fdf2f8","#fce7f3","#fbcfe8","#f9a8d4","#f472b6","#db2777","#be185d","#9d174d","#831843","#500724","#EC4899"];

export const theme: MantineThemeOverride = createTheme({
  colors: {
    slate: slateColors,
    gray: grayColors,
    zinc: zincColors,
    neutral: neutralColors,
    stone: stoneColors,

    red: redColors,
    rose: roseColors,
    orange: orangeColors,
    amber: amberColors,
    yellow: yellowColors,

    lime: limeColors,
    green: greenColors,
    emerald: emeraldColors,

    teal: tealColors,
    cyan: cyanColors,
    sky: skyColors,
    blue: blueColors,

    indigo: indigoColors,
    violet: violetColors,
    purple: purpleColors,
    fuchsia: fuchsiaColors,
    pink: pinkColors,

    primary: grayColors,
    secondary: grayColors,
    dark: grayColors,

    error: redColors as MantineColorsTuple,
    success: greenColors,
    info: blueColors,
    warning: amberColors,
  },
  focusRing: "never",
  scale: 1.2,
  primaryColor: "primary",
  primaryShade: {"light":8,"dark":0},
  autoContrast: true,
  luminanceThreshold: 0.3,
  fontFamily: "Public Sans, sans-serif",
  radius: {
    xs: rem("6px"),
    sm: rem("8px"),
    md: rem("12px"),
    lg: rem("16px"),
    xl: rem("24px"),
  },
  defaultRadius: "sm",
  spacing: {
    "4xs": rem("2px"),
    "3xs": rem("4px"),
    "2xs": rem("8px"),
    xs: rem("10px"),
    sm: rem("12px"),
    md: rem("16px"),
    lg: rem("20px"),
    xl: rem("24px"),
    "2xl": rem("28px"),
    "3xl": rem("32px"),
    "4xl": rem("40px"),
  },
  fontSizes: {
    xs: rem("12px"),
    sm: rem("14px"),
    md: rem("16px"),
    lg: rem("18px"),
    xl: rem("20px"),
    "2xl": rem("24px"),
    "3xl": rem("30px"),
    "4xl": rem("36px"),
    "5xl": rem("48px"),
  },
  lineHeights: {
    xs: rem("18px"),
    sm: rem("20px"),
    md: rem("24px"),
    lg: rem("28px"),
  },

  headings: {
    fontFamily: "Montserrat, sans-serif",
    sizes: {
      h1: {
        fontSize: rem("36px"),
        lineHeight: rem("44px"),
        fontWeight: "800",
      },
      h2: {
        fontSize: rem("30px"),
        lineHeight: rem("38px"),
        fontWeight: "700",
      },
      h3: {
        fontSize: rem("24px"),
        lineHeight: rem("32px"),
        fontWeight: "600",
      },
      h4: {
        fontSize: rem("20px"),
        lineHeight: rem("30px"),
        fontWeight: "600",
      },
    },
  },
  shadows: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.05)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)",
    xxl: "0 25px 50px rgba(0, 0, 0, 0.25)",
  },

  cursorType: "pointer",
  other: {
    style: "shadcn",
  },
  components: {
    Container: Container.extend({
      vars: (_, { size, fluid }) => ({
        root: {
          "--container-size": fluid
            ? "100%"
            : size !== undefined && size in CONTAINER_SIZES
              ? CONTAINER_SIZES[size]
              : rem(size),
        },
      }),
    }),
    Checkbox: Checkbox.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        return {
          root: {
            "--checkbox-color": colorKey ? `var(--mantine-color-${colorKey}-filled)` : 'var(--mantine-primary-color-filled)',

            "--checkbox-icon-color": colorKey ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)',
          },
        };
      },
    }),
    Chip: Chip.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        const variant = props.variant ?? "filled";
        return {
          root: {
            "--chip-bg":
              variant !== "light"
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-filled)`
                  : "var(--mantine-primary-color-filled)"
                : undefined,
            "--chip-color":
              variant === "filled"
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-contrast)`
                  : "var(--mantine-primary-color-contrast)"
                : undefined,
          },
        };
      },
    }),
    Radio: Radio.extend({
      vars: (theme, props) => ({
        root: {
          "--radio-color": props.color
            ? Object.keys(theme.colors).includes(props.color)
              ? `var(--mantine-color-${props.color}-filled)`
              : props.color
            : "var(--mantine-primary-color-filled)",

          "--radio-icon-color": props.color
            ? Object.keys(theme.colors).includes(props.color)
              ? `var(--mantine-color-${props.color}-contrast)`
              : props.color
            : "var(--mantine-primary-color-contrast)",
        },
      }),
    }),
    SegmentedControl: SegmentedControl.extend({
      vars: (theme, props) => ({
        root: {
          "--sc-color": props.color
            ? Object.keys(theme.colors).includes(props.color)
              ? ["zinc", "slate", "gray", "neutral", "stone"].includes(props.color)
                ? "var(--mantine-color-body)"
                : `var(--mantine-color-${props.color}-filled)`
              : props.color
            : "var(--mantine-color-default)",
        },
      }),
    }),
    Switch: Switch.extend({
      styles: () => ({
        thumb: {
          backgroundColor: "var(--mantine-color-default)",
          borderColor: "var(--mantine-color-default-border)",
        },
        track: {
          borderColor: "var(--mantine-color-default-border)",
        },
      }),
    }),
    Select: Select.extend({
      defaultProps: {
        checkIconPosition: "right",
      },
    }),
    ActionIcon: ActionIcon.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey);
        const isNeutralPrimaryColor = !colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(theme.primaryColor);
        const variant = props.variant ?? "filled";

        return {
          root: {
            "--ai-color": (() => {
              if (variant === "filled") {
                if (colorKey) {
                  return `var(--mantine-color-${colorKey}-contrast)`;
                }
                return "var(--mantine-primary-color-contrast)";
              }
              if (variant === "white") {
                if (isNeutralColor || isNeutralPrimaryColor) {
                  return "var(--mantine-color-black)";
                }
                return undefined;
              }
              return undefined;
            })(),
          },
        };
      }
    }),
    Button: Button.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey);
        const isNeutralPrimaryColor = !colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(theme.primaryColor);
        const variant = props.variant ?? "filled";
        return {
          root: {
            "--button-color":(() => {
              if (variant === "filled") {
                if (colorKey) {
                  return `var(--mantine-color-${colorKey}-contrast)`;
                }
                return "var(--mantine-primary-color-contrast)";
              }
              if (variant === "white") {
                if (isNeutralColor || isNeutralPrimaryColor) {
                  return "var(--mantine-color-black)";
                }
                return undefined;
              }
              return undefined;
            })(),
          },
        };
      },
    }),
    Anchor: Anchor.extend({
      defaultProps: {
        underline: "always",
      },
    }),
    NavLink: NavLink.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        const variant = props.variant ?? "light";
        return {
          root: {
            "--nl-color":
              variant === "filled" ? colorKey ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)' : undefined,
          },
          children: {},
        };
      },
    }),
    Pagination: Pagination.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        return {
          root: {
            "--pagination-active-color": colorKey
              ? `var(--mantine-color-${colorKey}-contrast)`
              : "var(--mantine-primary-color-contrast)",
          },
        };
      },
    }),
    Stepper: Stepper.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        return {
          root: {
            "--stepper-icon-color": colorKey
              ? `var(--mantine-color-${colorKey}-contrast)`
              : "var(--mantine-primary-color-contrast)",
          },
        };
      },
    }),
    Alert: Alert.extend({   
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey)
        const isNeutralPrimaryColor = !colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(theme.primaryColor);
        const variant = props.variant ?? "light";
        return {
          root: {
            "--alert-color":
              variant === "filled"
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-contrast)`
                  : "var(--mantine-primary-color-contrast)"
                : variant === "white"
                ? (isNeutralColor || isNeutralPrimaryColor
                  ? `var(--mantine-color-black)`
                  : undefined)
                : undefined,
          },
        };
      }
    }),
    Dialog: Dialog.extend({
      defaultProps: {
        withBorder: true,
      },
    }),
    Tooltip: Tooltip.extend({
      vars: () => ({
        tooltip: {
          "--tooltip-bg": "var(--mantine-color-primary-color-filled)",
          "--tooltip-color": "var(--mantine-color-primary-color-contrast)",
        },
      }),
    }),
    Avatar: Avatar.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey);
        const isNeutralPrimaryColor = !colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(theme.primaryColor);
        const variant = props.variant ?? "light";
        return {
          root: {
            "--avatar-bg":
              variant === "filled"
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-filled)`
                  : "var(--mantine-primary-color-filled)"
                : variant === "light"
                  ? colorKey
                    ? `var(--mantine-color-${colorKey}-light)`
                    : "var(--mantine-primary-color-light)"
                  : undefined,

            "--avatar-color":
              variant === "filled"
                ? colorKey
                  ? `var(--mantine-color-${colorKey}-contrast)`
                  : "var(--mantine-primary-color-contrast)"
                : variant === "light"
                  ? colorKey
                    ? `var(--mantine-color-${colorKey}-light-color)`
                    : "var(--mantine-primary-color-light-color)"
                  : variant === "white"
                    ? isNeutralColor || isNeutralPrimaryColor
                      ? `var(--mantine-color-black)`
                      : colorKey
                        ? `var(--mantine-color-${colorKey}-outline)`
                        : "var(--mantine-primary-color-filled)"
                    : variant === "outline" || variant === "transparent"
                      ? colorKey
                        ? `var(--mantine-color-${colorKey}-outline)`
                        : "var(--mantine-primary-color-filled)"
                      : undefined,

            "--avatar-bd":
              variant === "outline"
                ? colorKey
                  ? `1px solid var(--mantine-color-${colorKey}-outline)`
                  : "1px solid var(--mantine-primary-color-filled)"
                : undefined,
          },
        };
      },
    }),
    Badge: Badge.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey);
        const isNeutralPrimaryColor = !colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(theme.primaryColor);
        const variant = props.variant ?? "filled";
        return {
          root: {
            "--badge-bg": variant === "filled" && colorKey ? `var(--mantine-color-${colorKey}-filled)` : undefined,
            "--badge-color":
              variant === "filled"
                ? (colorKey ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)')
                : variant === "white"
                  ? (isNeutralColor || isNeutralPrimaryColor
                    ? `var(--mantine-color-black)`
                    : undefined)
                  : undefined,
          },
        };
      },
    }),
    Card: Card.extend({
      defaultProps: {
        p: "xl",
        shadow: "xl",
        withBorder: true,
      },
      styles: (theme) => {
        return {
          root: {
            backgroundColor:
              theme.primaryColor === "rose" || theme.primaryColor === "green"
                ? "var(--mantine-color-secondary-filled)"
                : undefined,
          },
        };
      },
    }),
    Indicator: Indicator.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        return {
          root: {
            "--indicator-text-color": colorKey
              ? `var(--mantine-color-${colorKey}-contrast)`
              : "var(--mantine-primary-color-contrast)",
          },
        };
      },
    }),
    ThemeIcon: ThemeIcon.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey)
        const isNeutralPrimaryColor = !colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(theme.primaryColor);

        const variant = props.variant ?? "filled";
        return {
          root: {
              "--ti-color": variant === "filled"
                ? (colorKey
                  ? `var(--mantine-color-${colorKey}-contrast)`
                  : "var(--mantine-primary-color-contrast)")
                : variant === "white"
                  ? (isNeutralColor || isNeutralPrimaryColor
                    ? `var(--mantine-color-black)`
                    : undefined)
                  : undefined,
          },
        };
      },
    }),
    Timeline: Timeline.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        return {
          root: {
            "--tl-icon-color": colorKey ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)',
          },
        };
      },
    }),
    Blockquote: Blockquote.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : undefined;
        return {
          root: {
            "--bq-bg-dark": colorKey ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)',
            "--bq-bg-light": colorKey ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)',
          },
        };
      },
    }),
    Mark: Mark.extend({
      vars: (theme, props) => {
        const colorKey = props.color && Object.keys(theme.colors).includes(props.color) ? props.color : 'yellow';
        const isNeutralColor = colorKey && ["zinc", "slate", "gray", "neutral", "stone"].includes(colorKey);
        return {
          root: {
            "--mark-bg-light": `var(--mantine-color-${colorKey}-${isNeutralColor ? '3' : 'filled-hover'})`,
            "--mark-bg-dark": `var(--mantine-color-${colorKey}-filled)`
          },
        };
      },
    }),
    Paper: Paper.extend({
      defaultProps: {
        shadow: "xl",
      },
    }),
  },
});

export const variableResolver: CSSVariablesResolver = () => ({
  variables: {
    // variables that do not depend on color scheme
    '--mantine-heading-font-weight': '600',
    '--mantine-primary-color-filled-hover': alpha('var(--mantine-primary-color-filled)', 0.9),
    '--mantine-primary-color-light': 'var(--mantine-color-gray-light)',
    '--mantine-primary-color-light-hover': 'var(--mantine-color-gray-light-hover)',
    '--mantine-primary-color-light-color': 'var(--mantine-color-gray-light-color)',
  },
  light: {
    // all variables that depend on light color scheme
    '--mantine-primary-color-contrast': 'var(--mantine-color-gray-0)', // used as primary color contrast
    '--mantine-color-text': 'var(--mantine-color-secondary-9)', // used as text color
    '--mantine-color-body': 'var(--mantine-color-white)', // used as body color
    '--mantine-color-error': 'var(--mantine-color-error-10)', // used as error color
    '--mantine-color-placeholder': 'var(--mantine-color-secondary-10)', // used as placeholder color
    '--mantine-color-anchor': 'var(--mantine-color-secondary-10)', // used as anchor color

    '--mantine-color-default': 'var(--mantine-color-secondary-0)', // used as default surface color
    '--mantine-color-default-hover': 'var(--mantine-color-secondary-1)', // used as default hover color
    '--mantine-color-default-color': 'var(--mantine-color-secondary-9)', // used as default text color
    '--mantine-color-default-border': 'var(--mantine-color-secondary-2)', // used as default border color
    '--mantine-color-dimmed': 'var(--mantine-color-secondary-10)', // used as dimmed text color

    '--mantine-color-secondary-filled': 'var(--mantine-color-white)', // used as secondary surface color
    '--mantine-color-secondary-filled-hover': 'var(--mantine-color-secondary-1)', // used as secondary hover color

    '--mantine-color-secondary-light': 'var(--mantine-color-secondary-1)', // used as primary light color
    '--mantine-color-secondary-light-hover': alpha('var(--mantine-color-secondary-light)', 0.8), // used as primary light hover color

    '--mantine-color-secondary-text': 'var(--mantine-primary-color-contrast)', // can be used as secondary text color
    '--mantine-color-secondary-light-color': 'var(--mantine-color-secondary-8)', // used as primary light variant's text color

    '--mantine-color-secondary-outline': 'var(--mantine-color-secondary-2)',
    '--mantine-color-secondary-outline-hover': 'var(--mantine-color-secondary-1)',

    // all filled colors
    "--mantine-color-zinc-filled": "var(--mantine-color-zinc-8)",
    "--mantine-color-zinc-filled-hover": alpha('var(--mantine-color-zinc-8)', 0.9),
    "--mantine-color-slate-filled": "var(--mantine-color-slate-8)",
    "--mantine-color-slate-filled-hover": alpha('var(--mantine-color-slate-8)', 0.9),
    "--mantine-color-gray-filled": "var(--mantine-color-gray-8)",
    "--mantine-color-gray-filled-hover": alpha('var(--mantine-color-gray-8)', 0.9),
    "--mantine-color-neutral-filled": "var(--mantine-color-neutral-8)",
    "--mantine-color-neutral-filled-hover": alpha('var(--mantine-color-neutral-8)', 0.9),
    "--mantine-color-stone-filled": "var(--mantine-color-stone-8)",
    "--mantine-color-stone-filled-hover": alpha('var(--mantine-color-stone-8)', 0.9),
    "--mantine-color-red-filled": "var(--mantine-color-red-5)",
    "--mantine-color-red-filled-hover": alpha('var(--mantine-color-red-5)', 0.9),
    "--mantine-color-rose-filled": "var(--mantine-color-rose-5)",
    "--mantine-color-rose-filled-hover": alpha('var(--mantine-color-rose-5)', 0.9),
    "--mantine-color-orange-filled": "var(--mantine-color-orange-5)",
    "--mantine-color-orange-filled-hover": alpha('var(--mantine-color-orange-5)', 0.9),
    "--mantine-color-amber-filled": "var(--mantine-color-amber-5)",
    "--mantine-color-amber-filled-hover": alpha('var(--mantine-color-amber-5)', 0.9),
    "--mantine-color-yellow-filled": "var(--mantine-color-yellow-4)",
    "--mantine-color-yellow-filled-hover": alpha('var(--mantine-color-yellow-4)', 0.9),
    "--mantine-color-lime-filled": "var(--mantine-color-lime-5)",
    "--mantine-color-lime-filled-hover": alpha('var(--mantine-color-lime-5)', 0.9),
    "--mantine-color-green-filled": "var(--mantine-color-green-6)",
    "--mantine-color-green-filled-hover": alpha('var(--mantine-color-green-6)', 0.9),
    "--mantine-color-emerald-filled": "var(--mantine-color-emerald-5)",
    "--mantine-color-emerald-filled-hover": alpha('var(--mantine-color-emerald-5)', 0.9),
    "--mantine-color-teal-filled": "var(--mantine-color-teal-5)",
    "--mantine-color-teal-filled-hover": alpha('var(--mantine-color-teal-5)', 0.9),
    "--mantine-color-cyan-filled": "var(--mantine-color-cyan-5)",
    "--mantine-color-cyan-filled-hover": alpha('var(--mantine-color-cyan-5)', 0.9),
    "--mantine-color-sky-filled": "var(--mantine-color-sky-5)",
    "--mantine-color-sky-filled-hover": alpha('var(--mantine-color-sky-5)', 0.9),
    "--mantine-color-blue-filled": "var(--mantine-color-blue-6)",
    "--mantine-color-blue-filled-hover": alpha('var(--mantine-color-blue-6)', 0.9),
    "--mantine-color-indigo-filled": "var(--mantine-color-indigo-5)",
    "--mantine-color-indigo-filled-hover": alpha('var(--mantine-color-indigo-5)', 0.9),
    "--mantine-color-violet-filled": "var(--mantine-color-violet-5)",
    "--mantine-color-violet-filled-hover": alpha('var(--mantine-color-violet-5)', 0.9),
    "--mantine-color-purple-filled": "var(--mantine-color-purple-5)",
    "--mantine-color-purple-filled-hover": alpha('var(--mantine-color-purple-5)', 0.9),
    "--mantine-color-fuchsia-filled": "var(--mantine-color-fuchsia-5)",
    "--mantine-color-fuchsia-filled-hover": alpha('var(--mantine-color-fuchsia-5)', 0.9),
    "--mantine-color-pink-filled": "var(--mantine-color-pink-5)",
    "--mantine-color-pink-filled-hover": alpha('var(--mantine-color-pink-5)', 0.9),

    // all light colors
    "--mantine-color-zinc-light": alpha('var(--mantine-color-zinc-4)', 0.1),
    "--mantine-color-zinc-light-hover": alpha('var(--mantine-color-zinc-light)', 0.8),
    "--mantine-color-zinc-light-color": "var(--mantine-color-zinc-6)",
    "--mantine-color-slate-light": alpha('var(--mantine-color-slate-4)', 0.1),
    "--mantine-color-slate-light-hover": alpha('var(--mantine-color-slate-light)', 0.8),
    "--mantine-color-slate-light-color": "var(--mantine-color-slate-6)",
    "--mantine-color-gray-light": alpha('var(--mantine-color-gray-4)', 0.1),
    "--mantine-color-gray-light-hover": alpha('var(--mantine-color-gray-light)', 0.8),
    "--mantine-color-gray-light-color": "var(--mantine-color-gray-6)",
    "--mantine-color-neutral-light": alpha('var(--mantine-color-neutral-4)', 0.1),
    "--mantine-color-neutral-light-hover": alpha('var(--mantine-color-neutral-light)', 0.8),
    "--mantine-color-neutral-light-color": "var(--mantine-color-neutral-6)",
    "--mantine-color-stone-light": alpha('var(--mantine-color-stone-4)', 0.1),
    "--mantine-color-stone-light-hover": alpha('var(--mantine-color-stone-light)', 0.8),
    "--mantine-color-stone-light-color": "var(--mantine-color-stone-6)",
    "--mantine-color-red-light": alpha('var(--mantine-color-red-4)', 0.1),
    "--mantine-color-red-light-hover": alpha('var(--mantine-color-red-light)', 0.8),
    "--mantine-color-red-light-color": "var(--mantine-color-red-6)",
    "--mantine-color-rose-light": alpha('var(--mantine-color-rose-4)', 0.1),
    "--mantine-color-rose-light-hover": alpha('var(--mantine-color-rose-light)', 0.8),
    "--mantine-color-rose-light-color": "var(--mantine-color-rose-6)",
    "--mantine-color-orange-light": alpha('var(--mantine-color-orange-4)', 0.1),
    "--mantine-color-orange-light-hover": alpha('var(--mantine-color-orange-light)', 0.8),
    "--mantine-color-orange-light-color": "var(--mantine-color-orange-6)",
    "--mantine-color-amber-light": alpha('var(--mantine-color-amber-4)', 0.1),
    "--mantine-color-amber-light-hover": alpha('var(--mantine-color-amber-light)', 0.8),
    "--mantine-color-amber-light-color": "var(--mantine-color-amber-6)",
    "--mantine-color-yellow-light": alpha('var(--mantine-color-yellow-4)', 0.1),
    "--mantine-color-yellow-light-hover": alpha('var(--mantine-color-yellow-light)', 0.8),
    "--mantine-color-yellow-light-color": "var(--mantine-color-yellow-6)",
    "--mantine-color-lime-light": alpha('var(--mantine-color-lime-4)', 0.1),
    "--mantine-color-lime-light-hover": alpha('var(--mantine-color-lime-light)', 0.8),
    "--mantine-color-lime-light-color": "var(--mantine-color-lime-6)",
    "--mantine-color-green-light": alpha('var(--mantine-color-green-4)', 0.1),
    "--mantine-color-green-light-hover": alpha('var(--mantine-color-green-light)', 0.8),
    "--mantine-color-green-light-color": "var(--mantine-color-green-6)",
    "--mantine-color-emerald-light": alpha('var(--mantine-color-emerald-4)', 0.1),
    "--mantine-color-emerald-light-hover": alpha('var(--mantine-color-emerald-light)', 0.8),
    "--mantine-color-emerald-light-color": "var(--mantine-color-emerald-6)",
    "--mantine-color-teal-light": alpha('var(--mantine-color-teal-4)', 0.1),
    "--mantine-color-teal-light-hover": alpha('var(--mantine-color-teal-light)', 0.8),
    "--mantine-color-teal-light-color": "var(--mantine-color-teal-6)",
    "--mantine-color-cyan-light": alpha('var(--mantine-color-cyan-4)', 0.1),
    "--mantine-color-cyan-light-hover": alpha('var(--mantine-color-cyan-light)', 0.8),
    "--mantine-color-cyan-light-color": "var(--mantine-color-cyan-6)",
    "--mantine-color-sky-light": alpha('var(--mantine-color-sky-4)', 0.1),
    "--mantine-color-sky-light-hover": alpha('var(--mantine-color-sky-light)', 0.8),
    "--mantine-color-sky-light-color": "var(--mantine-color-sky-6)",
    "--mantine-color-blue-light": alpha('var(--mantine-color-blue-4)', 0.1),
    "--mantine-color-blue-light-hover": alpha('var(--mantine-color-blue-light)', 0.8),
    "--mantine-color-blue-light-color": "var(--mantine-color-blue-6)",
    "--mantine-color-indigo-light": alpha('var(--mantine-color-indigo-4)', 0.1),
    "--mantine-color-indigo-light-hover": alpha('var(--mantine-color-indigo-light)', 0.8),
    "--mantine-color-indigo-light-color": "var(--mantine-color-indigo-6)",
    "--mantine-color-violet-light": alpha('var(--mantine-color-violet-4)', 0.1),
    "--mantine-color-violet-light-hover": alpha('var(--mantine-color-violet-light)', 0.8),
    "--mantine-color-violet-light-color": "var(--mantine-color-violet-6)",
    "--mantine-color-purple-light": alpha('var(--mantine-color-purple-4)', 0.1),
    "--mantine-color-purple-light-hover": alpha('var(--mantine-color-purple-light)', 0.8),
    "--mantine-color-purple-light-color": "var(--mantine-color-purple-6)",
    "--mantine-color-fuchsia-light": alpha('var(--mantine-color-fuchsia-4)', 0.1),
    "--mantine-color-fuchsia-light-hover": alpha('var(--mantine-color-fuchsia-light)', 0.8),
    "--mantine-color-fuchsia-light-color": "var(--mantine-color-fuchsia-6)",
    "--mantine-color-pink-light": alpha('var(--mantine-color-pink-4)', 0.1),
    "--mantine-color-pink-light-hover": alpha('var(--mantine-color-pink-light)', 0.8),
    "--mantine-color-pink-light-color": "var(--mantine-color-pink-6)",

    // all outline colors
    "--mantine-color-zinc-outline": "var(--mantine-color-zinc-8)",
    "--mantine-color-zinc-outline-hover": alpha('var(--mantine-color-zinc-4)', 0.1),
    "--mantine-color-slate-outline": "var(--mantine-color-slate-8)",
    "--mantine-color-slate-outline-hover": alpha('var(--mantine-color-slate-4)', 0.1),
    "--mantine-color-gray-outline": "var(--mantine-color-gray-8)",
    "--mantine-color-gray-outline-hover": alpha('var(--mantine-color-gray-4)', 0.1),
    "--mantine-color-neutral-outline": "var(--mantine-color-neutral-8)",
    "--mantine-color-neutral-outline-hover": alpha('var(--mantine-color-neutral-4)', 0.1),
    "--mantine-color-stone-outline": "var(--mantine-color-stone-8)",
    "--mantine-color-stone-outline-hover": alpha('var(--mantine-color-stone-4)', 0.1),
    "--mantine-color-red-outline": "var(--mantine-color-red-5)",
    "--mantine-color-red-outline-hover": alpha('var(--mantine-color-red-4)', 0.1),
    "--mantine-color-rose-outline": "var(--mantine-color-rose-5)",
    "--mantine-color-rose-outline-hover": alpha('var(--mantine-color-rose-4)', 0.1),
    "--mantine-color-orange-outline": "var(--mantine-color-orange-5)",
    "--mantine-color-orange-outline-hover": alpha('var(--mantine-color-orange-4)', 0.1),
    "--mantine-color-amber-outline": "var(--mantine-color-amber-5)",
    "--mantine-color-amber-outline-hover": alpha('var(--mantine-color-amber-4)', 0.1),
    "--mantine-color-yellow-outline": "var(--mantine-color-yellow-4)",
    "--mantine-color-yellow-outline-hover": alpha('var(--mantine-color-yellow-4)', 0.1),
    "--mantine-color-lime-outline": "var(--mantine-color-lime-5)",
    "--mantine-color-lime-outline-hover": alpha('var(--mantine-color-lime-4)', 0.1),
    "--mantine-color-green-outline": "var(--mantine-color-green-6)",
    "--mantine-color-green-outline-hover": alpha('var(--mantine-color-green-4)', 0.1),
    "--mantine-color-emerald-outline": "var(--mantine-color-emerald-5)",
    "--mantine-color-emerald-outline-hover": alpha('var(--mantine-color-emerald-4)', 0.1),
    "--mantine-color-teal-outline": "var(--mantine-color-teal-5)",
    "--mantine-color-teal-outline-hover": alpha('var(--mantine-color-teal-4)', 0.1),
    "--mantine-color-cyan-outline": "var(--mantine-color-cyan-5)",
    "--mantine-color-cyan-outline-hover": alpha('var(--mantine-color-cyan-4)', 0.1),
    "--mantine-color-sky-outline": "var(--mantine-color-sky-5)",
    "--mantine-color-sky-outline-hover": alpha('var(--mantine-color-sky-4)', 0.1),
    "--mantine-color-blue-outline": "var(--mantine-color-blue-6)",
    "--mantine-color-blue-outline-hover": alpha('var(--mantine-color-blue-4)', 0.1),
    "--mantine-color-indigo-outline": "var(--mantine-color-indigo-5)",
    "--mantine-color-indigo-outline-hover": alpha('var(--mantine-color-indigo-4)', 0.1),
    "--mantine-color-violet-outline": "var(--mantine-color-violet-5)",
    "--mantine-color-violet-outline-hover": alpha('var(--mantine-color-violet-4)', 0.1),
    "--mantine-color-purple-outline": "var(--mantine-color-purple-5)",
    "--mantine-color-purple-outline-hover": alpha('var(--mantine-color-purple-4)', 0.1),
    "--mantine-color-fuchsia-outline": "var(--mantine-color-fuchsia-5)",
    "--mantine-color-fuchsia-outline-hover": alpha('var(--mantine-color-fuchsia-4)', 0.1),
    "--mantine-color-pink-outline": "var(--mantine-color-pink-5)",
    "--mantine-color-pink-outline-hover": alpha('var(--mantine-color-pink-4)', 0.1),

    // all contrast colors
    "--mantine-color-zinc-contrast": "var(--mantine-color-zinc-0)",
    "--mantine-color-slate-contrast": "var(--mantine-color-slate-0)",
    "--mantine-color-gray-contrast": "var(--mantine-color-gray-0)",
    "--mantine-color-neutral-contrast": "var(--mantine-color-neutral-0)",
    "--mantine-color-stone-contrast": "var(--mantine-color-stone-0)",
    "--mantine-color-red-contrast": "var(--mantine-color-red-0)",
    "--mantine-color-rose-contrast": "var(--mantine-color-rose-0)",
    "--mantine-color-orange-contrast": "var(--mantine-color-stone-0)",
    "--mantine-color-amber-contrast": "var(--mantine-color-amber-0)",
    "--mantine-color-yellow-contrast": "#422006",
    "--mantine-color-lime-contrast": "var(--mantine-color-lime-0)",
    "--mantine-color-green-contrast": "var(--mantine-color-rose-0)",
    "--mantine-color-emerald-contrast": "var(--mantine-color-emerald-0)",
    "--mantine-color-teal-contrast": "var(--mantine-color-teal-0)",
    "--mantine-color-cyan-contrast": "var(--mantine-color-cyan-0)",
    "--mantine-color-sky-contrast": "var(--mantine-color-sky-0)",
    "--mantine-color-blue-contrast": "var(--mantine-color-slate-0)",
    "--mantine-color-indigo-contrast": "var(--mantine-color-indigo-0)",
    "--mantine-color-violet-contrast": "var(--mantine-color-gray-0)",
    "--mantine-color-purple-contrast": "var(--mantine-color-purple-0)",
    "--mantine-color-fuchsia-contrast": "var(--mantine-color-fuchsia-0)",
    "--mantine-color-pink-contrast": "var(--mantine-color-pink-0)",
  },
  dark: {
    // all variables that depend on dark color scheme
    '--mantine-primary-color-contrast': 'var(--mantine-color-gray-8)', // used as primary color contrast
    '--mantine-color-text': 'var(--mantine-color-secondary-0)', // used as text color
    '--mantine-color-body': 'var(--mantine-color-zinc-9)', // used as body color
    '--mantine-color-error': 'var(--mantine-color-error-10)', // used as error color
    '--mantine-color-placeholder': 'var(--mantine-color-secondary-4)', // used as placeholder color
    '--mantine-color-anchor': 'var(--mantine-color-secondary-4)', // used as anchor color

    '--mantine-color-default': 'var(--mantine-color-secondary-9)', // used as default surface color
    '--mantine-color-default-hover': 'var(--mantine-color-secondary-7)', // used as default hover color
    '--mantine-color-default-color': 'var(--mantine-color-secondary-1)', // used as default text color
    '--mantine-color-default-border': 'var(--mantine-color-secondary-7)', // used as default border color
    '--mantine-color-dimmed': 'var(--mantine-color-secondary-4)', // used as dimmed text color

    '--mantine-color-secondary-filled': 'var(--mantine-color-secondary-8)', // used as secondary surface color
    '--mantine-color-secondary-filled-hover': alpha('var(--mantine-color-secondary-filled)', 0.9), //used as secondary hover color

    '--mantine-color-secondary-light': 'var(--mantine-color-secondary-7)', // used as primary light color
    '--mantine-color-secondary-light-hover': alpha('var(--mantine-color-secondary-light)', 0.8), // used as primary light hover color

    '--mantine-color-secondary-text': 'var(--mantine-primary-color-contrast)', // can be used as secondary text color
    '--mantine-color-secondary-light-color': 'var(--mantine-color-secondary-0)', // used as primary light text color

    '--mantine-color-secondary-outline': 'var(--mantine-color-secondary-7)',
    '--mantine-color-secondary-outline-hover': 'var(--mantine-color-secondary-7)',

    // all filled colors
    "--mantine-color-zinc-filled": "var(--mantine-color-zinc-0)",
    "--mantine-color-zinc-filled-hover": alpha('var(--mantine-color-zinc-0)', 0.9),
    "--mantine-color-slate-filled": "var(--mantine-color-slate-0)",
    "--mantine-color-slate-filled-hover": alpha('var(--mantine-color-slate-0)', 0.9),
    "--mantine-color-gray-filled": "var(--mantine-color-gray-0)",
    "--mantine-color-gray-filled-hover": alpha('var(--mantine-color-gray-0)', 0.9),
    "--mantine-color-neutral-filled": "var(--mantine-color-neutral-0)",
    "--mantine-color-neutral-filled-hover": alpha('var(--mantine-color-neutral-0)', 0.9),
    "--mantine-color-stone-filled": "var(--mantine-color-stone-0)",
    "--mantine-color-stone-filled-hover": alpha('var(--mantine-color-stone-0)', 0.9),
    "--mantine-color-red-filled": "var(--mantine-color-red-5)",
    "--mantine-color-red-filled-hover": alpha('var(--mantine-color-red-5)', 0.9),
    "--mantine-color-rose-filled": "var(--mantine-color-rose-5)",
    "--mantine-color-rose-filled-hover": alpha('var(--mantine-color-rose-5)', 0.9),
    "--mantine-color-orange-filled": "var(--mantine-color-orange-6)",
    "--mantine-color-orange-filled-hover": alpha('var(--mantine-color-orange-6)', 0.9),
    "--mantine-color-amber-filled": "var(--mantine-color-amber-5)",
    "--mantine-color-amber-filled-hover": alpha('var(--mantine-color-amber-5)', 0.9),
    "--mantine-color-yellow-filled": "var(--mantine-color-yellow-4)",
    "--mantine-color-yellow-filled-hover": alpha('var(--mantine-color-yellow-4)', 0.9),
    "--mantine-color-lime-filled": "var(--mantine-color-lime-4)",
    "--mantine-color-lime-filled-hover": alpha('var(--mantine-color-lime-4)', 0.9),
    "--mantine-color-green-filled": "var(--mantine-color-green-5)",
    "--mantine-color-green-filled-hover": alpha('var(--mantine-color-green-5)', 0.9),
    "--mantine-color-emerald-filled": "var(--mantine-color-emerald-5)",
    "--mantine-color-emerald-filled-hover": alpha('var(--mantine-color-emerald-5)', 0.9),
    "--mantine-color-teal-filled": "var(--mantine-color-teal-4)",
    "--mantine-color-teal-filled-hover": alpha('var(--mantine-color-teal-4)', 0.9),
    "--mantine-color-cyan-filled": "var(--mantine-color-cyan-4)",
    "--mantine-color-cyan-filled-hover": alpha('var(--mantine-color-cyan-4)', 0.9),
    "--mantine-color-sky-filled": "var(--mantine-color-sky-4)",
    "--mantine-color-sky-filled-hover": alpha('var(--mantine-color-sky-4)', 0.9),
    "--mantine-color-blue-filled": "var(--mantine-color-blue-5)",
    "--mantine-color-blue-filled-hover": alpha('var(--mantine-color-blue-5)', 0.9),
    "--mantine-color-indigo-filled": "var(--mantine-color-indigo-6)",
    "--mantine-color-indigo-filled-hover": alpha('var(--mantine-color-indigo-6)', 0.9),
    "--mantine-color-violet-filled": "var(--mantine-color-violet-6)",
    "--mantine-color-violet-filled-hover": alpha('var(--mantine-color-violet-6)', 0.9),
    "--mantine-color-purple-filled": "var(--mantine-color-purple-6)",
    "--mantine-color-purple-filled-hover": alpha('var(--mantine-color-purple-6)', 0.9),
    "--mantine-color-fuchsia-filled": "var(--mantine-color-fuchsia-7)",
    "--mantine-color-fuchsia-filled-hover": alpha('var(--mantine-color-fuchsia-7)', 0.9),
    "--mantine-color-pink-filled": "var(--mantine-color-pink-6)",
    "--mantine-color-pink-filled-hover": alpha('var(--mantine-color-pink-6)', 0.9),

    // all light colors
    "--mantine-color-zinc-light": alpha('var(--mantine-color-zinc-4)', 0.15),
    "--mantine-color-zinc-light-hover": alpha('var(--mantine-color-zinc-light)', 0.8),
    "--mantine-color-zinc-light-color": "var(--mantine-color-zinc-3)",
    "--mantine-color-slate-light": alpha('var(--mantine-color-slate-4)', 0.15),
    "--mantine-color-slate-light-hover": alpha('var(--mantine-color-slate-light)', 0.8),
    "--mantine-color-slate-light-color": "var(--mantine-color-slate-3)",
    "--mantine-color-gray-light": alpha('var(--mantine-color-gray-4)', 0.15),
    "--mantine-color-gray-light-hover": alpha('var(--mantine-color-gray-light)', 0.8),
    "--mantine-color-gray-light-color": "var(--mantine-color-gray-3)",
    "--mantine-color-neutral-light": alpha('var(--mantine-color-neutral-4)', 0.15),
    "--mantine-color-neutral-light-hover": alpha('var(--mantine-color-neutral-light)', 0.8),
    "--mantine-color-neutral-light-color": "var(--mantine-color-neutral-3)",
    "--mantine-color-stone-light": alpha('var(--mantine-color-stone-4)', 0.15),
    "--mantine-color-stone-light-hover": alpha('var(--mantine-color-stone-light)', 0.8),
    "--mantine-color-stone-light-color": "var(--mantine-color-stone-3)",
    "--mantine-color-red-light": alpha('var(--mantine-color-red-4)', 0.15),
    "--mantine-color-red-light-hover": alpha('var(--mantine-color-red-light)', 0.8),
    "--mantine-color-red-light-color": "var(--mantine-color-red-3)",
    "--mantine-color-rose-light": alpha('var(--mantine-color-rose-4)', 0.15),
    "--mantine-color-rose-light-hover": alpha('var(--mantine-color-rose-light)', 0.8),
    "--mantine-color-rose-light-color": "var(--mantine-color-rose-3)",
    "--mantine-color-orange-light": alpha('var(--mantine-color-orange-4)', 0.15),
    "--mantine-color-orange-light-hover": alpha('var(--mantine-color-orange-light)', 0.8),
    "--mantine-color-orange-light-color": "var(--mantine-color-orange-3)",
    "--mantine-color-amber-light": alpha('var(--mantine-color-amber-4)', 0.15),
    "--mantine-color-amber-light-hover": alpha('var(--mantine-color-amber-light)', 0.8),
    "--mantine-color-amber-light-color": "var(--mantine-color-amber-3)",
    "--mantine-color-yellow-light": alpha('var(--mantine-color-yellow-4)', 0.15),
    "--mantine-color-yellow-light-hover": alpha('var(--mantine-color-yellow-light)', 0.8),
    "--mantine-color-yellow-light-color": "var(--mantine-color-yellow-3)",
    "--mantine-color-lime-light": alpha('var(--mantine-color-lime-4)', 0.15),
    "--mantine-color-lime-light-hover": alpha('var(--mantine-color-lime-light)', 0.8),
    "--mantine-color-lime-light-color": "var(--mantine-color-lime-3)",
    "--mantine-color-green-light": alpha('var(--mantine-color-green-4)', 0.15),
    "--mantine-color-green-light-hover": alpha('var(--mantine-color-green-light)', 0.8),
    "--mantine-color-green-light-color": "var(--mantine-color-green-3)",
    "--mantine-color-emerald-light": alpha('var(--mantine-color-emerald-4)', 0.15),
    "--mantine-color-emerald-light-hover": alpha('var(--mantine-color-emerald-light)', 0.8),
    "--mantine-color-emerald-light-color": "var(--mantine-color-emerald-3)",
    "--mantine-color-teal-light": alpha('var(--mantine-color-teal-4)', 0.15),
    "--mantine-color-teal-light-hover": alpha('var(--mantine-color-teal-light)', 0.8),
    "--mantine-color-teal-light-color": "var(--mantine-color-teal-3)",
    "--mantine-color-cyan-light": alpha('var(--mantine-color-cyan-4)', 0.15),
    "--mantine-color-cyan-light-hover": alpha('var(--mantine-color-cyan-light)', 0.8),
    "--mantine-color-cyan-light-color": "var(--mantine-color-cyan-3)",
    "--mantine-color-sky-light": alpha('var(--mantine-color-sky-4)', 0.15),
    "--mantine-color-sky-light-hover": alpha('var(--mantine-color-sky-light)', 0.8),
    "--mantine-color-sky-light-color": "var(--mantine-color-sky-3)",
    "--mantine-color-blue-light": alpha('var(--mantine-color-blue-4)', 0.15),
    "--mantine-color-blue-light-hover": alpha('var(--mantine-color-blue-light)', 0.8),
    "--mantine-color-blue-light-color": "var(--mantine-color-blue-3)",
    "--mantine-color-indigo-light": alpha('var(--mantine-color-indigo-4)', 0.15),
    "--mantine-color-indigo-light-hover": alpha('var(--mantine-color-indigo-light)', 0.8),
    "--mantine-color-indigo-light-color": "var(--mantine-color-indigo-3)",
    "--mantine-color-violet-light": alpha('var(--mantine-color-violet-4)', 0.15),
    "--mantine-color-violet-light-hover": alpha('var(--mantine-color-violet-light)', 0.8),
    "--mantine-color-violet-light-color": "var(--mantine-color-violet-3)",
    "--mantine-color-purple-light": alpha('var(--mantine-color-purple-4)', 0.15),
    "--mantine-color-purple-light-hover": alpha('var(--mantine-color-purple-light)', 0.8),
    "--mantine-color-purple-light-color": "var(--mantine-color-purple-3)",
    "--mantine-color-fuchsia-light": alpha('var(--mantine-color-fuchsia-4)', 0.15),
    "--mantine-color-fuchsia-light-hover": alpha('var(--mantine-color-fuchsia-light)', 0.8),
    "--mantine-color-fuchsia-light-color": "var(--mantine-color-fuchsia-3)",
    "--mantine-color-pink-light": alpha('var(--mantine-color-pink-4)', 0.15),
    "--mantine-color-pink-light-hover": alpha('var(--mantine-color-pink-light)', 0.8),
    "--mantine-color-pink-light-color": "var(--mantine-color-pink-3)",

    // all outline colors
    "--mantine-color-zinc-outline": "var(--mantine-color-zinc-0)",
    "--mantine-color-zinc-outline-hover": alpha('var(--mantine-color-zinc-4)', 0.15),
    "--mantine-color-slate-outline": "var(--mantine-color-slate-0)",
    "--mantine-color-slate-outline-hover": alpha('var(--mantine-color-slate-4)', 0.15),
    "--mantine-color-gray-outline": "var(--mantine-color-gray-0)",
    "--mantine-color-gray-outline-hover": alpha('var(--mantine-color-gray-4)', 0.15),
    "--mantine-color-neutral-outline": "var(--mantine-color-neutral-0)",
    "--mantine-color-neutral-outline-hover": alpha('var(--mantine-color-neutral-4)', 0.15),
    "--mantine-color-stone-outline": "var(--mantine-color-stone-0)",
    "--mantine-color-stone-outline-hover": alpha('var(--mantine-color-stone-4)', 0.15),
    "--mantine-color-red-outline": "var(--mantine-color-red-5)",
    "--mantine-color-red-outline-hover": alpha('var(--mantine-color-red-4)', 0.15),
    "--mantine-color-rose-outline": "var(--mantine-color-rose-5)",
    "--mantine-color-rose-outline-hover": alpha('var(--mantine-color-rose-4)', 0.15),
    "--mantine-color-orange-outline": "var(--mantine-color-orange-6)",
    "--mantine-color-orange-outline-hover": alpha('var(--mantine-color-orange-4)', 0.15),
    "--mantine-color-amber-outline": "var(--mantine-color-amber-5)",
    "--mantine-color-amber-outline-hover": alpha('var(--mantine-color-amber-4)', 0.15),
    "--mantine-color-yellow-outline": "var(--mantine-color-yellow-4)",
    "--mantine-color-yellow-outline-hover": alpha('var(--mantine-color-yellow-4)', 0.15),
    "--mantine-color-lime-outline": "var(--mantine-color-lime-4)",
    "--mantine-color-lime-outline-hover": alpha('var(--mantine-color-lime-4)', 0.15),
    "--mantine-color-green-outline": "var(--mantine-color-green-5)",
    "--mantine-color-green-outline-hover": alpha('var(--mantine-color-green-4)', 0.15),
    "--mantine-color-emerald-outline": "var(--mantine-color-emerald-5)",
    "--mantine-color-emerald-outline-hover": alpha('var(--mantine-color-emerald-4)', 0.15),
    "--mantine-color-teal-outline": "var(--mantine-color-teal-4)",
    "--mantine-color-teal-outline-hover": alpha('var(--mantine-color-teal-4)', 0.15),
    "--mantine-color-cyan-outline": "var(--mantine-color-cyan-4)",
    "--mantine-color-cyan-outline-hover": alpha('var(--mantine-color-cyan-4)', 0.15),
    "--mantine-color-sky-outline": "var(--mantine-color-sky-4)",
    "--mantine-color-sky-outline-hover": alpha('var(--mantine-color-sky-4)', 0.15),
    "--mantine-color-blue-outline": "var(--mantine-color-blue-5)",
    "--mantine-color-blue-outline-hover": alpha('var(--mantine-color-blue-4)', 0.15),
    "--mantine-color-indigo-outline": "var(--mantine-color-indigo-6)",
    "--mantine-color-indigo-outline-hover": alpha('var(--mantine-color-indigo-4)', 0.15),
    "--mantine-color-violet-outline": "var(--mantine-color-violet-6)",
    "--mantine-color-violet-outline-hover": alpha('var(--mantine-color-violet-4)', 0.15),
    "--mantine-color-purple-outline": "var(--mantine-color-purple-6)",
    "--mantine-color-purple-outline-hover": alpha('var(--mantine-color-purple-4)', 0.15),
    "--mantine-color-fuchsia-outline": "var(--mantine-color-fuchsia-7)",
    "--mantine-color-fuchsia-outline-hover": alpha('var(--mantine-color-fuchsia-4)', 0.15),
    "--mantine-color-pink-outline": "var(--mantine-color-pink-6)",
    "--mantine-color-pink-outline-hover": alpha('var(--mantine-color-pink-4)', 0.15),

    // all contrast colors
    "--mantine-color-zinc-contrast": "var(--mantine-color-zinc-8)",
    "--mantine-color-slate-contrast": "var(--mantine-color-slate-8)",
    "--mantine-color-gray-contrast": "var(--mantine-color-gray-8)",
    "--mantine-color-neutral-contrast": "var(--mantine-color-neutral-8)",
    "--mantine-color-stone-contrast": "var(--mantine-color-stone-8)",
    "--mantine-color-red-contrast": "var(--mantine-color-red-0)",
    "--mantine-color-rose-contrast": "var(--mantine-color-rose-0)",
    "--mantine-color-orange-contrast": "var(--mantine-color-stone-0)",
    "--mantine-color-amber-contrast": "var(--mantine-color-stone-8)",
    "--mantine-color-yellow-contrast": "#422006",
    "--mantine-color-lime-contrast": "var(--mantine-color-stone-8)",
    "--mantine-color-green-contrast": "var(--mantine-color-green-9)",
    "--mantine-color-emerald-contrast": "var(--mantine-color-stone-0)",
    "--mantine-color-teal-contrast": "var(--mantine-color-slate-8)",
    "--mantine-color-cyan-contrast": "var(--mantine-color-slate-8)",
    "--mantine-color-sky-contrast": "var(--mantine-color-slate-8)",
    "--mantine-color-blue-contrast": "var(--mantine-color-slate-0)",
    "--mantine-color-indigo-contrast": "var(--mantine-color-gray-0)",
    "--mantine-color-violet-contrast": "var(--mantine-color-gray-0)",
    "--mantine-color-purple-contrast": "var(--mantine-color-gray-0)",
    "--mantine-color-fuchsia-contrast": "var(--mantine-color-gray-0)",
    "--mantine-color-pink-contrast": "var(--mantine-color-gray-0)",
  },
});