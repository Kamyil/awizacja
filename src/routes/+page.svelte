<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';
  import * as Dialog from '$lib/components/ui/dialog';
  import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Clock3, Dock, GripVertical, LayoutGrid, ListFilter, Plus, Search, Settings2, SlidersHorizontal, Truck, UserRound, Warehouse, X, Check, MapPin, Weight, PackageOpen, ShieldAlert, LogOut, Bell, MoreHorizontal, ExternalLink, ArrowRight, CalendarSearch, Trash2 } from '@lucide/svelte';

  type View = 'terminarz' | 'dostawca' | 'konfiguracja';
  type Delivery = { id:string; supplier:string; load:string; pallets:number; weight:string; duration:number; status:string; plate:string; dock?:string; day?:number; start?:number; color:string };

  let view: View = $state('terminarz');
  let period = $state<'Dzień'|'Tydzień'|'Miesiąc'>('Tydzień');
  let dockFilter = $state('Wszystkie doki');
  let query = $state('');
  let selected: Delivery | null = $state(null);
  let addOpen = $state(false);
  let toast = $state('');
  let searchDuration = $state('2 godziny');
  let searchFrom = $state('08:00');
  let searchTo = $state('12:00');
  let searchDone = $state(false);
  let newDock = $state('');
  let docks = $state(['DOK 01', 'DOK 02', 'DOK 03']);
  let dockEnabled = $state([true, true, true]);
  let workDays = $state([
    {day:'Poniedziałek',from:'07:00',to:'15:00',on:true},
    {day:'Wtorek',from:'07:00',to:'15:00',on:true},
    {day:'Środa',from:'07:00',to:'15:00',on:true},
    {day:'Czwartek',from:'07:00',to:'15:00',on:true},
    {day:'Piątek',from:'07:00',to:'14:00',on:true},
    {day:'Sobota',from:'07:00',to:'15:00',on:false},
    {day:'Niedziela',from:'07:00',to:'15:00',on:false}
  ]);
  const monthDays = [
    {n:28,other:true,day:0},{n:29,other:true,day:1},{n:30,other:true,day:2},
    ...Array.from({length:31},(_,i)=>({n:i+1,other:false,day:i+3})),
    {n:1,other:true,day:34}
  ];

  const days = [
    { week:'PN', date:'28 KWI' }, { week:'WT', date:'29 KWI' }, { week:'ŚR', date:'30 KWI' },
    { week:'CZW', date:'1 MAJ' }, { week:'PT', date:'2 MAJ' }
  ];
  const hours = [7,8,9,10,11,12,13,14,15];
  const statusColors: Record<string,string> = {
    'Planowany':'blue', 'Konflikt':'red', 'Oczekujący':'amber', 'Opóźniony':'orange',
    'Zakończony':'slate', 'W trakcie rozładunku':'green'
  };
  const deliveries = $state<Delivery[]>([
    { id:'ZG/0450/25', supplier:'NordSteel Sp. z o.o.', load:'Blacha zimnowalcowana', pallets:8, weight:'12 400 kg', duration:2, status:'Planowany', plate:'WGM 4K92', dock:'DOK 01', day:0, start:8, color:'blue' },
    { id:'ZG/0441/25', supplier:'Polimer SA', load:'Granulat PA6', pallets:14, weight:'8 200 kg', duration:1.5, status:'W trakcie rozładunku', plate:'PO 8N220', dock:'DOK 02', day:0, start:10.5, color:'green' },
    { id:'ZZ/0198/25', supplier:'Logistar GmbH', load:'Komponenty montażowe', pallets:5, weight:'3 850 kg', duration:1, status:'Oczekujący', plate:'B-QL 774', dock:'DOK 03', day:1, start:7.5, color:'amber' },
    { id:'ZG/0427/25', supplier:'Stalmet S.A.', load:'Profile aluminiowe', pallets:12, weight:'9 700 kg', duration:2, status:'Konflikt', plate:'SK 92LT', dock:'DOK 01', day:2, start:11, color:'red' },
    { id:'ZG/0409/25', supplier:'Chemiko Sp. z o.o.', load:'Środki techniczne', pallets:4, weight:'2 100 kg', duration:1, status:'Opóźniony', plate:'KR 7PY42', dock:'DOK 02', day:4, start:9, color:'orange' },
    { id:'ZG/0398/25', supplier:'Metalform', load:'Odlewy żeliwne', pallets:10, weight:'11 300 kg', duration:1.5, status:'Zakończony', plate:'DW 3E129', dock:'DOK 03', day:1, start:13, color:'slate' }
  ]);
  const queue = $state<Delivery[]>([
    { id:'ZG/0462/25', supplier:'Hutmen S.A.', load:'Pręty miedziane', pallets:6, weight:'7 200 kg', duration:2, status:'Oczekujący', plate:'', color:'violet' },
    { id:'ZG/0467/25', supplier:'TechnoParts', load:'Podzespoły', pallets:3, weight:'1 850 kg', duration:1, status:'Oczekujący', plate:'', color:'teal' },
    { id:'ZG/0471/25', supplier:'EuroPack', load:'Opakowania zwrotne', pallets:18, weight:'4 600 kg', duration:1.5, status:'Oczekujący', plate:'', color:'indigo' }
  ]);

  let filteredQueue = $derived(queue.filter(x => (x.id + x.supplier + x.load).toLowerCase().includes(query.toLowerCase())));

  function dropDelivery(event: DragEvent, day:number, hour:number) {
    event.preventDefault();
    const id = event.dataTransfer?.getData('text/plain');
    const item = queue.find(x => x.id === id);
    if (!item) return;
    item.day = day; item.start = hour; item.dock = 'DOK 01'; item.status = 'Planowany'; item.color = 'blue';
    queue.splice(queue.indexOf(item), 1);
    deliveries.push(item);
    toast = `${item.id} zaplanowano na ${days[day].date}, ${hour}:00`;
    setTimeout(() => toast = '', 3200);
  }
  function advanceStatus(item:Delivery) {
    if (item.status === 'W trakcie rozładunku') item.status = 'Zakończony';
    else item.status = 'W trakcie rozładunku';
    item.color = item.status === 'Zakończony' ? 'slate' : 'green';
    toast = item.status === 'Zakończony' ? 'Rozładunek zakończony. Pojazd może odjechać.' : 'Potwierdzono podjazd. Rozładunek rozpoczęty.';
    setTimeout(() => toast = '', 3200);
  }
  function addDock() {
    if (!newDock.trim()) return;
    docks.push(newDock.trim().toUpperCase());
    dockEnabled.push(true);
    newDock='';
  }
</script>

<svelte:head><title>Dockflow — Awizacje dostaw</title><meta name="description" content="Planowanie dostaw i obsługa doków magazynowych" /></svelte:head>

<div class="app-shell">
  <header class="topbar">
    <button class="brand" onclick={() => view='terminarz'}><span class="brand-mark"><Dock size={19}/></span><span>DOCK<span>FLOW</span></span></button>
    <nav aria-label="Główna nawigacja">
      <button class:active={view==='terminarz'} onclick={() => view='terminarz'}><CalendarDays size={17}/>Terminarz</button>
      <button class:active={view==='dostawca'} onclick={() => view='dostawca'}><Truck size={17}/>Panel dostawcy</button>
      <button class:active={view==='konfiguracja'} onclick={() => view='konfiguracja'}><Settings2 size={17}/>Konfiguracja</button>
    </nav>
    <div class="top-actions"><button class="icon-button" aria-label="Powiadomienia"><Bell size={18}/><span class="notification"></span></button><div class="avatar">KM</div><div class="user"><strong>Kamil Michalski</strong><span>Koordynator magazynu</span></div><ChevronRight size={16} class="muted"/></div>
  </header>

  {#if view === 'terminarz'}
    <main class="workspace">
      <section class="queue-panel">
        <div class="panel-heading"><div><span class="eyebrow">DO ZAPLANOWANIA</span><h2>Zamówienia <Badge variant="secondary">{queue.length}</Badge></h2></div><Button size="icon" variant="outline" onclick={() => addOpen=true}><Plus size={18}/></Button></div>
        <div class="search"><Search size={16}/><input bind:value={query} placeholder="Numer, dostawca, ładunek..." /></div>
        <div class="queue-filters"><button class="selected">Wszystkie <span>{queue.length}</span></button><button>ZG <span>2</span></button><button>ZZ <span>1</span></button><button aria-label="Filtry"><ListFilter size={15}/></button></div>
        <div class="queue-list">
          {#each filteredQueue as item}
            <article class="queue-card" draggable="true" ondragstart={(e) => e.dataTransfer?.setData('text/plain', item.id)}>
              <GripVertical size={17} class="grip"/><div class="queue-content"><div class="queue-top"><span class="doc-id">{item.id}</span><span class="duration"><Clock3 size={12}/>{item.duration} h</span></div><strong>{item.supplier}</strong><p>{item.load}</p><div class="meta"><span><PackageOpen size={13}/>{item.pallets} pal.</span><span><Weight size={13}/>{item.weight}</span></div></div>
            </article>
          {:else}<div class="empty">Brak pasujących zamówień.</div>{/each}
        </div>
        <div class="drop-hint"><GripVertical size={15}/><span>Przeciągnij zamówienie na wolny termin</span></div>
      </section>

      <section class="calendar-panel">
        <div class="calendar-toolbar">
          <div><span class="eyebrow">TERMINARZ DOSTAW</span><h1>28 kwietnia – 2 maja 2025</h1></div>
          <div class="toolbar-actions"><div class="segmented">{#each ['Dzień','Tydzień','Miesiąc'] as p}<button class:active={period===p} onclick={() => period=p as typeof period}>{p}</button>{/each}</div><Button variant="outline" size="sm"><Dock size={15}/>{dockFilter}</Button><Button size="sm" onclick={() => addOpen=true}><Plus size={16}/>Nowa awizacja</Button></div>
        </div>
        <div class="date-nav"><div class="arrows"><button aria-label="Poprzedni tydzień"><ChevronLeft size={17}/></button><button aria-label="Następny tydzień"><ChevronRight size={17}/></button></div><button class="today">Dzisiaj</button><div class="legend">{#each Object.entries(statusColors) as [status,color]}<span><i class={color}></i>{status}</span>{/each}</div></div>

        <div class="calendar-wrap">
          {#if period === 'Tydzień'}
            <div class="calendar-grid">
              <div class="corner"><Clock3 size={14}/><span>GMT+2</span></div>
              {#each days as day, index}<div class:closed={index===3} class="day-head"><span>{day.week}</span><strong>{day.date}</strong>{#if index===0}<b>DZIŚ</b>{/if}{#if index===3}<small>ŚWIĘTO</small>{/if}</div>{/each}
              {#each hours as hour}
                <div class="time-label">{String(hour).padStart(2,'0')}:00</div>
                {#each days as day, dayIndex}
                  <div role="gridcell" tabindex="0" aria-label={`Wolny termin ${day.date}, ${hour}:00`} class:closed={dayIndex===3} class="time-cell" ondragover={(e)=>e.preventDefault()} ondrop={(e)=>dropDelivery(e,dayIndex,hour)}>
                    {#each deliveries.filter(d => d.day===dayIndex && Math.floor(d.start ?? 0)===hour) as item}
                      <button class="event {item.color}" style={`height:${Math.max(54,item.duration*58)}px; top:${((item.start??hour)-hour)*58}px`} onclick={() => selected=item}>
                        <span class="event-time">{String(Math.floor(item.start??hour)).padStart(2,'0')}:{(item.start??hour)%1?'30':'00'} · {item.dock}</span><strong>{item.id}</strong><span>{item.supplier}</span><small>{item.plate || 'Brak rejestracji'}</small>{#if item.status==='Konflikt'}<CircleAlert size={14} class="alert-icon"/>{/if}
                      </button>
                    {/each}
                  </div>
                {/each}
              {/each}
            </div>
          {:else if period === 'Dzień'}
            <div class="day-calendar">
              <div class="corner"><Clock3 size={14}/><span>GMT+2</span></div>
              {#each docks as dock, dockIndex}<div class="day-head"><span>DOK</span><strong>{String(dockIndex+1).padStart(2,'0')}</strong><small>{dockEnabled[dockIndex] ? 'AKTYWNY' : 'WYŁĄCZONY'}</small></div>{/each}
              {#each hours as hour}
                <div class="time-label">{String(hour).padStart(2,'0')}:00</div>
                {#each docks as dock, dockIndex}
                  <div role="gridcell" tabindex="0" aria-label={`${dock}, ${hour}:00`} class:closed={!dockEnabled[dockIndex]} class="time-cell" ondragover={(e)=>e.preventDefault()} ondrop={(e)=>dropDelivery(e,0,hour)}>
                    {#each deliveries.filter(d => d.day===0 && d.dock===dock && Math.floor(d.start ?? 0)===hour) as item}
                      <button class="event {item.color}" style={`height:${Math.max(54,item.duration*58)}px; top:${((item.start??hour)-hour)*58}px`} onclick={() => selected=item}>
                        <span class="event-time">{String(Math.floor(item.start??hour)).padStart(2,'0')}:{(item.start??hour)%1?'30':'00'} · {item.duration} h</span><strong>{item.id}</strong><span>{item.supplier}</span><small>{item.plate}</small>
                      </button>
                    {/each}
                  </div>
                {/each}
              {/each}
            </div>
          {:else}
            <div class="month-calendar">
              {#each ['PON','WTO','ŚRO','CZW','PIĄ','SOB','NIE'] as weekday}<div class="month-weekday">{weekday}</div>{/each}
              {#each monthDays as date, index}
                <div class:other={date.other} class:closed={index===3 || index===4} class:today={date.n===2 && !date.other} class="month-cell">
                  <div class="month-number"><span>{date.n}</span>{#if date.n===1 && !date.other}<small>ŚWIĘTO</small>{/if}{#if date.n===2 && !date.other}<b>DZIŚ</b>{/if}</div>
                  {#each deliveries.filter(d => (d.day??-1)+28===date.day+28).slice(0,3) as item}
                    <button class="month-event {item.color}" onclick={() => selected=item}><i></i><strong>{item.start}:00</strong><span>{item.id}</span><small>{item.dock}</small></button>
                  {/each}
                  {#if index===3}<span class="closed-label">Magazyn zamknięty</span>{/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </section>
    </main>
  {:else if view === 'dostawca'}
    <main class="supplier-page">
      <div class="page-title"><div><span class="eyebrow">PANEL DOSTAWCY · NORDSTEEL SP. Z O.O.</span><h1>Zaplanuj dostawę</h1><p>Wybierz wolny termin dla potwierdzonego zamówienia.</p></div><Badge variant="outline"><span class="live-dot"></span>Dane aktualne</Badge></div>
      <section class="supplier-layout">
        <aside class="finder-card">
          <div class="finder-icon"><CalendarSearch size={22}/></div><h2>Znajdź wolny termin</h2><p>Sprawdzimy dostępność doków w ciągu najbliższych 14 dni.</p>
          <label>Zamówienie<select><option>ZG/0450/25 · Blacha</option><option>ZG/0462/25 · Pręty</option></select></label>
          <label>Czas rozładunku<select bind:value={searchDuration}><option>30 minut</option><option>1 godzina</option><option>2 godziny</option><option>4 godziny</option></select></label>
          <div class="two-fields"><label>Najwcześniej<Input type="time" bind:value={searchFrom}/></label><label>Najpóźniej<Input type="time" bind:value={searchTo}/></label></div>
          <Button class="wide" onclick={() => searchDone=true}><Search size={16}/>Pokaż wolne terminy</Button>
        </aside>
        <section class="availability">
          <div class="availability-head"><div><h2>Dostępne terminy</h2><p>{searchDone ? `Wyniki dla ${searchDuration}, ${searchFrom}–${searchTo}` : 'Najbliższe wolne okna'}</p></div><div class="privacy"><ShieldAlert size={15}/>Widzisz tylko dostępność, bez danych innych dostaw</div></div>
          <div class="slot-days">
            {#each [{d:'WT',n:'29',m:'KWI',slots:['08:00','10:30','13:00']},{d:'ŚR',n:'30',m:'KWI',slots:['07:30','09:00','12:30']},{d:'PT',n:'02',m:'MAJ',slots:['08:30','11:00']},{d:'PN',n:'05',m:'MAJ',slots:['07:00','09:30','13:30']}] as day, idx}
              <article class="slot-day"><div class="slot-date"><span>{day.d}</span><strong>{day.n}</strong><small>{day.m}</small></div><div class="slots">{#each day.slots as slot}<button onclick={() => toast=`Wybrano ${day.n} ${day.m}, ${slot}`}>{slot}<span>{idx%2===0?'DOK 02':'DOK 01'}</span><ArrowRight size={15}/></button>{/each}</div></article>
            {/each}
          </div>
        </section>
      </section>
      <section class="my-deliveries"><div class="section-head"><div><h2>Moje dostawy</h2><p>Zaplanowane, trwające i zakończone.</p></div><Button variant="outline" size="sm">Zobacz wszystkie <ArrowRight size={15}/></Button></div><div class="delivery-table"><div class="tr th"><span>Dokument</span><span>Termin</span><span>Pojazd</span><span>Status</span><span></span></div>{#each deliveries.slice(0,4) as d}<div class="tr"><strong>{d.id}<small>{d.load}</small></strong><span>{days[d.day??0].date}, {d.start}:00<small>{d.dock}</small></span><span>{d.plate}</span><span><i class="status-pill {d.color}">{d.status}</i></span><button aria-label="Szczegóły"><MoreHorizontal size={17}/></button></div>{/each}</div></section>
    </main>
  {:else}
    <main class="config-page">
      <div class="page-title"><div><span class="eyebrow">USTAWIENIA TERMINARZA</span><h1>Doki i dostępność</h1><p>Ustal godziny pracy magazynu i wyłącz dni bez dostaw.</p></div><Button onclick={() => toast='Zmiany zapisane'}><Check size={16}/>Zapisz zmiany</Button></div>
      <div class="config-layout"><aside class="settings-nav"><button class="active"><Dock size={17}/>Doki i godziny</button><button><SlidersHorizontal size={17}/>Pola awizacji</button><button><Bell size={17}/>Powiadomienia</button><button><UserRound size={17}/>Użytkownicy</button></aside>
        <section class="config-content">
          <article class="settings-card"><div class="settings-head"><div><h2>Doki rozładunkowe</h2><p>Aktywne doki są dostępne w terminarzu.</p></div><span>{dockEnabled.filter(Boolean).length} aktywne</span></div><div class="dock-list">{#each docks as dock, i}<div class:disabled={!dockEnabled[i]}><span class="dock-symbol"><Warehouse size={18}/></span><strong>{dock}<small>{i===0?'Dostawy całopojazdowe':i===1?'Drobnica i palety':'Materiały specjalne'}</small></strong><label class="switch"><input type="checkbox" bind:checked={dockEnabled[i]} aria-label={`Aktywność ${dock}`}/><span></span></label><button aria-label={`Usuń ${dock}`} onclick={() => {docks.splice(i,1);dockEnabled.splice(i,1)}}><Trash2 size={16}/></button></div>{/each}</div><div class="add-dock"><Input bind:value={newDock} placeholder="Nazwa nowego doku"/><Button variant="outline" onclick={addDock}><Plus size={16}/>Dodaj dok</Button></div></article>
          <article class="settings-card"><div class="settings-head"><div><h2>Standardowe godziny przyjęć</h2><p>Możesz ustawić inne godziny dla każdego dnia.</p></div></div><div class="hours-list">{#each workDays as row}<div class:disabled={!row.on}><label class="switch"><input type="checkbox" bind:checked={row.on} aria-label={`Dostawy w dniu ${row.day}`}/><span></span></label><strong>{row.day}</strong>{#if row.on}<Input type="time" bind:value={row.from}/><span>do</span><Input type="time" bind:value={row.to}/>{:else}<small>Brak przyjęć</small>{/if}</div>{/each}</div></article>
          <article class="settings-card exceptions"><div class="settings-head"><div><h2>Wyjątki w kalendarzu</h2><p>Dni zamknięte lub ze skróconymi godzinami.</p></div><Button variant="outline" size="sm"><Plus size={15}/>Dodaj wyjątek</Button></div><div class="exception-row"><div class="exception-date"><strong>01</strong><span>MAJ<br/>2025</span></div><div><strong>Święto Pracy</strong><p>Magazyn zamknięty</p></div><Badge variant="secondary">Dzień wyłączony</Badge><button><X size={16}/></button></div><div class="exception-row"><div class="exception-date"><strong>02</strong><span>MAJ<br/>2025</span></div><div><strong>Skrócony dzień pracy</strong><p>Przyjęcia od 07:00 do 12:00</p></div><Badge variant="outline">Skrócone godziny</Badge><button><X size={16}/></button></div></article>
        </section>
      </div>
    </main>
  {/if}
</div>

{#if selected}
  <div class="drawer-backdrop" role="presentation" onclick={() => selected=null}></div>
  <aside class="detail-drawer">
    <div class="drawer-head"><div><Badge variant="outline">{selected.dock}</Badge><h2>{selected.id}</h2><p>{selected.supplier}</p></div><button onclick={() => selected=null}><X size={20}/></button></div>
    <div class="status-banner {selected.color}"><span><i></i>{selected.status}</span><small>{days[selected.day??0].date} · {selected.start}:00–{(selected.start??0)+selected.duration}:00</small></div>
    <div class="drawer-section"><span class="eyebrow">TRANSPORT</span><div class="plate"><Truck size={20}/><div><small>NUMER REJESTRACYJNY</small><strong>{selected.plate}</strong></div></div><div class="info-grid"><div><PackageOpen size={17}/><span>Ładunek<strong>{selected.load}</strong></span></div><div><Weight size={17}/><span>Masa<strong>{selected.weight}</strong></span></div><div><LayoutGrid size={17}/><span>Nośniki<strong>{selected.pallets} palet</strong></span></div><div><ShieldAlert size={17}/><span>Klasa ADR<strong>Nie dotyczy</strong></span></div></div></div>
    <div class="drawer-section"><span class="eyebrow">DODATKOWE INFORMACJE</span><div class="extra-fields"><div><small>Pole A</small><span>Nr partii: NS-0425</span></div><div><small>Pole B</small><span>Rozładunek bokiem</span></div><div><small>Pole C</small><span>Kontakt: +48 600 230 411</span></div><button>+ 7 dodatkowych pól</button></div></div>
    <div class="drawer-footer"><Button variant="outline"><ExternalLink size={15}/>Dokument źródłowy</Button><Button onclick={() => advanceStatus(selected!)}>{#if selected.status==='W trakcie rozładunku'}<LogOut size={16}/>{:else}<Check size={16}/>{/if} {selected.status==='W trakcie rozładunku'?'Zakończ rozładunek':'Potwierdź podjazd auta'}</Button></div>
  </aside>
{/if}

<Dialog.Root bind:open={addOpen}><Dialog.Content class="sm:max-w-[520px]"><Dialog.Header><Dialog.Title>Nowa awizacja</Dialog.Title><Dialog.Description>Dodaj dokument ZG lub dostawę spoza systemu.</Dialog.Description></Dialog.Header><div class="dialog-form"><label>Numer dokumentu<Input placeholder="np. ZG/0480/25 lub własny numer"/></label><label>Dostawca<Input placeholder="Nazwa firmy"/></label><div class="two-fields"><label>Data<Input type="date" value="2025-04-30"/></label><label>Godzina<Input type="time" value="10:00"/></label></div><div class="two-fields"><label>Numer rejestracyjny<Input placeholder="np. PO 1234A"/></label><label>Liczba palet<Input type="number" placeholder="0"/></label></div></div><Dialog.Footer><Button variant="outline" onclick={() => addOpen=false}>Anuluj</Button><Button onclick={() => {addOpen=false;toast='Awizacja została dodana'}}>Dodaj awizację</Button></Dialog.Footer></Dialog.Content></Dialog.Root>

{#if toast}<div class="toast"><Check size={18}/><span>{toast}</span><button onclick={() => toast=''}><X size={15}/></button></div>{/if}
