const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1000&q=85';
const grid = document.querySelector('#listing-grid');
const count = document.querySelector('#results-count');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search-input');
const sortSelect = document.querySelector('#sort-select');
const dialog = document.querySelector('#listing-dialog');
const form = document.querySelector('#listing-form');
const feedback = document.querySelector('#form-feedback');
const toast = document.querySelector('#toast');
let selectedCategory = 'All items';
let searchTimer;
let toastTimer;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(price);
}

function listingCard(listing, index) {
  const image = listing.image && /^https?:\/\//i.test(listing.image) ? listing.image : FALLBACK_IMAGE;
  return `<article class="listing-card" style="animation-delay:${Math.min(index * 45, 270)}ms">
    <div class="listing-image-wrap"><img class="listing-image" src="${escapeHtml(image)}" alt="${escapeHtml(listing.title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"><span class="listing-category">${escapeHtml(listing.category)}</span></div>
    <div class="listing-details"><div class="listing-title-row"><h3 class="listing-title" title="${escapeHtml(listing.title)}">${escapeHtml(listing.title)}</h3><p class="listing-price">${formatPrice(listing.price)}</p></div><p class="listing-location">⌖ &nbsp;${escapeHtml(listing.location)}</p></div>
  </article>`;
}

async function loadListings() {
  const params = new URLSearchParams();
  const query = searchInput.value.trim();
  if (query) params.set('q', query);
  if (selectedCategory !== 'All items') params.set('category', selectedCategory);
  params.set('sort', sortSelect.value);
  count.textContent = 'Looking around...';
  try {
    const response = await fetch(`/api/listings?${params}`);
    if (!response.ok) throw new Error('Listings could not be loaded.');
    const data = await response.json();
    grid.innerHTML = data.listings.map(listingCard).join('');
    count.textContent = `${data.total} ${data.total === 1 ? 'good find' : 'good finds'}`;
    emptyState.hidden = data.total !== 0;
    grid.hidden = data.total === 0;
  } catch (error) {
    grid.innerHTML = '';
    grid.hidden = true;
    emptyState.hidden = false;
    emptyState.querySelector('h3').textContent = 'The market is taking a moment.';
    emptyState.querySelector('p').textContent = error.message;
    count.textContent = 'Connection issue';
  }
}

function openForm() {
  feedback.textContent = '';
  dialog.showModal();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

document.querySelectorAll('[data-open-form]').forEach((button) => button.addEventListener('click', openForm));
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadListings, 250);
});
document.querySelector('#search-button').addEventListener('click', loadListings);
searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') loadListings();
});
sortSelect.addEventListener('change', loadListings);
document.querySelectorAll('.category-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    selectedCategory = chip.dataset.category;
    document.querySelectorAll('.category-chip').forEach((item) => item.classList.toggle('selected', item === chip));
    loadListings();
  });
});
document.querySelector('#clear-filters').addEventListener('click', () => {
  searchInput.value = '';
  selectedCategory = 'All items';
  sortSelect.value = 'newest';
  document.querySelectorAll('.category-chip').forEach((chip) => chip.classList.toggle('selected', chip.dataset.category === selectedCategory));
  loadListings();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.textContent = '';
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Adding your listing...';
  const listing = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listing)
    });
    const data = await response.json();
    if (!response.ok) {
      feedback.textContent = Object.values(data.fields || {}).join(' ' ) || data.error || 'Please check your details.';
      return;
    }
    form.reset();
    dialog.close();
    selectedCategory = 'All items';
    searchInput.value = '';
    document.querySelectorAll('.category-chip').forEach((chip) => chip.classList.toggle('selected', chip.dataset.category === selectedCategory));
    await loadListings();
    showToast('Your listing is out there. Thanks for passing it along!');
    document.querySelector('#market').scrollIntoView({ behavior: 'smooth' });
  } catch {
    feedback.textContent = 'Could not reach the marketplace. Please try again.';
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Put it out there <span aria-hidden="true">→</span>';
  }
});

loadListings();