<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const buttonVariants = tv({
		base: "cursor-pointer gap-x-4 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-[1.125rem] [corner-shape:squircle] border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 [&_svg:not([class*='size-'])]:size-4 group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:scale-105 duration-150",
		variants: {
			variant: {
				default: "bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklch,var(--primary)_88%,black))] text-primary-foreground shadow-sm shadow-primary/20 hover:bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklch,var(--primary)_82%,black))] hover:shadow-primary/30",
				outline: "border-border bg-[linear-gradient(135deg,var(--background),color-mix(in_oklch,var(--background)_96%,black))] text-foreground hover:bg-[linear-gradient(135deg,var(--muted),color-mix(in_oklch,var(--muted)_92%,black))] dark:bg-[linear-gradient(135deg,var(--input),color-mix(in_oklch,var(--input)_88%,black))] dark:border-input dark:hover:bg-[linear-gradient(135deg,var(--input),color-mix(in_oklch,var(--input)_82%,black))] aria-expanded:bg-muted aria-expanded:text-foreground",
				secondary: "bg-[linear-gradient(135deg,var(--secondary),color-mix(in_oklch,var(--secondary)_92%,black))] text-secondary-foreground shadow-sm shadow-secondary/20 hover:bg-[linear-gradient(135deg,var(--secondary),color-mix(in_oklch,var(--secondary)_86%,black))] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
				ghost: "hover:bg-[linear-gradient(135deg,var(--muted),color-mix(in_oklch,var(--muted)_92%,black))] hover:text-foreground dark:hover:bg-[linear-gradient(135deg,var(--muted),color-mix(in_oklch,var(--muted)_84%,black))] aria-expanded:bg-muted aria-expanded:text-foreground",
				destructive: "bg-[linear-gradient(135deg,var(--destructive),color-mix(in_oklch,var(--destructive)_84%,black))] text-white shadow-sm shadow-destructive/20 hover:bg-[linear-gradient(135deg,var(--destructive),color-mix(in_oklch,var(--destructive)_72%,black))] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 focus-visible:border-destructive/40 dark:hover:bg-[linear-gradient(135deg,var(--destructive),color-mix(in_oklch,var(--destructive)_72%,black))]",
				success: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-600/30",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				xs: "h-7 gap-1 rounded-[0.75rem] px-2.5 text-xs in-data-[slot=button-group]:rounded-[0.875rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-9 gap-1.5 rounded-[0.875rem] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-[1rem] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
				lg: "h-16 gap-2 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
				icon: "size-8",
				"icon-xs": "size-6 rounded-[0.75rem] in-data-[slot=button-group]:rounded-[0.875rem] [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-7 rounded-[0.875rem] in-data-[slot=button-group]:rounded-[1rem]",
				"icon-lg": "size-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

	type ButtonClickEvent = MouseEvent & {
		currentTarget: EventTarget & (HTMLButtonElement | HTMLAnchorElement);
	};

	export type ButtonProps = Omit<
		WithElementRef<HTMLButtonAttributes> & WithElementRef<HTMLAnchorAttributes>,
		"onclick"
	> & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		loading?: boolean;
		pressAnimation?: boolean;
		onclick?: (event: ButtonClickEvent) => unknown;
	};
</script>

<script lang="ts">
	import { fade } from "svelte/transition";
	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		loading = false,
		pressAnimation = true,
		onclick,
		children,
		...restProps
	}: ButtonProps = $props();

	let internalLoading = $state(false);
	let isLoading = $derived(loading || internalLoading);
	let isDisabled = $derived(disabled || isLoading);

	async function handleClick(event: ButtonClickEvent) {
		if (isDisabled) {
			event.preventDefault();
			return;
		}

		const result = onclick?.(event);

		if (result instanceof Promise) {
			internalLoading = true;

			try {
				await result;
			} catch (error) {
				console.error("Button's async onclick failed:", error);
			} finally {
				setTimeout(() => {
					internalLoading = false;
				}, 100);
			}
		}
	}
</script>

{#snippet spinner()}
	<span
		class="absolute inset-0 flex items-center justify-center bg-black/10"
		transition:fade={{ duration: 100 }}
		aria-label="Loading"
		role="status"
	>
		<svg
			class="size-5 animate-spin text-current"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			/>
		</svg>
	</span>
{/snippet}

{#snippet content()}
	<span
		class="flex items-center justify-center [gap:inherit] transition-opacity"
		class:invisible={isLoading}
		class:opacity-50={isLoading}
		class:blur-sm={isLoading}
		class:scale-95={isLoading}
	>
		{@render children?.()}
	</span>
	{#if isLoading}
		{@render spinner()}
	{/if}
{/snippet}

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(
			buttonVariants({ variant, size }),
			pressAnimation && "active:not-aria-[haspopup]:translate-y-px active:scale-95",
			"relative overflow-hidden",
			className,
		)}
		href={isDisabled ? undefined : href}
		aria-disabled={isDisabled}
		role={isDisabled ? "link" : undefined}
		tabindex={isDisabled ? -1 : undefined}
		onclick={handleClick}
		{...restProps}
	>
		{@render content()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(
			buttonVariants({ variant, size }),
			pressAnimation && "active:not-aria-[haspopup]:translate-y-px active:scale-95",
			"relative overflow-hidden",
			className,
		)}
		{type}
		disabled={isDisabled}
		onclick={handleClick}
		{...restProps}
	>
		{@render content()}
	</button>
{/if}
