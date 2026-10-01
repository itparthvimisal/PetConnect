/* ============ PetConnect front end ============ */
(() => {
  'use strict';

  // If index.html is opened straight from disk, talk to the Flask server on port 5000.
  const API = location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => '₹' + n.toLocaleString('en-IN');

  // ------------------------------------------------------------ photos
  // Real photographs hosted by Unsplash (free to use). To use a different photo, open it on
  // unsplash.com, copy the image address and keep only the part after "photo-".
  const ph = (id, w = 600, h = 450) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;

  // ------------------------------------------------------------ state
  let token = localStorage.getItem('pc_token') || '';
  let user = JSON.parse(localStorage.getItem('pc_user') || 'null');
  let cart = JSON.parse(localStorage.getItem('pc_cart') || '{}');
  const petsById = {};
  const adoptById = {};

  // ------------------------------------------------------------ sample data (used only when the server is offline)
  const SAMPLE_PETS = [
    { id: 1, report_type: 'lost', name: 'Bruno', species: 'Dog', breed: 'Labrador', color: 'Golden', location: 'Gandhi Park, Sector 12', event_date: '2026-09-04', description: 'Friendly, wearing a red collar with a bell.', contact_name: 'Ravi', contact_phone: '98765 43210', image_url: 'https://loremflickr.com/500/375/labrador?lock=11' },
    { id: 2, report_type: 'lost', name: 'Misty', species: 'Cat', breed: 'Persian', color: 'White', location: 'MG Road near City Mall', event_date: '2026-09-02', description: 'Blue eyes, very shy.', contact_name: 'Anita', contact_phone: '98111 22233', image_url: 'https://loremflickr.com/500/375/persian,cat?lock=12' },
    { id: 3, report_type: 'lost', name: 'Coco', species: 'Dog', breed: 'Beagle', color: 'Brown and white', location: 'Lake View Colony', event_date: '2026-08-30', description: 'Microchipped, slight limp on the left back leg.', contact_name: 'Karan', contact_phone: '99887 76655', image_url: 'https://loremflickr.com/500/375/beagle?lock=13' },
    { id: 4, report_type: 'found', name: '', species: 'Dog', breed: 'Indie', color: 'Black', location: 'Railway Station Road', event_date: '2026-09-03', description: 'Calm and well fed, blue collar without a tag.', contact_name: 'Sameer', contact_phone: '96543 21098', image_url: 'https://loremflickr.com/500/375/blackdog?lock=21' },
    { id: 5, report_type: 'found', name: '', species: 'Cat', breed: 'Tabby', color: 'Orange', location: 'Temple Street Market', event_date: '2026-09-01', description: 'Young, healthy and friendly.', contact_name: 'Priya', contact_phone: '95432 10987', image_url: 'https://loremflickr.com/500/375/tabby,cat?lock=22' },
    { id: 6, report_type: 'found', name: '', species: 'Bird', breed: 'Parakeet', color: 'Green', location: 'City Library Garden', event_date: '2026-09-06', description: 'Resting on a bench, now safe in a cage.', contact_name: 'Imran', contact_phone: '94321 09876', image_url: 'https://loremflickr.com/500/375/parakeet?lock=23' },
  ];
  const SAMPLE_ADOPT = [
    { id: 1, name: 'Luna', species: 'Dog', breed: 'Indie', age: '8 months', gender: 'Female', shelter: 'Paws Shelter', location: 'Pune', about: 'Playful puppy, vaccinated and dewormed. Great with kids.', image_url: 'https://loremflickr.com/500/375/puppy?lock=31' },
    { id: 2, name: 'Simba', species: 'Cat', breed: 'Orange tabby', age: '1 year', gender: 'Male', shelter: 'Whisker Home', location: 'Mumbai', about: 'Cuddly and litter trained.', image_url: 'https://loremflickr.com/500/375/kitten?lock=32' },
    { id: 3, name: 'Thumper', species: 'Rabbit', breed: 'Dutch', age: '1 year', gender: 'Male', shelter: 'Small Paws Care', location: 'Hyderabad', about: 'Gentle rabbit, used to being handled.', image_url: 'https://loremflickr.com/500/375/dutchrabbit?lock=35' },
  ];

  // ------------------------------------------------------------ library + marketplace content
  const ARTICLES = [
    { topic: 'Pet care', title: 'Feeding your dog the right way', summary: 'Portions, timing and the foods that are dangerous for dogs.',
      points: ['Feed adult dogs measured portions twice a day and keep fresh water available.', 'Never give chocolate, grapes, raisins, onions, garlic or anything sweetened with xylitol.', 'Change food gradually over 7 to 10 days to avoid stomach upset.', 'Ask your vet about the right portion for your dog\'s age, size and activity.'] },
    { topic: 'Pet care', title: 'Vaccinations and vet visits', summary: 'Regular check-ups catch problems early and protect the whole community.',
      points: ['Follow the vaccination schedule your vet gives you for puppies and kittens.', 'Keep booster shots up to date, including rabies.', 'Use regular deworming and tick and flea control.', 'Book a yearly check-up, even when your pet seems healthy.'] },
    { topic: 'Safety', title: 'Keeping pets safe in summer heat', summary: 'Heatstroke can develop quickly, and it is preventable.',
      points: ['Never leave an animal in a parked car, even for a few minutes.', 'Walk early morning or late evening. If the pavement is too hot for the back of your hand, it is too hot for paws.', 'Provide shade and fresh water at all times.', 'Heavy panting, drooling or weakness means cool the animal down and call a vet immediately.'] },
    { topic: 'Safety', title: 'Fireworks, festivals and loud noise', summary: 'Many pets escape and get lost during noisy celebrations.',
      points: ['Keep pets indoors in a quiet, familiar room with the curtains closed.', 'Never leave a pet tied up outside during fireworks.', 'Make sure the collar tag has your current phone number.', 'Ask your vet about calming options if your pet gets very anxious.'] },
    { topic: 'Lost and found', title: 'What to do when your pet goes missing', summary: 'The first 24 hours matter most. Act quickly and widely.',
      points: ['Search nearby first, calling calmly and carrying a familiar toy or treat.', 'Post a report on PetConnect with a clear photo, the last place seen and your phone number.', 'Tell neighbours, security guards, local vets and shelters.', 'Put up posters with a photo. Keep checking found reports daily.'] },
    { topic: 'Lost and found', title: 'Found a stray? How to help safely', summary: 'Kind, careful steps that protect you and the animal.',
      points: ['Approach slowly and don\'t chase. A frightened animal may bite.', 'Take a photo and note exactly where you found it.', 'Check for a collar or tag, and ask a vet to scan for a microchip.', 'Post a found report here. If the animal is injured or aggressive, call a local rescue group.'] },
    { topic: 'Animal welfare', title: 'Adopt, don\'t abandon', summary: 'A pet is a 10 to 15 year commitment.',
      points: ['Think about the time, cost and space before bringing a pet home.', 'Consider adopting from a shelter. Every adoption frees up space for another rescue.', 'Sterilisation helps reduce the number of stray and unwanted animals.', 'If you cannot keep a pet, contact a shelter or rescue instead of leaving it on the street.'] },
    { topic: 'Animal welfare', title: 'Helping street animals responsibly', summary: 'Small, steady actions make a real difference.',
      points: ['Leave clean water out in hot weather.', 'Avoid spicy, salty or leftover human food. Plain rice or dog food is safer.', 'Support local sterilisation and vaccination drives.', 'Report cruelty to your local animal welfare organisation or the police. Cruelty to animals is a legal offence in many places.'] },
  ];

  // img = photo shown; fallback = local picture used if the photo can't load (e.g. offline)
  const PRODUCTS = [
    { id: 'dog-food', name: 'Premium Dry Dog Food, 3 kg', category: 'Food', price: 899, img: ph('1676193866128-03a926df76ef'), fallback: 'dog-food' },
    { id: 'pet-kibble', name: 'Grain-Free Dry Pet Food, 1.5 kg', category: 'Food', price: 649, img: ph('1764249453874-46864677b10e'), fallback: 'cat-food' },
    { id: 'red-leash', name: 'Red Nylon Dog Leash, 1.5 m', category: 'Walking', price: 349, img: ph('1708062270853-ee7c66b69f07'), fallback: 'leash' },
    { id: 'trail-leash', name: 'Heavy-Duty Trail Leash, 2 m', category: 'Walking', price: 449, img: ph('1708062270783-0e9fa7f4c1c1'), fallback: 'leash' },
    { id: 'blue-collar', name: 'Adjustable Nylon Dog Collar, Blue', category: 'Walking', price: 299, img: ph('1580129518863-f00fcf1d6e68'), fallback: 'dog-collar' },
    { id: 'chew-sticks', name: 'Natural Wood Chew Sticks, 3 pack', category: 'Treats & Toys', price: 199, img: ph('1760615302775-63df6d2fc508'), fallback: 'chew-toy' },
  ];
  const productById = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

  // ------------------------------------------------------------ helpers
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 3200);
  }

  function setOffline(off) { $('#offlineBanner').hidden = !off; }

  async function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    let body = opts.body;
    if (token) headers.Authorization = 'Bearer ' + token;
    if (opts.json) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.json); }
    let res;
    try {
      res = await fetch(API + path, { method: opts.method || 'GET', headers, body });
    } catch (e) {
      setOffline(true);
      const err = new Error('The server is not running. Start the Flask back end and try again.');
      err.offline = true;
      throw err;
    }
    setOffline(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(data.error || 'Something went wrong.'); err.status = res.status; throw err; }
    return data;
  }

  const matches = (p, q, species) => {
    const hay = [p.name, p.breed, p.color, p.location, p.description].join(' ').toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (!species || species === 'All' || p.species === species);
  };

  async function loadPets(type, q = '', species = 'All') {
    try {
      const params = new URLSearchParams({ q, species });
      if (type) params.set('type', type);
      return await api('/api/pets?' + params);
    } catch (e) {
      if (!e.offline) throw e;
      return SAMPLE_PETS.filter((p) => (!type || p.report_type === type) && matches(p, q, species));
    }
  }

  // ------------------------------------------------------------ rendering: pets
  function imageFor(item, alt) {
    const key = String(item.species || 'other').toLowerCase();
    const fb = 'images/pets/placeholder-' + (['dog', 'cat', 'rabbit', 'bird'].includes(key) ? key : 'other') + '.svg';
    let src = item.image_url || fb;
    if (src.startsWith('/')) src = API + src;
    return `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${fb}'">`;
  }

  function petCard(p) {
    petsById[p.id] = p;
    const isLost = p.report_type === 'lost';
    const title = p.name || (p.breed ? p.breed : p.species);
    const details = [p.species, p.breed, p.color].filter(Boolean).join(', ');
    const mine = user && p.user_id && p.user_id === user.id;
    return `
      <article class="card">
        <div class="card-img">${imageFor(p, `${title}, ${isLost ? 'lost' : 'found'} ${p.species}`)}<span class="badge ${isLost ? 'lost' : 'found'}">${isLost ? 'Lost' : 'Found'}</span></div>
        <div class="card-body">
          <h3>${esc(title)}</h3>
          <p class="meta">${esc(details)}</p>
          <p class="meta">📍 ${esc(p.location)}</p>
          <p class="meta">📅 ${esc(p.event_date || '')}</p>
          <p class="desc">${esc(p.description)}</p>
          <div class="card-actions">
            <button class="btn btn-green btn-small" data-contact="${p.id}">${isLost ? 'I\'ve seen this pet' : 'This is my pet'}</button>
            ${mine ? `<button class="btn btn-outline btn-small" data-resolve="${p.id}">Mark as reunited</button>` : ''}
          </div>
        </div>
      </article>`;
  }

  const emptyState = (text) => `<div class="empty">${text}</div>`;

  async function renderPets(type) {
    const grid = $(`#${type}Grid`);
    const q = $(`#${type}Search`).value.trim();
    const species = $(`#${type}Species`).value;
    grid.innerHTML = emptyState('Loading…');
    try {
      const pets = await loadPets(type, q, species);
      grid.innerHTML = pets.length
        ? pets.map(petCard).join('')
        : emptyState(`No ${type} pets match your search. <a href="#report">Post a report</a> so others can find it.`);
    } catch (e) { grid.innerHTML = emptyState(esc(e.message)); }
  }

  async function renderHome() {
    const grid = $('#homeRecent');
    try { grid.innerHTML = (await loadPets('')).slice(0, 4).map(petCard).join(''); }
    catch (e) { grid.innerHTML = emptyState(esc(e.message)); }
    let s;
    try { s = await api('/api/stats'); }
    catch { s = { lost: SAMPLE_PETS.filter((p) => p.report_type === 'lost').length, found: SAMPLE_PETS.filter((p) => p.report_type === 'found').length, reunited: 0, members: 0 }; }
    $('#statLost').textContent = s.lost;
    $('#statFound').textContent = s.found;
    $('#statReunited').textContent = s.reunited;
    $('#statMembers').textContent = s.members;
  }

  // ------------------------------------------------------------ rendering: adoption
  let adoptSpecies = 'All';
  async function renderAdoption() {
    const grid = $('#adoptGrid');
    let list;
    try { list = await api('/api/adoptions?species=' + encodeURIComponent(adoptSpecies)); }
    catch (e) {
      if (!e.offline) { grid.innerHTML = emptyState(esc(e.message)); return; }
      list = SAMPLE_ADOPT.filter((a) => adoptSpecies === 'All' || a.species === adoptSpecies);
    }
    grid.innerHTML = list.length ? list.map((a) => {
      adoptById[a.id] = a;
      return `
      <article class="card">
        <div class="card-img">${imageFor(a, `${a.name}, ${a.species} for adoption`)}<span class="badge adopt">Adopt me</span></div>
        <div class="card-body">
          <h3>${esc(a.name)}</h3>
          <p class="meta">${esc([a.breed, a.gender, a.age].filter(Boolean).join(', '))}</p>
          <p class="meta">🏠 ${esc(a.shelter)}, ${esc(a.location)}</p>
          <p class="desc">${esc(a.about)}</p>
          <div class="card-actions"><button class="btn btn-green btn-small" data-adopt="${a.id}">Ask about ${esc(a.name)}</button></div>
        </div>
      </article>`;
    }).join('') : emptyState('No animals in this category right now. Check back soon.');
  }

  // ------------------------------------------------------------ rendering: library
  let libTopic = 'All';
  function renderLibrary() {
    const topics = ['All', ...new Set(ARTICLES.map((a) => a.topic))];
    $('#libChips').innerHTML = topics.map((t) => `<button class="chip ${t === libTopic ? 'active' : ''}" data-topic="${esc(t)}">${esc(t)}</button>`).join('');
    $('#libGrid').innerHTML = ARTICLES.filter((a) => libTopic === 'All' || a.topic === libTopic).map((a) => `
      <article class="article">
        <span class="tag">${esc(a.topic)}</span>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.summary)}</p>
        <details><summary>Read the guide</summary><ul>${a.points.map((pt) => `<li>${esc(pt)}</li>`).join('')}</ul></details>
      </article>`).join('');
  }

  // ------------------------------------------------------------ rendering: marketplace + cart
  let shopCat = 'All';
  function renderShop() {
    const cats = ['All', ...new Set(PRODUCTS.map((p) => p.category))];
    $('#shopChips').innerHTML = cats.map((c) => `<button class="chip ${c === shopCat ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    $('#shopGrid').innerHTML = PRODUCTS.filter((p) => shopCat === 'All' || p.category === shopCat).map((p) => `
      <article class="card">
        <div class="card-img"><img src="${p.img}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='images/products/${p.fallback}.svg'"></div>
        <div class="card-body">
          <span class="cat-tag">${esc(p.category)}</span>
          <h3>${esc(p.name)}</h3>
          <div class="product-foot">
            <span class="price">${money(p.price)}</span>
            <button class="btn btn-green btn-small" data-add="${p.id}">Add to cart</button>
          </div>
        </div>
      </article>`).join('');
    updateCartCount();
  }

  function saveCart() { localStorage.setItem('pc_cart', JSON.stringify(cart)); updateCartCount(); }
  function updateCartCount() { $('#cartCount').textContent = Object.values(cart).reduce((a, b) => a + b, 0); }

  function renderCart() {
    const ids = Object.keys(cart).filter((id) => productById[id]);
    const body = $('#cartBody');
    if (!ids.length) { body.innerHTML = '<p>Your cart is empty. Add something from the marketplace.</p>'; return; }
    const total = ids.reduce((sum, id) => sum + productById[id].price * cart[id], 0);
    body.innerHTML = ids.map((id) => {
      const p = productById[id];
      return `<div class="cart-row">
        <img src="${p.img}" alt="" onerror="this.onerror=null;this.src='images/products/${p.fallback}.svg'">
        <div><strong>${esc(p.name)}</strong><div class="qty"><button data-dec="${id}" aria-label="Decrease quantity">−</button>${cart[id]}<button data-inc="${id}" aria-label="Increase quantity">+</button></div></div>
        <span>${money(p.price * cart[id])}</span>
      </div>`;
    }).join('') + `<div class="cart-total"><span>Total</span><span>${money(total)}</span></div>
      <button class="btn btn-green btn-block" data-checkout>Place order (demo)</button>`;
  }

  // ------------------------------------------------------------ dialogs
  function showInfo(html) { $('#infoBody').innerHTML = html; $('#infoDialog').showModal(); }

  function openAuth(mode = 'login', message = '') {
    $(`input[name="authmode"][value="${mode}"]`).checked = true;
    applyAuthMode();
    const m = $('#authMsg'); m.textContent = message; m.className = 'form-msg' + (message ? ' error' : '');
    $('#authDialog').showModal();
  }

  function applyAuthMode() {
    const signup = $('input[name="authmode"]:checked').value === 'signup';
    $('#authNameField').hidden = !signup;
    $('#authSubmit').textContent = signup ? 'Create account' : 'Log in';
    $('input[name="password"]', $('#authForm')).autocomplete = signup ? 'new-password' : 'current-password';
  }

  function refreshAuthButton() {
    $('#authBtn').textContent = user ? `Log out (${user.name.split(' ')[0]})` : 'Login / Sign Up';
  }

  function logout(silent) {
    token = ''; user = null;
    localStorage.removeItem('pc_token'); localStorage.removeItem('pc_user');
    refreshAuthButton();
    if (!silent) toast('You have been logged out.');
    if (currentRoute === 'lost' || currentRoute === 'found' || currentRoute === 'home') runRoute();
  }

  // ------------------------------------------------------------ routing
  const TITLES = { home: 'Home', lost: 'Lost Pets', found: 'Found Pets', report: 'Report Pet', adoption: 'Adoption', library: 'Library', marketplace: 'Marketplace', contact: 'Contact & Help' };
  let currentRoute = 'home';

  function runRoute() {
    switch (currentRoute) {
      case 'home': renderHome(); break;
      case 'lost': renderPets('lost'); break;
      case 'found': renderPets('found'); break;
      case 'adoption': renderAdoption(); break;
      case 'library': renderLibrary(); break;
      case 'marketplace': renderShop(); break;
    }
  }

  function route() {
    const r = location.hash.slice(1);
    currentRoute = TITLES[r] ? r : 'home';
    $$('.page').forEach((s) => { s.hidden = s.id !== 'page-' + currentRoute; });
    $$('.nav-links a[data-route]').forEach((a) => a.classList.toggle('active', a.dataset.route === currentRoute));
    document.title = 'PetConnect | ' + TITLES[currentRoute];
    $('#navLinks').classList.remove('open');
    $('#navToggle').setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);
    runRoute();
  }

  // ------------------------------------------------------------ events
  function debounce(fn, ms = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  document.addEventListener('click', async (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    const d = t.dataset;

    if (d.contact) {
      const p = petsById[d.contact];
      const lost = p.report_type === 'lost';
      showInfo(`<h2>${lost ? 'Seen this pet?' : 'Is this your pet?'}</h2>
        <p>${lost ? 'Please contact the owner and share where and when you saw the animal.' : 'Contact the finder and be ready to describe your pet or show a photo.'}</p>
        <div class="contact-line"><strong>Name:</strong> ${esc(p.contact_name || 'Not provided')}</div>
        <div class="contact-line"><strong>Phone:</strong> ${p.contact_phone ? `<a href="tel:${esc(p.contact_phone.replace(/\s/g, ''))}">${esc(p.contact_phone)}</a>` : 'Not provided'}</div>
        <div class="contact-line"><strong>Area:</strong> ${esc(p.location)}</div>`);
    } else if (d.resolve) {
      try { const r = await api(`/api/pets/${d.resolve}/resolve`, { method: 'POST' }); toast(r.message); runRoute(); }
      catch (err) { toast(err.message); }
    } else if (d.adopt) {
      const a = adoptById[d.adopt];
      $('#contactForm').elements.subject.value = 'Adoption enquiry: ' + a.name;
      $('#contactForm').elements.message.value = `Hello, I'd like to know more about adopting ${a.name} (${a.species}) from ${a.shelter}, ${a.location}.`;
      location.hash = '#contact';
    } else if (d.species !== undefined && t.closest('#adoptChips')) {
      adoptSpecies = d.species;
      $$('#adoptChips .chip').forEach((c) => c.classList.toggle('active', c === t));
      renderAdoption();
    } else if (d.topic) { libTopic = d.topic; renderLibrary(); }
    else if (d.cat) { shopCat = d.cat; renderShop(); }
    else if (d.add) { cart[d.add] = (cart[d.add] || 0) + 1; saveCart(); toast('Added to cart'); }
    else if (d.inc) { cart[d.inc]++; saveCart(); renderCart(); }
    else if (d.dec) { cart[d.dec]--; if (cart[d.dec] <= 0) delete cart[d.dec]; saveCart(); renderCart(); }
    else if (d.checkout !== undefined) { cart = {}; saveCart(); $('#cartDialog').close(); toast('Thanks! This is a demo, so no real order was placed.'); }
  });

  $('#cartBtn').addEventListener('click', () => { renderCart(); $('#cartDialog').showModal(); });

  $('#navToggle').addEventListener('click', () => {
    const open = $('#navLinks').classList.toggle('open');
    $('#navToggle').setAttribute('aria-expanded', String(open));
  });

  $('#authBtn').addEventListener('click', () => { user ? logout() : openAuth('login'); });
  $$('input[name="authmode"]').forEach((r) => r.addEventListener('change', applyAuthMode));

  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const signup = $('input[name="authmode"]:checked').value === 'signup';
    const msg = $('#authMsg');
    msg.className = 'form-msg'; msg.textContent = 'Please wait…';
    try {
      const payload = { email: f.email.value, password: f.password.value };
      if (signup) payload.name = f.name.value;
      const data = await api(signup ? '/api/register' : '/api/login', { method: 'POST', json: payload });
      token = data.token; user = data.user;
      localStorage.setItem('pc_token', token); localStorage.setItem('pc_user', JSON.stringify(user));
      refreshAuthButton();
      e.target.reset();
      $('#authDialog').close();
      toast(`Welcome, ${user.name.split(' ')[0]}!`);
      runRoute();
    } catch (err) { msg.className = 'form-msg error'; msg.textContent = err.message; }
  });

  // search + filter
  ['lost', 'found'].forEach((type) => {
    $(`#${type}Search`).addEventListener('input', debounce(() => renderPets(type)));
    $(`#${type}Species`).addEventListener('change', () => renderPets(type));
  });

  // report form
  const reportForm = $('#reportForm');
  function applyReportType() {
    const lost = reportForm.elements.report_type.value === 'lost';
    $('#whereWord').textContent = lost ? 'lost' : 'found';
    $('#nameField').firstChild.textContent = lost ? "Pet's name" : 'Name on tag (if any)';
  }
  $$('input[name="report_type"]').forEach((r) => r.addEventListener('change', applyReportType));

  $('#photoInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const img = $('#photoPreview');
    if (!file) { img.hidden = true; $('#photoHint').hidden = false; return; }
    img.src = URL.createObjectURL(file);
    img.hidden = false;
    $('#photoHint').textContent = file.name;
  });

  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#reportMsg');
    const f = reportForm.elements;
    if (!f.species.value || !f.location.value.trim()) {
      msg.className = 'form-msg error'; msg.textContent = 'Please choose the animal type and enter where it was lost or found.'; return;
    }
    if (!token) { msg.className = 'form-msg error'; msg.textContent = 'Log in or sign up to submit a report.'; openAuth('login', 'Log in to submit your report.'); return; }
    msg.className = 'form-msg'; msg.textContent = 'Submitting…';
    try {
      const type = f.report_type.value;
      await api('/api/pets', { method: 'POST', body: new FormData(reportForm) });
      reportForm.reset(); applyReportType();
      $('#photoPreview').hidden = true; $('#photoHint').textContent = 'Tap to choose a clear photo (JPG, PNG or WEBP, up to 5 MB)';
      msg.textContent = '';
      toast('Report posted. Thank you for helping!');
      location.hash = '#' + type;
    } catch (err) {
      if (err.status === 401) { logout(true); openAuth('login', 'Your session expired. Please log in again.'); }
      msg.className = 'form-msg error'; msg.textContent = err.message;
    }
  });

  // contact form
  $('#contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const msg = $('#contactMsg');
    msg.className = 'form-msg'; msg.textContent = 'Sending…';
    try {
      const r = await api('/api/contact', { method: 'POST', json: { name: f.name.value, email: f.email.value, subject: f.subject.value, message: f.message.value } });
      e.target.reset(); msg.className = 'form-msg ok'; msg.textContent = r.message;
    } catch (err) { msg.className = 'form-msg error'; msg.textContent = err.message; }
  });

  // ------------------------------------------------------------ start
  window.addEventListener('hashchange', route);
  refreshAuthButton();
  applyReportType();
  updateCartCount();
  route();
})();
