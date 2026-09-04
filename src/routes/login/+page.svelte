<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Dock, ShieldCheck, TriangleAlert, Truck } from '@lucide/svelte';

  let { form }: { form?: { error?: string; login?: string } | null } = $props();
</script>

<svelte:head>
  <title>Logowanie — Dockflow</title>
</svelte:head>

<main class="login-page">
  <section class="login-panel">
    <div class="login-brand">
      <span class="brand-mark"><Dock size={22}/></span>
      <strong>DOCK<span>FLOW</span></strong>
    </div>
    <div class="login-heading">
      <span class="eyebrow">AWIZACJE DOSTAW</span>
      <h1>Zaloguj się</h1>
      <p>Wybierz konto demonstracyjne i przejdź do systemu.</p>
    </div>

    <form method="POST" class="login-form">
      <label>
        Login
        <Input name="login" value={form?.login ?? ''} autocomplete="username" required placeholder="Wpisz login"/>
      </label>
      <label>
        Hasło
        <Input name="password" type="password" autocomplete="current-password" required placeholder="Wpisz hasło"/>
      </label>
      {#if form?.error}
        <div class="login-error"><TriangleAlert size={16}/>{form.error}</div>
      {/if}
      <Button type="submit" class="wide">Zaloguj się</Button>
    </form>
  </section>
  <aside class="login-visual">
    <div class="gate-lines"></div>
    <div><span class="eyebrow">MAGAZYN · DOKI · DOSTAWY</span><h2>Jedno miejsce do planowania awizacji.</h2><p>Terminy, kolejka dostaw i obsługa rozładunku.</p></div>
  </aside>
</main>
