import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: ["class"],
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
		"../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				recco: {
					green: {
						'50': '#ECFDF5',
						'100': '#E8F5ED',
						'500': '#22C55E',
						'600': '#16A34A',
						'700': '#1B6B35',
						'800': '#155E2B'
					},
					teal: {
						'50': '#F0FDFA',
						'100': '#CCFBF1',
						'500': '#14B8A6',
						'600': '#0D9488',
						'700': '#0E5A6E',
						'800': '#0B4A5A'
					},
					amber: {
						'50': '#FFFBEB',
						'100': '#FEF3C7',
						'500': '#F59E0B',
						'600': '#D97706',
						'700': '#B45309',
						'800': '#92400E'
					},
					red: {
						'700': '#B91C1C'
					},
					navy: {
						'900': '#1A2F4B'
					},
					gray: {
						'50': '#F5F5F5',
						'100': '#F3F4F6',
						'200': '#E5E7EB',
						'300': '#D1D5DB',
						'400': '#9CA3AF',
						'500': '#6B7280',
						'600': '#4B5563',
						'700': '#374151',
						'800': '#1F2937',
						'900': '#111827'
					}
				},
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			fontFamily: {
				sans: [
					'Inter',
					'sans-serif'
				],
				mono: [
					'var(--font-roboto-mono)',
					'monospace'
				]
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
};
export default config;
