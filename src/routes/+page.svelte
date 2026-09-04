<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import * as Dialog from '$lib/components/ui/dialog';
  import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Clock3, Dock, GripVertical, LayoutGrid, ListFilter, Plus, Search, Settings2, SlidersHorizontal, Truck, UserRound, Warehouse, X, Check, MapPin, Weight, PackageOpen, ShieldAlert, LogOut, Bell, MoreHorizontal, ExternalLink, ArrowRight, CalendarSearch, Trash2 } from '@lucide/svelte';

  type View = 'terminarz' | 'dostawca' | 'konfiguracja';
  type Delivery = { id:string; supplier:string; load:string; pallets:number; weight:string; duration:number; status:string; plate:string; dock?:string; day?:number; start?:number; color:string; erpStatus?:string; orderDate?:string; lines?:Array<{code:string;name:string;quantity:string;delivery:string}>; hasConflict?:boolean; conflictSide?:'left'|'right'; conflictWith?:string };
  type SupplierSlot = { key:string; d:string; n:string; m:string; dateLabel:string; time:string; dock:string; start:number; day:number };

  let { data }: { data: { user: { login:string; name:string; role:'admin'|'supplier' } } } = $props();
  let role = $derived(data.user.role);
  let view: View = $state('terminarz');
  let period = $state<'Dzień'|'Tydzień'|'Miesiąc'>('Tydzień');
  let dockFilter = $state('Wszystkie doki');
  let dockMenuOpen = $state(false);
  let visibleDocks = $state([true, true, true]);

  function showAllDocks() {
    visibleDocks = docks.map(() => true);
  }
  let query = $state('');
  let selected: Delivery | null = $state(null);
  let selectedOrderDocument: Delivery | null = $state(null);
  let resolvingConflict = $state(false);
  let orderOpen = $state(false);
  let addOpen = $state(false);
  let toast = $state('');
  let newOrderNumber = $state('');
  let newSupplier = $state('');
  let orderLinked = $state(false);
  let supplierSuggestionsOpen = $state(false);
  let newDockPreference = $state('Dowolny');
  let cargoDescription = $state('');
  let newAwizationFields = $state<Record<string,string>>({});
  let newDate = $state('2025-04-30');
  let newTime = $state('10:00');
  let newPlate = $state('');
  let newPallets = $state('');
  let searchDuration = $state('1 godzina');
  let searchFrom = $state('08:00');
  let searchTo = $state('12:00');
  let searchDone = $state(false);
  let selectedOrder = $state('ZG/0462/25');
  let slotResults = $state<SupplierSlot[]>([]);
  let draggedDelivery: Delivery | null = $state(null);
  let dragTarget = $state<{ day:number; hour:number; dock?:string } | null>(null);
  let pendingSlot = $state<SupplierSlot | null>(null);
  let bookingOpen = $state(false);
  let supplierDeliveries = $state<Delivery[]>([]);
  let configTab = $state<'docks'|'fields'|'notifications'|'users'>('docks');
  let customFields = $state([
    {name:'Pole A',label:'Numer partii',value:'NS-0425',enabled:true},
    {name:'Pole B',label:'Sposób rozładunku',value:'Rozładunek bokiem',enabled:true},
    {name:'Pole C',label:'Osoba kontaktowa',value:'+48 600 230 411',enabled:true},
    {name:'Pole D',label:'Uwagi dla magazynu',value:'Wymagany wózek 5 t',enabled:true},
    {name:'Pole E',label:'Numer plomby',value:'PL-884190',enabled:true},
    {name:'Pole F',label:'Temperatura ładunku',value:'18°C',enabled:true},
    {name:'Pole G',label:'Kraj pochodzenia',value:'Niemcy',enabled:true},
    {name:'Pole H',label:'Numer partii dostawcy',value:'HU-2025-118',enabled:true},
    {name:'Pole I',label:'Rodzaj opakowania',value:'Paleta EUR',enabled:true},
    {name:'Pole J',label:'Wymagane wyposażenie',value:'Rampa mobilna',enabled:true}
  ]);
  let notifications = $state([
    {title:'Konflikt terminów',description:'Gdy dwie dostawy zajmują ten sam dok.',enabled:true},
    {title:'Opóźniony przyjazd',description:'Po przekroczeniu zaplanowanej godziny.',enabled:true},
    {title:'Nowa rezerwacja dostawcy',description:'Gdy dostawca sam wybierze wolny termin.',enabled:true},
    {title:'Zakończenie rozładunku',description:'Po zamknięciu awizacji przez magazyniera.',enabled:false}
  ]);
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
  function dockClass(dock?:string) {
    return dock === 'DOK 02' ? 'dock-2' : dock === 'DOK 03' ? 'dock-3' : 'dock-1';
  }
  const monthDays = [
    {n:28,other:true,day:0},{n:29,other:true,day:1},{n:30,other:true,day:2},
    ...Array.from({length:31},(_,i)=>({n:i+1,other:false,day:i+3})),
    {n:1,other:true,day:34}
  ];

  const days = [
    { week:'PN', date:'28 KWI' }, { week:'WT', date:'29 KWI' }, { week:'ŚR', date:'30 KWI' },
    { week:'CZW', date:'1 MAJ' }, { week:'PT', date:'2 MAJ' }
  ];
  const hours = Array.from({length:17},(_,index) => 7 + index * .5);
  function formatTime(value:number) {
    const hour = String(Math.floor(value)).padStart(2,'0');
    return `${hour}:${value % 1 ? '30' : '00'}`;
  }
  const statusColors: Record<string,string> = {
    'Planowany':'blue', 'Konflikt':'red', 'Oczekujący':'amber', 'Opóźniony':'orange',
    'Zakończony':'slate', 'W trakcie rozładunku':'green'
  };
  const supplierOrders = [
    {id:'ZG/0462/25', label:'ZG/0462/25 · Pręty miedziane', supplier:'Hutmen S.A.', load:'Pręty miedziane', pallets:6, weight:'7 200 kg'},
    {id:'ZG/0467/25', label:'ZG/0467/25 · Podzespoły', supplier:'TechnoParts', load:'Podzespoły', pallets:3, weight:'1 850 kg'},
    {id:'ZG/0471/25', label:'ZG/0471/25 · Opakowania', supplier:'EuroPack', load:'Opakowania zwrotne', pallets:18, weight:'4 600 kg'}
  ];
  const availableSlots: SupplierSlot[] = [
    {key:'29-0800',d:'WT',n:'29',m:'KWI',dateLabel:'29 KWI',time:'08:00',dock:'DOK 02',start:8,day:1},
    {key:'29-1030',d:'WT',n:'29',m:'KWI',dateLabel:'29 KWI',time:'10:30',dock:'DOK 02',start:10.5,day:1},
    {key:'29-1300',d:'WT',n:'29',m:'KWI',dateLabel:'29 KWI',time:'13:00',dock:'DOK 02',start:13,day:1},
    {key:'30-0730',d:'ŚR',n:'30',m:'KWI',dateLabel:'30 KWI',time:'07:30',dock:'DOK 01',start:7.5,day:2},
    {key:'30-0900',d:'ŚR',n:'30',m:'KWI',dateLabel:'30 KWI',time:'09:00',dock:'DOK 01',start:9,day:2},
    {key:'30-1230',d:'ŚR',n:'30',m:'KWI',dateLabel:'30 KWI',time:'12:30',dock:'DOK 01',start:12.5,day:2},
    {key:'02-0830',d:'PT',n:'02',m:'MAJ',dateLabel:'2 MAJ',time:'08:30',dock:'DOK 02',start:8.5,day:4},
    {key:'02-1100',d:'PT',n:'02',m:'MAJ',dateLabel:'2 MAJ',time:'11:00',dock:'DOK 02',start:11,day:4},
    {key:'05-0700',d:'PN',n:'05',m:'MAJ',dateLabel:'5 MAJ',time:'07:00',dock:'DOK 01',start:7,day:7},
    {key:'05-0930',d:'PN',n:'05',m:'MAJ',dateLabel:'5 MAJ',time:'09:30',dock:'DOK 01',start:9.5,day:7},
    {key:'05-1330',d:'PN',n:'05',m:'MAJ',dateLabel:'5 MAJ',time:'13:30',dock:'DOK 01',start:13.5,day:7}
  ];
  const deliveries = $state<Delivery[]>([
    { id:'ZG/0450/25', supplier:'NordSteel Sp. z o.o.', load:'Blacha zimnowalcowana', pallets:8, weight:'12 400 kg', duration:2, status:'Planowany', plate:'WGM 4K92', dock:'DOK 01', day:0, start:8, color:'blue' },
    { id:'ZG/0441/25', supplier:'Polimer SA', load:'Granulat PA6', pallets:14, weight:'8 200 kg', duration:1.5, status:'W trakcie rozładunku', plate:'PO 8N220', dock:'DOK 02', day:0, start:10.5, color:'green' },
    { id:'ZZ/0198/25', supplier:'Logistar GmbH', load:'Komponenty montażowe', pallets:5, weight:'3 850 kg', duration:1, status:'Oczekujący', plate:'B-QL 774', dock:'DOK 03', day:1, start:7.5, color:'amber' },
    { id:'ZG/0427/25', supplier:'Stalmet S.A.', load:'Profile aluminiowe', pallets:12, weight:'9 700 kg', duration:2, status:'Planowany', plate:'SK 92LT', dock:'DOK 01', day:2, start:11, color:'blue' },
    { id:'ZZ/0204/25', supplier:'AluTrade GmbH', load:'Formatki aluminiowe', pallets:7, weight:'5 900 kg', duration:1.5, status:'Planowany', plate:'B-AT 204', dock:'DOK 01', day:2, start:11, color:'blue' },
    { id:'ZG/0409/25', supplier:'Chemiko Sp. z o.o.', load:'Środki techniczne', pallets:4, weight:'2 100 kg', duration:1, status:'Opóźniony', plate:'KR 7PY42', dock:'DOK 02', day:4, start:9, color:'orange' },
    { id:'ZG/0398/25', supplier:'Metalform', load:'Odlewy żeliwne', pallets:10, weight:'11 300 kg', duration:1.5, status:'Zakończony', plate:'DW 3E129', dock:'DOK 03', day:1, start:13, color:'slate' }
  ]);
  function recomputeConflicts() {
    for (const delivery of deliveries) {
      delivery.hasConflict = false;
      delivery.conflictWith = undefined;
      delivery.conflictSide = undefined;
    }

    for (let leftIndex = 0; leftIndex < deliveries.length; leftIndex += 1) {
      const left = deliveries[leftIndex];
      if (left.day === undefined || left.start === undefined || !left.dock) continue;

      for (let rightIndex = leftIndex + 1; rightIndex < deliveries.length; rightIndex += 1) {
        const right = deliveries[rightIndex];
        if (right.day !== left.day || right.dock !== left.dock || right.start === undefined) continue;
        if (left.start >= right.start + right.duration || right.start >= left.start + left.duration) continue;

        left.hasConflict = true;
        right.hasConflict = true;
        left.conflictWith ??= right.id;
        right.conflictWith ??= left.id;
        if (left.start === right.start) {
          left.conflictSide ??= 'left';
          right.conflictSide ??= 'right';
        }
      }
    }
  }

  function isDockFree(dock:string, day:number, start:number, duration:number, excluded?:Delivery) {
    return !deliveries.some(item =>
      item !== excluded &&
      item.dock === dock &&
      item.day === day &&
      item.start !== undefined &&
      start < item.start + item.duration &&
      item.start < start + duration
    );
  }

  function firstFreeDock(day:number, start:number, duration:number, excluded?:Delivery) {
    return docks.find((dock, index) =>
      dockEnabled[index] && isDockFree(dock, day, start, duration, excluded)
    );
  }

  function sharesTimeWithAnotherDock(item:Delivery) {
    if (item.day === undefined || item.start === undefined || !item.dock) return false;
    return deliveries.some(other =>
      other !== item &&
      other.day === item.day &&
      other.start !== undefined &&
      other.dock !== item.dock &&
      item.start! < other.start + other.duration &&
      other.start < item.start! + item.duration
    );
  }

  function changeDeliveryDock(item:Delivery, dock:string) {
    item.dock = dock;
    recomputeConflicts();
    toast = `${item.id} przeniesiono do ${dock}`;
    setTimeout(() => toast = '', 3200);
  }

  function resolveSelectedConflict() {
    if (!selected?.conflictWith) return;
    const other = deliveries.find(item => item.id === selected?.conflictWith);
    if (!other) return;

    const selectedIndex = deliveries.indexOf(selected);
    const otherIndex = deliveries.indexOf(other);
    const younger = selectedIndex > otherIndex ? selected : other;
    if (younger.day === undefined || younger.start === undefined) return;

    const freeDock = firstFreeDock(younger.day, younger.start, younger.duration, younger);
    if (!freeDock) {
      toast = 'Brak wolnego doku w tym terminie';
      setTimeout(() => toast = '', 3200);
      return;
    }

    younger.dock = freeDock;
    recomputeConflicts();
    resolvingConflict = false;
    toast = `${younger.id} przeniesiono do ${freeDock}. Konflikt rozwiązany.`;
    setTimeout(() => toast = '', 3200);
  }

  function createAwization() {
    const [hour, minute] = newTime.split(':').map(Number);
    const start = hour + minute / 60;
    const day = {
      '2025-04-28':0,
      '2025-04-29':1,
      '2025-04-30':2,
      '2025-05-01':3,
      '2025-05-02':4
    }[newDate] ?? 2;
    const linkedOrder = orderLinked ? queue.find(item => item.id.toUpperCase() === newOrderNumber.trim().toUpperCase()) : undefined;
    const duration = linkedOrder?.duration ?? 1;
    const dock = newDockPreference === 'Dowolny'
      ? firstFreeDock(day, start, duration)
      : newDockPreference;

    if (!dock) {
      toast = 'Brak wolnego doku w tym terminie';
      setTimeout(() => toast = '', 3200);
      return;
    }

    const item:Delivery = linkedOrder ?? {
      id:`AW/${String(deliveries.length + queue.length + 1).padStart(4,'0')}/25`,
      supplier:newSupplier.trim() || 'Dostawca nieuzupełniony',
      load:cargoDescription.trim() || 'Brak opisu',
      pallets:Number(newPallets) || 0,
      weight:'Do uzupełnienia',
      duration,
      status:'Planowany',
      plate:newPlate.trim() || 'Do uzupełnienia',
      color:'blue'
    };
    item.day = day;
    item.start = start;
    item.dock = dock;
    item.status = 'Planowany';
    item.color = 'blue';
    if (newPlate.trim()) item.plate = newPlate.trim();
    if (newPallets) item.pallets = Number(newPallets);
    if (cargoDescription.trim()) item.load = cargoDescription.trim();

    if (linkedOrder) queue.splice(queue.indexOf(linkedOrder), 1);
    deliveries.push(item);
    recomputeConflicts();
    addOpen = false;
    toast = `${item.id} dodano. Przypisany dok: ${dock}`;
    newDockPreference = 'Dowolny';
    setTimeout(() => toast = '', 3200);
  }
  recomputeConflicts();
  const queue = $state<Delivery[]>([
    { id:'ZG/0462/25', supplier:'Hutmen S.A.', load:'Pręty miedziane', pallets:6, weight:'7 200 kg', duration:2, status:'Oczekujący', plate:'', color:'violet', erpStatus:'Potwierdzone', orderDate:'24.04.2025', lines:[{code:'MIE-PR-20',name:'Pręt miedziany Cu-ETP Ø20',quantity:'3 200 kg',delivery:'29.04.2025'},{code:'MIE-PR-35',name:'Pręt miedziany Cu-ETP Ø35',quantity:'4 000 kg',delivery:'29.04.2025'}] },
    { id:'ZG/0467/25', supplier:'TechnoParts', load:'Podzespoły', pallets:3, weight:'1 850 kg', duration:1, status:'Oczekujący', plate:'', color:'teal', erpStatus:'W realizacji', orderDate:'25.04.2025', lines:[{code:'TP-88410',name:'Zespół łożyskowy A14',quantity:'240 szt.',delivery:'30.04.2025'},{code:'TP-11802',name:'Obudowa przekładni P8',quantity:'80 szt.',delivery:'30.04.2025'}] },
    { id:'ZG/0471/25', supplier:'EuroPack', load:'Opakowania zwrotne', pallets:18, weight:'4 600 kg', duration:1.5, status:'Oczekujący', plate:'', color:'indigo', erpStatus:'Potwierdzone', orderDate:'25.04.2025', lines:[{code:'PAL-EUR-A',name:'Paleta EUR EPAL klasa A',quantity:'120 szt.',delivery:'02.05.2025'},{code:'KOSZ-GIT',name:'Kosz transportowy Gitterbox',quantity:'24 szt.',delivery:'02.05.2025'}] }
  ]);

  let filteredQueue = $derived(queue.filter(x => (x.id + x.supplier + x.load).toLowerCase().includes(query.toLowerCase())));
  let supplierNames = $derived([...new Set([...queue, ...deliveries].map(item => item.supplier))]);
  let supplierSuggestions = $derived(
    supplierNames.filter(name => name.toLocaleLowerCase('pl').includes(newSupplier.trim().toLocaleLowerCase('pl')))
  );
  function selectSupplier(name: string) {
    newSupplier = name;
    supplierSuggestionsOpen = false;
  }
  let resultDays = $derived(Array.from(new Map(slotResults.map(slot => [slot.dateLabel,{d:slot.d,n:slot.n,m:slot.m,dateLabel:slot.dateLabel}])).values()));

  function startDeliveryDrag(event: DragEvent, item: Delivery) {
    draggedDelivery = item;
    event.dataTransfer?.setData('text/plain', item.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  function moveDeliveryPreview(event: DragEvent, day:number, hour:number, dock?:string) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    dragTarget = { day, hour, dock };
  }

  function leaveDeliveryTarget(event: DragEvent) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(next)) return;
    dragTarget = null;
  }

  function finishDeliveryDrag() {
    draggedDelivery = null;
    dragTarget = null;
  }

  function isDragTarget(day:number, hour:number, dock?:string) {
    return dragTarget?.day === day && dragTarget.hour === hour && dragTarget.dock === dock;
  }

  function dropDelivery(event: DragEvent, day:number, hour:number, dock?:string) {
    event.preventDefault();
    const id = event.dataTransfer?.getData('text/plain');
    const item = queue.find(x => x.id === id) ?? deliveries.find(x => x.id === id);
    if (!item) return;
    const queued = queue.includes(item);
    const targetDock = dock ?? (queued ? firstFreeDock(day, hour, item.duration, item) : item.dock) ?? docks[0];
    item.day = day; item.start = hour; item.dock = targetDock;
    if (queued) {
      item.status = 'Planowany';
      item.color = 'blue';
      queue.splice(queue.indexOf(item), 1);
      deliveries.push(item);
    }
    recomputeConflicts();
    finishDeliveryDrag();
    toast = `${item.id} zaplanowano na ${days[day].date}, ${formatTime(hour)}`;
    setTimeout(() => toast = '', 3200);
  }
  function advanceStatus(item:Delivery) {
    if (item.status === 'W trakcie rozładunku') item.status = 'Zakończony';
    else item.status = 'W trakcie rozładunku';
    item.color = item.status === 'Zakończony' ? 'slate' : 'green';
    toast = item.status === 'Zakończony' ? 'Rozładunek zakończony. Pojazd może odjechać.' : 'Potwierdzono podjazd. Rozładunek rozpoczęty.';
    setTimeout(() => toast = '', 3200);
  }
  function searchSupplierSlots() {
    const [fromHour,fromMinute] = searchFrom.split(':').map(Number);
    const [toHour,toMinute] = searchTo.split(':').map(Number);
    const from = fromHour + fromMinute / 60;
    const to = toHour + toMinute / 60;
    const duration = {'30 minut':.5,'1 godzina':1,'2 godziny':2,'4 godziny':4}[searchDuration] ?? 1;
    slotResults = availableSlots.filter(slot => slot.start >= from && slot.start + duration <= to);
    searchDone = true;
  }

  function confirmSupplierBooking() {
    if (!pendingSlot) return;
    const order = supplierOrders.find(item => item.id === selectedOrder);
    if (!order) return;
    supplierDeliveries.unshift({
      ...order,
      duration: {'30 minut':.5,'1 godzina':1,'2 godziny':2,'4 godziny':4}[searchDuration] ?? 1,
      status:'Planowany',
      plate:'Do uzupełnienia',
      dock:pendingSlot.dock,
      day:pendingSlot.day,
      start:pendingSlot.start,
      color:'blue'
    });
    availableSlots.splice(availableSlots.findIndex(slot => slot.key === pendingSlot?.key),1);

    slotResults = slotResults.filter(slot => slot.key !== pendingSlot?.key);
    bookingOpen = false;
    toast = `${selectedOrder} zaplanowano na ${pendingSlot.dateLabel}, ${pendingSlot.time}`;
    pendingSlot = null;
    setTimeout(() => toast = '', 3200);
  }
  function addCustomField() {
    const suffix = String.fromCharCode(65 + customFields.length);
    customFields.push({
      name:`Pole ${suffix}`,
      label:`Dodatkowa informacja ${customFields.length + 1}`,
      value:'Brak danych',
      enabled:true
    });
  }
  function addDock() {
    if (!newDock.trim()) return;
    docks.push(newDock.trim().toUpperCase());
    dockEnabled.push(true);
    newDock='';
  }

  function linkPurchaseOrder() {
    const normalized = newOrderNumber.trim().toUpperCase();
    const order = queue.find(item => item.id.toUpperCase() === normalized);
    if (!order) {
      orderLinked = false;
      toast = 'Nie znaleziono zamówienia w ImpulsERP';
      setTimeout(() => toast = '', 3200);
      return;
    }
    newSupplier = order.supplier;
    cargoDescription = order.lines?.map(line => `${line.name}, ${line.quantity}`).join('\n') ?? order.load;
    orderLinked = true;
  }
</script>

<svelte:head><title>Dockflow — Awizacje dostaw</title><meta name="description" content="Planowanie dostaw i obsługa doków magazynowych" /></svelte:head>

<div class="app-shell">
  <header class="topbar">
    <button class="brand" onclick={() => view='terminarz'}><span class="brand-mark"><Dock size={19}/></span><span>DOCK<span>FLOW</span></span></button>
    <nav aria-label="Główna nawigacja">
      <button class:active={view==='terminarz'} onclick={() => view='terminarz'}><CalendarDays size={17}/>Terminarz</button>
      <button class:active={view==='dostawca'} onclick={() => view='dostawca'}><Truck size={17}/>Panel dostawcy</button>
      {#if role === 'admin'}<button class:active={view==='konfiguracja'} onclick={() => view='konfiguracja'}><Settings2 size={17}/>Konfiguracja</button>{/if}
    </nav>
    <div class="top-actions">
      <button class="icon-button" aria-label="Powiadomienia"><Bell size={18}/><span class="notification"></span></button>
      <div class="account-summary">
        <span class="avatar">{role === 'admin' ? 'KM' : 'NS'}</span>
        <span class="user"><strong>{data.user.name}</strong><span>{role === 'admin' ? 'Administrator' : 'Dostawca'}</span></span>
      </div>
      <a class="logout-button" href="/logout"><LogOut size={16}/>Wyloguj</a>
    </div>
  </header>

  {#if view === 'terminarz'}
    <main class="workspace">
      <section class="queue-panel">
        <div class="panel-heading"><div><span class="eyebrow">DO ZAPLANOWANIA</span><h2>Zamówienia <Badge variant="secondary">{queue.length}</Badge></h2></div><Button size="icon" variant="outline" onclick={() => addOpen=true}><Plus size={18}/></Button></div>
        <div class="search"><Search size={16}/><input bind:value={query} placeholder="Numer, dostawca, ładunek..." /></div>
        <div class="queue-filters"><button class="selected">Wszystkie <span>{queue.length}</span></button><button>ZG <span>2</span></button><button>ZZ <span>1</span></button><button aria-label="Filtry"><ListFilter size={15}/></button></div>
        <div class="queue-list">
          {#each filteredQueue as item}
              <button class="queue-card" class:dragging={draggedDelivery?.id === item.id} draggable="true" ondragstart={(e) => startDeliveryDrag(e, item)} ondragend={finishDeliveryDrag} onclick={() => {selectedOrderDocument=item;orderOpen=true}}>
              <GripVertical size={17} class="grip"/>
              <div class="queue-content">
                <div class="queue-top"><span class="doc-id">{item.id}</span><span class="duration"><Clock3 size={12}/>{item.duration} h</span></div>
                <div class="erp-meta"><Badge variant="outline">{item.erpStatus}</Badge><span>{item.orderDate}</span></div>
                <strong>{item.supplier}</strong>
                <p>{item.load}</p>
                <div class="meta"><span><PackageOpen size={13}/>{item.pallets} pal.</span><span><Weight size={13}/>{item.weight}</span></div>
              </div>
            </button>
          {:else}<div class="empty">Brak pasujących zamówień.</div>{/each}
        </div>
        <div class="drop-hint"><GripVertical size={15}/><span>Przeciągnij zamówienie na wolny termin</span></div>
      </section>

      <section class="calendar-panel">
        <div class="calendar-toolbar">
          <div><span class="eyebrow">TERMINARZ DOSTAW</span><h1>28 kwietnia – 2 maja 2025</h1></div>
          <div class="toolbar-actions">
            <div class="segmented">{#each ['Dzień','Tydzień','Miesiąc'] as p}<button class:active={period===p} onclick={() => period=p as typeof period}>{p}</button>{/each}</div>
            <Button class="dock-filter-button" variant="outline" size="sm" onclick={() => dockMenuOpen=!dockMenuOpen}><Dock size={15}/><span>DOKi</span><ChevronDown size={14} class={dockMenuOpen ? 'is-open' : ''}/></Button>
            {#if dockMenuOpen}
              <div class="dock-menu">
                <div class="dock-menu-head"><span>Widoczność doków</span><button onclick={showAllDocks}>Pokaż wszystkie</button></div>
                {#each docks as dock, i}
                  <label><input type="checkbox" bind:checked={visibleDocks[i]}/><span class={`dock-badge ${dockClass(dock)}`}>{dock}</span><strong>{dock}</strong></label>
                {/each}
              </div>
            {/if}
            {#if role === 'admin'}<Button size="sm" onclick={() => addOpen=true}><Plus size={16}/>Nowa awizacja</Button>{/if}
          </div>
        </div>
        <div class="date-nav">
          <div class="arrows"><button aria-label="Poprzedni tydzień"><ChevronLeft size={17}/></button><button aria-label="Następny tydzień"><ChevronRight size={17}/></button></div>
          <button class="today">Dzisiaj</button>
          {#if role === 'admin'}
            <div class="legend">{#each Object.entries(statusColors) as [status,color]}<span><i class={color}></i>{status}</span>{/each}</div>
          {:else}
            <div class="privacy-mode"><ShieldAlert size={14}/>Tryb prywatny: szczegóły dostaw są ukryte</div>
          {/if}
        </div>
        <div class="calendar-wrap">
          {#if period === 'Tydzień'}
            <div class="calendar-grid">
              <div class="corner"><Clock3 size={14}/><span>GMT+2</span></div>
              {#each days as day, index}<div class:closed={index===3} class="day-head"><span>{day.week}</span><strong>{day.date}</strong>{#if index===0}<b>DZIŚ</b>{/if}{#if index===3}<small>ŚWIĘTO</small>{/if}</div>{/each}
              {#each hours as hour}
                <div class="time-label">{formatTime(hour)}</div>
                {#each days as day, dayIndex}
                  <div role="gridcell" tabindex="0" aria-label={`Wolny termin ${day.date}, ${formatTime(hour)}`} class:closed={dayIndex===3} class:drag-target={isDragTarget(dayIndex,hour)} class="time-cell" ondragover={(e)=>moveDeliveryPreview(e,dayIndex,hour)} ondragleave={leaveDeliveryTarget} ondrop={(e)=>dropDelivery(e,dayIndex,hour)}>
                    {#if draggedDelivery && isDragTarget(dayIndex,hour)}
                      <div class={`event drag-preview ${draggedDelivery.color}`} style={`height:${Math.max(30,draggedDelivery.duration*68-4)}px`}>
                        <span class="event-time">{formatTime(hour)} · <Badge class="dock-badge dock-1">DOK 01</Badge></span><strong>{draggedDelivery.id}</strong><span>{draggedDelivery.supplier}</span>
                      </div>
                    {/if}
                    {#each deliveries.filter(d => d.day===dayIndex && d.start===hour && visibleDocks[docks.indexOf(d.dock ?? '')]) as item}
                      {#if role === 'admin'}
                        <button draggable="true" class={`event week-event ${dockClass(item.dock)} ${item.color}`} class:split-docks={sharesTimeWithAnotherDock(item)} class:conflict={item.hasConflict} class:dragging={draggedDelivery?.id === item.id} class:conflict-left={item.conflictSide==='left'} class:conflict-right={item.conflictSide==='right'} style={`height:${Math.max(30,item.duration*68-4)}px`} ondragstart={(e) => startDeliveryDrag(e, item)} ondragend={finishDeliveryDrag} onclick={() => {selected=item;resolvingConflict=false}}>
                          <span class="event-time">{formatTime(item.start??hour)} · <Badge class={`dock-badge ${dockClass(item.dock)}`}>{item.dock}</Badge></span><strong>{item.id}</strong><span>{item.supplier}</span><small>{item.conflictWith ? `Koliduje z ${item.conflictWith}` : item.plate || 'Brak rejestracji'}</small>{#if item.hasConflict}<CircleAlert size={14} class="alert-icon"/>{/if}
                        </button>
                      {:else}
                        <div class={`event private-event ${dockClass(item.dock)}`} class:conflict-left={item.conflictSide==='left'} class:conflict-right={item.conflictSide==='right'} style={`height:${Math.max(30,item.duration*68-4)}px`} aria-label="Termin zajęty"><span class="event-time">{formatTime(item.start??hour)} · <Badge class={`dock-badge ${dockClass(item.dock)}`}>{item.dock}</Badge></span><strong>Termin zajęty</strong><span>Szczegóły ukryte</span></div>
                      {/if}
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
                <div class="time-label">{formatTime(hour)}</div>
                {#each docks as dock, dockIndex}
                  <div role="gridcell" tabindex="0" aria-label={`${dock}, ${formatTime(hour)}`} class:closed={!dockEnabled[dockIndex]} class:drag-target={isDragTarget(0,hour,dock)} class="time-cell" ondragover={(e)=>moveDeliveryPreview(e,0,hour,dock)} ondragleave={leaveDeliveryTarget} ondrop={(e)=>dropDelivery(e,0,hour,dock)}>
                    {#if draggedDelivery && isDragTarget(0,hour,dock)}
                      <div class={`event drag-preview ${dockClass(dock)}`} style={`height:${Math.max(30,draggedDelivery.duration*68-4)}px`}>
                        <span class="event-time">{formatTime(hour)} · <Badge class={`dock-badge ${dockClass(dock)}`}>{dock}</Badge></span><strong>{draggedDelivery.id}</strong><span>{draggedDelivery.supplier}</span>
                      </div>
                    {/if}
                    {#each deliveries.filter(d => d.day===0 && d.dock===dock && d.start===hour) as item}
                      {#if role === 'admin'}
                        <button draggable="true" class={`event ${item.color}`} class:conflict={item.hasConflict} class:dragging={draggedDelivery?.id === item.id} class:conflict-left={item.conflictSide==='left'} class:conflict-right={item.conflictSide==='right'} style={`height:${Math.max(30,item.duration*68-4)}px`} ondragstart={(e) => startDeliveryDrag(e, item)} ondragend={finishDeliveryDrag} onclick={() => {selected=item;resolvingConflict=false}}>
                          <span class="event-time">{formatTime(item.start??hour)} · <Badge class={`dock-badge ${dockClass(item.dock)}`}>{item.dock}</Badge></span><strong>{item.id}</strong><span>{item.supplier}</span><small>{item.conflictWith ? `Koliduje z ${item.conflictWith}` : item.plate}</small>{#if item.hasConflict}<CircleAlert size={14} class="alert-icon"/>{/if}
                        </button>
                      {:else}
                        <div class={`event private-event ${dockClass(item.dock)}`} style={`height:${Math.max(30,item.duration*68-4)}px`} aria-label="Termin zajęty"><span class="event-time">{formatTime(item.start??hour)}</span><strong>Termin zajęty</strong><span>Szczegóły ukryte</span></div>
                      {/if}
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
                    {#if role === 'admin'}<button class={`month-event ${dockClass(item.dock)}`} onclick={() => {selected=item;resolvingConflict=false}}><i></i><strong>{formatTime(item.start??0)}</strong><span>{item.id}</span><small>{item.dock}</small></button>{:else}<div class={`month-event private-event ${dockClass(item.dock)}`}><i></i><strong>{formatTime(item.start??0)}</strong><span>Termin zajęty</span></div>{/if}
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
          <label>Zamówienie<select bind:value={selectedOrder}>{#each supplierOrders as order}<option value={order.id}>{order.label}</option>{/each}</select></label>
          <label>Minimalne okno czasowe rozładunku<select bind:value={searchDuration}><option>30 minut</option><option>1 godzina</option><option>2 godziny</option><option>4 godziny</option></select></label>
          <div class="two-fields"><label>Najwcześniej<Input type="time" bind:value={searchFrom}/></label><label>Najpóźniej<Input type="time" bind:value={searchTo}/></label></div>
          <Button class="wide" onclick={searchSupplierSlots}><Search size={16}/>Pokaż wolne terminy</Button>
        </aside>
        <section class="availability">
          <div class="availability-head"><div><h2>Dostępne terminy</h2><p>{searchDone ? `${slotResults.length} wyników · ${searchDuration}, ${searchFrom}–${searchTo}` : 'Ustaw parametry i wyszukaj wolny slot'}</p></div><div class="privacy"><ShieldAlert size={15}/>Widzisz tylko dostępność, bez danych innych dostaw</div></div>
          {#if !searchDone}
            <div class="slot-empty"><span><CalendarSearch size={25}/></span><strong>Wybierz warunki dostawy</strong><p>Podaj czas rozładunku i zakres godzin, a pokażemy dostępne doki.</p></div>
          {:else if slotResults.length === 0}
            <div class="slot-empty"><span><CircleAlert size={25}/></span><strong>Brak terminów w tym zakresie</strong><p>Zmień godziny albo skróć czas rozładunku.</p></div>
          {:else}
            <div class="slot-days">
              {#each resultDays as day}
                <article class="slot-day"><div class="slot-date"><span>{day.d}</span><strong>{day.n}</strong><small>{day.m}</small></div><div class="slots">{#each slotResults.filter(slot => slot.dateLabel===day.dateLabel) as slot}<button class:selected={pendingSlot?.key===slot.key} onclick={() => {pendingSlot=slot;bookingOpen=true}}>{slot.time}<span>{slot.dock}</span><ArrowRight size={15}/></button>{/each}</div></article>
              {/each}
            </div>
          {/if}
        </section>
      </section>
      <section class="my-deliveries"><div class="section-head"><div><h2>Moje dostawy</h2><p>Zaplanowane, trwające i zakończone.</p></div><Button variant="outline" size="sm">Zobacz wszystkie <ArrowRight size={15}/></Button></div><div class="delivery-table"><div class="tr th"><span>Dokument</span><span>Termin</span><span>Pojazd</span><span>Status</span><span></span></div>{#each [...supplierDeliveries,...deliveries].slice(0,4) as d}<div class="tr"><strong>{d.id}<small>{d.load}</small></strong><span>{d.day===7?'5 MAJ':days[d.day??0]?.date}, {String(Math.floor(d.start??0)).padStart(2,'0')}:{(d.start??0)%1?'30':'00'}<small>{d.dock}</small></span><span>{d.plate}</span><span><i class="status-pill {d.color}">{d.status}</i></span><button aria-label="Szczegóły"><MoreHorizontal size={17}/></button></div>{/each}</div></section>
    </main>
  {:else}
    <main class="config-page">
      <div class="page-title">
        <div>
          <span class="eyebrow">USTAWIENIA TERMINARZA</span>
          <h1>{configTab === 'docks' ? 'Doki i dostępność' : configTab === 'fields' ? 'Pola awizacji' : configTab === 'notifications' ? 'Powiadomienia' : 'Użytkownicy'}</h1>
          <p>{configTab === 'docks' ? 'Ustal godziny pracy magazynu i wyłącz dni bez dostaw.' : configTab === 'fields' ? 'Zdecyduj, jakie informacje zbierasz przy awizacji.' : configTab === 'notifications' ? 'Wybierz zdarzenia, o których system ma informować.' : 'Zarządzaj dostępem do terminarza i panelu magazynu.'}</p>
        </div>
        <Button onclick={() => toast='Zmiany zapisane'}>
          <Check size={16}/>
          Zapisz zmiany
        </Button>
      </div>

      <div class="config-layout">
        <aside class="settings-nav">
          <button class:active={configTab === 'docks'} onclick={() => configTab='docks'}><Dock size={17}/>Doki i godziny</button>
          <button class:active={configTab === 'fields'} onclick={() => configTab='fields'}><SlidersHorizontal size={17}/>Pola awizacji</button>
          <button class:active={configTab === 'notifications'} onclick={() => configTab='notifications'}><Bell size={17}/>Powiadomienia</button>
          <button class:active={configTab === 'users'} onclick={() => configTab='users'}><UserRound size={17}/>Użytkownicy</button>
        </aside>

        <section class="config-content">
          {#if configTab === 'docks'}
            <article class="settings-card">
              <div class="settings-head">
                <div><h2>Doki rozładunkowe</h2><p>Aktywne doki są dostępne w terminarzu.</p></div>
                <span>{dockEnabled.filter(Boolean).length} aktywne</span>
              </div>
              <div class="dock-list">
                {#each docks as dock, i}
                  <div class:disabled={!dockEnabled[i]}>
                    <span class="dock-symbol"><Warehouse size={18}/></span>
                    <strong>{dock}<small>{i===0?'Dostawy całopojazdowe':i===1?'Drobnica i palety':'Materiały specjalne'}</small></strong>
                    <label class="switch"><input type="checkbox" bind:checked={dockEnabled[i]} aria-label={`Aktywność ${dock}`}/><span></span></label>
                    <button aria-label={`Usuń ${dock}`} onclick={() => {docks.splice(i,1);dockEnabled.splice(i,1)}}><Trash2 size={16}/></button>
                  </div>
                {/each}
              </div>
              <div class="add-dock">
                <Input bind:value={newDock} placeholder="Nazwa nowego doku"/>
                <Button variant="outline" onclick={addDock}><Plus size={16}/>Dodaj dok</Button>
              </div>
            </article>

            <article class="settings-card">
              <div class="settings-head"><div><h2>Standardowe godziny przyjęć</h2><p>Możesz ustawić inne godziny dla każdego dnia.</p></div></div>
              <div class="hours-list">
                {#each workDays as row}
                  <div class:disabled={!row.on}>
                    <label class="switch"><input type="checkbox" bind:checked={row.on} aria-label={`Dostawy w dniu ${row.day}`}/><span></span></label>
                    <strong>{row.day}</strong>
                    {#if row.on}<Input type="time" bind:value={row.from}/><span>do</span><Input type="time" bind:value={row.to}/>{:else}<small>Brak przyjęć</small>{/if}
                  </div>
                {/each}
              </div>
            </article>

            <article class="settings-card exceptions">
              <div class="settings-head"><div><h2>Wyjątki w kalendarzu</h2><p>Dni zamknięte lub ze skróconymi godzinami.</p></div><Button variant="outline" size="sm"><Plus size={15}/>Dodaj wyjątek</Button></div>
              <div class="exception-row"><div class="exception-date"><strong>01</strong><span>MAJ<br/>2025</span></div><div><strong>Święto Pracy</strong><p>Magazyn zamknięty</p></div><Badge variant="secondary">Dzień wyłączony</Badge><button><X size={16}/></button></div>
              <div class="exception-row"><div class="exception-date"><strong>02</strong><span>MAJ<br/>2025</span></div><div><strong>Skrócony dzień pracy</strong><p>Przyjęcia od 07:00 do 12:00</p></div><Badge variant="outline">Skrócone godziny</Badge><button><X size={16}/></button></div>
            </article>
          {:else if configTab === 'fields'}
            <article class="settings-card">
              <div class="settings-head"><div><h2>Pola dodatkowe</h2><p>Te dane pojawią się w formularzu awizacji.</p></div><Button size="sm" variant="outline" onclick={addCustomField}><Plus size={15}/>Dodaj pole</Button></div>
              <div class="preference-list">
                {#each customFields as field}
                  <div class:disabled={!field.enabled}>
                    <span class="field-code">{field.name.slice(-1)}</span>
                    <div><strong>{field.name}</strong><Input bind:value={field.label}/></div>
                    <label class="switch"><input type="checkbox" bind:checked={field.enabled} aria-label={`Aktywność ${field.name}`}/><span></span></label>
                    <button aria-label={`Usuń ${field.name}`} onclick={() => customFields.splice(customFields.indexOf(field),1)}><Trash2 size={16}/></button>
                  </div>
                {/each}
              </div>
            </article>
          {:else if configTab === 'notifications'}
            <article class="settings-card">
              <div class="settings-head"><div><h2>Zdarzenia systemowe</h2><p>Powiadomienia pojawią się w aplikacji.</p></div></div>
              <div class="preference-list">
                {#each notifications as notification}
                  <div class:disabled={!notification.enabled}>
                    <span class="dock-symbol"><Bell size={17}/></span>
                    <div><strong>{notification.title}</strong><small>{notification.description}</small></div>
                    <label class="switch"><input type="checkbox" bind:checked={notification.enabled} aria-label={notification.title}/><span></span></label>
                  </div>
                {/each}
              </div>
            </article>
          {:else}
            <article class="settings-card">
              <div class="settings-head"><div><h2>Dostęp do systemu</h2><p>Role określają widoczne dane i dostępne akcje.</p></div><Button size="sm"><Plus size={15}/>Dodaj użytkownika</Button></div>
              <div class="user-list">
                {#each [{initials:'KM',name:'Kamil Michalski',mail:'k.michalski@dockflow.pl',role:'Administrator'},{initials:'AN',name:'Anna Nowak',mail:'a.nowak@dockflow.pl',role:'Magazynier'},{initials:'PK',name:'Piotr Kowal',mail:'p.kowal@dockflow.pl',role:'Planista'}] as user}
                  <div><span class="avatar">{user.initials}</span><strong>{user.name}<small>{user.mail}</small></strong><select aria-label={`Rola ${user.name}`}><option>{user.role}</option><option>Administrator</option><option>Magazynier</option><option>Planista</option></select><button aria-label={`Opcje ${user.name}`}><MoreHorizontal size={17}/></button></div>
                {/each}
              </div>
            </article>
          {/if}
        </section>
      </div>
    </main>
  {/if}
</div>

{#if selected}
  <div class="drawer-backdrop" role="presentation" onclick={() => selected=null}></div>
  <aside class="detail-drawer">
    <div class="drawer-head"><div><Badge variant="outline">{selected.dock}</Badge><h2>{selected.id}</h2><p>{selected.supplier}</p></div><button onclick={() => selected=null}><X size={20}/></button></div>
    <div class="status-banner {selected.hasConflict ? 'red' : selected.color}"><span><i></i>{selected.hasConflict ? 'Konflikt' : selected.status}</span><small>{days[selected.day??0].date} · {selected.start}:00–{(selected.start??0)+selected.duration}:00</small></div>
    {#if selected.hasConflict}
      <div class="conflict-notice">
        <CircleAlert size={17}/>
        <span><strong>Ten sam dok i czas</strong>Koliduje z awizacją {selected.conflictWith}.</span>
        {#if !resolvingConflict}
          <Button size="sm" variant="outline" onclick={() => resolvingConflict=true}>Rozwiąż problem</Button>
        {/if}
      </div>
      {#if resolvingConflict}
        <div class="conflict-resolution">
          <div><CalendarSearch size={17}/><span><strong>Wolny dok w tym samym czasie</strong>System przeniesie młodszą awizację i zachowa jej termin.</span></div>
          <Button size="sm" onclick={resolveSelectedConflict}>Przenieś młodszą awizację<ArrowRight size={15}/></Button>
        </div>
      {/if}
    {/if}
    <div class="drawer-dock-field">
      <label for="delivery-dock">Dok</label>
      <select id="delivery-dock" class="dialog-select" value={selected.dock} onchange={(event) => changeDeliveryDock(selected!, event.currentTarget.value)}>
        {#each docks as dock, index}
          {#if dockEnabled[index]}<option value={dock}>{dock}</option>{/if}
        {/each}
      </select>
      <small>Zmiana doku od razu aktualizuje konflikty.</small>
    </div>
    <div class="drawer-section"><span class="eyebrow">TRANSPORT</span><div class="plate"><Truck size={20}/><div><small>NUMER REJESTRACYJNY</small><strong>{selected.plate}</strong></div></div><div class="info-grid"><div><PackageOpen size={17}/><span>Ładunek<strong>{selected.load}</strong></span></div><div><Weight size={17}/><span>Masa<strong>{selected.weight}</strong></span></div><div><LayoutGrid size={17}/><span>Nośniki<strong>{selected.pallets} palet</strong></span></div><div><ShieldAlert size={17}/><span>Klasa ADR<strong>Nie dotyczy</strong></span></div></div></div>
    <div class="drawer-section">
      <span class="eyebrow">DODATKOWE INFORMACJE</span>
      <div class="extra-fields">
        {#each customFields.filter(field => field.enabled) as field}
          <label>
            <span>{field.label}</span>
            <Input bind:value={field.value} aria-label={field.label}/>
          </label>
        {/each}
      </div>
    </div>
    <div class="drawer-footer"><Button variant="outline"><ExternalLink size={15}/>Dokument źródłowy</Button><Button onclick={() => advanceStatus(selected!)}>{#if selected.status==='W trakcie rozładunku'}<LogOut size={16}/>{:else}<Check size={16}/>{/if} {selected.status==='W trakcie rozładunku'?'Zakończ rozładunek':'Potwierdź podjazd auta'}</Button></div>
  </aside>
{/if}

<Dialog.Root bind:open={addOpen}>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
    <Dialog.Header>
      <Dialog.Title>Nowa awizacja</Dialog.Title>
      <Dialog.Description>Powiąż zamówienie z ImpulsERP albo wpisz dane ręcznie.</Dialog.Description>
    </Dialog.Header>
    <div class="dialog-form">
      <label>
        Numer zamówienia
        <div class="link-order-row">
          <Input bind:value={newOrderNumber} placeholder="np. ZG/0462/25" oninput={() => orderLinked=false}/>
          <Button variant="outline" onclick={linkPurchaseOrder}><ExternalLink size={15}/>Powiąż</Button>
        </div>
        {#if orderLinked}<small class="link-success"><Check size={13}/>Powiązano z ImpulsERP</small>{/if}
      </label>
      <label>
        Dostawca
        <div class="supplier-combobox">
          <Input
            bind:value={newSupplier}
            placeholder="Zacznij wpisywać nazwę firmy"
            readonly={orderLinked}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={supplierSuggestionsOpen && supplierSuggestions.length > 0}
            aria-controls="supplier-suggestions"
            onfocus={() => supplierSuggestionsOpen = !orderLinked}
            oninput={() => supplierSuggestionsOpen = !orderLinked}
            onkeydown={(event) => {
              if (event.key === 'Escape') supplierSuggestionsOpen = false;
              if (event.key === 'Enter' && supplierSuggestionsOpen && supplierSuggestions[0]) {
                event.preventDefault();
                selectSupplier(supplierSuggestions[0]);
              }
            }}
            onblur={() => supplierSuggestionsOpen = false}
          />
          {#if supplierSuggestionsOpen && supplierSuggestions.length > 0}
            <div id="supplier-suggestions" class="supplier-suggestions" role="listbox" aria-label="Dostawcy">
              {#each supplierSuggestions as supplier}
                <button
                  type="button"
                  role="option"
                  aria-selected={newSupplier === supplier}
                  onpointerdown={(event) => event.preventDefault()}
                  onclick={() => selectSupplier(supplier)}
                >
                  <span>{supplier}</span>
                  <small>Znany dostawca</small>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </label>
      <div class="two-fields">
        <label>Data<Input type="date" bind:value={newDate}/></label>
        <label>Godzina<Input type="time" bind:value={newTime}/></label>
      </div>
      <label>
        Dok
        <select class="dialog-select" bind:value={newDockPreference}>
          <option>Dowolny</option>
          {#each docks as dock}
            <option>{dock}</option>
          {/each}
        </select>
        <small class="field-hint">System przypisze dostępny dok, jeśli nie wybierzesz konkretnego.</small>
      </label>
      <div class="two-fields">
        <label>Numer rejestracyjny<Input bind:value={newPlate} placeholder="np. PO 1234A"/></label>
        <label>Liczba palet<Input bind:value={newPallets} type="number" placeholder="0"/></label>
      </div>
      <label>
        Opis zawartości
        <Textarea bind:value={cargoDescription} rows={4} placeholder="Wpisz rodzaj towaru, liczbę opakowań i uwagi do rozładunku..."/>
      </label>
      <details class="notice-details">
        <summary>
          <span><SlidersHorizontal size={15}/>Szczegóły</span>
          <small>{customFields.filter(field => field.enabled).length} pól</small>
          <ChevronRight size={16}/>
        </summary>
        <div class="notice-detail-fields">
          {#each customFields.filter(field => field.enabled) as field}
            <label>
              {field.label}
              <Input bind:value={newAwizationFields[field.name]} placeholder={`Wpisz: ${field.label.toLowerCase()}`}/>
            </label>
          {/each}
        </div>
      </details>
    </div>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => addOpen=false}>Anuluj</Button>
      <Button onclick={createAwization}>Dodaj awizację</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
<Dialog.Root bind:open={bookingOpen}><Dialog.Content class="sm:max-w-[460px]"><Dialog.Header><Dialog.Title>Potwierdź termin dostawy</Dialog.Title><Dialog.Description>Wybrany slot zostanie zablokowany dla innych dostawców.</Dialog.Description></Dialog.Header>{#if pendingSlot}<div class="booking-summary"><div class="booking-date"><CalendarDays size={20}/><span><small>TERMIN</small><strong>{pendingSlot.n} {pendingSlot.m}, {pendingSlot.time}</strong></span></div><div><span>Dokument</span><strong>{selectedOrder}</strong></div><div><span>Czas rozładunku</span><strong>{searchDuration}</strong></div><div><span>Stanowisko</span><strong>{pendingSlot.dock}</strong></div></div>{/if}<Dialog.Footer><Button variant="outline" onclick={() => bookingOpen=false}>Wróć</Button><Button onclick={confirmSupplierBooking}><Check size={16}/>Potwierdź rezerwację</Button></Dialog.Footer></Dialog.Content></Dialog.Root>
<Dialog.Root bind:open={orderOpen}>
  <Dialog.Content class="sm:max-w-[680px]">
    <Dialog.Header>
      <Dialog.Title>Dokument {selectedOrderDocument?.id}</Dialog.Title>
      <Dialog.Description>Zamówienie zakupu pobrane z ImpulsERP.</Dialog.Description>
    </Dialog.Header>
    {#if selectedOrderDocument}
      <div class="order-summary">
        <div><span>Dostawca</span><strong>{selectedOrderDocument.supplier}</strong></div>
        <div><span>Data zamówienia</span><strong>{selectedOrderDocument.orderDate}</strong></div>
        <div><span>Status ZG</span><Badge variant="outline">{selectedOrderDocument.erpStatus}</Badge></div>
        <div><span>Planowana dostawa</span><strong>{selectedOrderDocument.lines?.[0]?.delivery}</strong></div>
      </div>
      <div class="order-lines">
        <div class="order-line header"><span>Indeks</span><span>Pozycja zamówienia</span><span>Ilość</span><span>Termin</span></div>
        {#each selectedOrderDocument.lines ?? [] as line}
          <div class="order-line">
            <span>{line.code}</span>
            <strong>{line.name}</strong>
            <span>{line.quantity}</span>
            <span>{line.delivery}</span>
          </div>
        {/each}
      </div>
      <div class="order-total">
        <span>Łącznie</span>
        <strong>{selectedOrderDocument.pallets} palet · {selectedOrderDocument.weight}</strong>
      </div>
    {/if}
    <Dialog.Footer>
      <Button variant="outline" onclick={() => orderOpen=false}>Zamknij</Button>
      <Button variant="outline">
        <PackageOpen size={16}/>
        Zarejestruj opakowania zwrotne
      </Button>
      <Button onclick={() => {orderOpen=false;toast='Dokument gotowy do zaplanowania'}}>
        <CalendarDays size={16}/>
        Zaplanuj awizację
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

{#if toast}<div class="toast"><Check size={18}/><span>{toast}</span><button onclick={() => toast=''}><X size={15}/></button></div>{/if}
