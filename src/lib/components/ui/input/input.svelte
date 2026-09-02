<script lang="ts">
    import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
    import { cn, type WithElementRef } from "$lib/utils.js";

    type InputType = Exclude<HTMLInputTypeAttribute, "file">;

    type Props = WithElementRef<Omit<HTMLInputAttributes, "type"> & ({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })> & {
        errors?: ({ message: string } | string)[];
        label?: string;
    };

    let { ref = $bindable(null), value = $bindable(), type, files = $bindable(), class: className, name, id, errors = [], label, "data-slot": dataSlot = "input", ...restProps }: Props = $props();

    let resolvedName = $derived(name ?? id);
    let resolvedId = $derived(id ?? resolvedName);

    let messages = $derived(errors.map((e) => (typeof e === "string" ? e : e.message)));
</script>

{#if label}
    <label for={resolvedId} class="mb-1.5 block text-sm font-medium leading-none">{label}</label>
{/if}

{#if type === "file"}
    <input
        id={resolvedId}
        name={resolvedName}
        bind:this={ref}
        data-slot={dataSlot}
        class={cn(
            "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-[54px] rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 md:text-sm file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            className,
        )}
        type="file"
        bind:files
        bind:value
        aria-invalid={messages.length > 0 ? "true" : undefined}
        {...restProps}
    />
{:else}
    <input
        id={resolvedId}
        name={resolvedName}
        bind:this={ref}
        data-slot={dataSlot}
        class={cn(
            "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-[54px] rounded-lg border bg-white dark:bg-input px-2.5 py-1 text-base transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 md:text-sm file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            className,
        )}
        {type}
        bind:value
        aria-invalid={messages.length > 0 ? "true" : undefined}
        {...restProps}
    />
{/if}

{#each messages as message}
    <p class="text-destructive text-xs mt-1.5">{message}</p>
{/each}
