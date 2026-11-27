/**
 * GARDEN STATE STRIKERS PWA — MAIN CONTROLLER, HISTORY API ROUTER & SERVICE WORKER BOOTSTRAP
 */

import { renderClubView, renderHistoryView, renderSquadView, renderGalleryView, renderLegalSheet } from './renderer.js';
import { SocialSheetController } from './social-sheet.js';

const STATE = {
  club: null,
  players: [],
  gallery: [],
  activeView: 'club',
  squadFilter: {
    status: 'current',
    role: 'All'
  },
  gallerySeason: 'All',
  filteredGallery: [],
  lightboxIndex: 0
};

// DOM References
const DOM = {
  navButtons: document.querySelectorAll('.nav-btn[data-route]'),
  views: {
    club: document.getElementById('view-club'),
    history: document.getElementById('view-history'),
    squad: document.getElementById('view-squad'),
    gallery: document.getElementById('view-gallery')
  },
  clubRoot: document.getElementById('club-content-root'),
  historyRoot: document.getElementById('history-content-root'),
  squadRoot: document.getElementById('squad-grid-root'),
  galleryRoot: document.getElementById('gallery-grid-root'),
  galleryFilterRoot: document.getElementById('gallery-filter-root'),
  statusButtons: document.querySelectorAll('.segment-btn[data-status-filter]'),
  roleButtons: document.querySelectorAll('.role-chip[data-role-filter]'),
  countCurrent: document.getElementById('count-current'),
  countFormer: document.getElementById('count-former'),
  themeButtons: document.querySelectorAll('.js-theme-btn[data-theme-value]'),
  toast: document.getElementById('app-toast'),
  toastMsg: document.getElementById('app-toast-msg'),
  // Lightbox elements
  lightboxDialog: document.getElementById('gallery-lightbox-dialog'),
  lightboxImg: document.getElementById('lightbox-img'),
  lightboxTitle: document.getElementById('lightbox-title'),
  lightboxCaption: document.getElementById('lightbox-caption'),
  lightboxSeasonTag: document.getElementById('lightbox-season-tag'),
  lightboxCounter: document.getElementById('lightbox-counter'),
  lightboxCloseBtn: document.getElementById('lightbox-close-btn'),
  lightboxPrevBtn: document.getElementById('lightbox-prev-btn'),
  lightboxNextBtn: document.getElementById('lightbox-next-btn'),
  lightboxTouchStage: document.getElementById('lightbox-touch-stage'),
  // Legal & Privacy Sheet elements
  legalDialog: document.getElementById('legal-sheet-dialog'),
  legalBody: document.getElementById('legal-sheet-body'),
  legalCloseBtn: document.getElementById('legal-sheet-close-btn')
};

let socialSheet = null;
let toastTimer = null;

/**
 * Displays an iOS-style floating pill toast notification
 */
function showToast(message) {
  if (!DOM.toast || !DOM.toastMsg) return;
  DOM.toastMsg.textContent = message;
  DOM.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    DOM.toast.classList.remove('is-visible');
  }, 2600);
}

/**
 * Fetches all headless JSON data files using strictly relative paths (./data/*.json)
 */
async function loadHeadlessData() {
  const [clubRes, playersRes, galleryRes] = await Promise.all([
    fetch('./data/club.json'),
    fetch('./data/players.json'),
    fetch('./data/gallery.json')
  ]);

  if (!clubRes.ok || !playersRes.ok || !galleryRes.ok) {
    throw new Error('Failed to load headless JSON datasets');
  }

  const [club, players, gallery] = await Promise.all([
    clubRes.json(),
    playersRes.json(),
    galleryRes.json()
  ]);

  STATE.club = club;
  STATE.players = players;
  STATE.gallery = gallery;
  STATE.filteredGallery = gallery;
}

/**
 * Updates squad segmented control counters
 */
function updateRosterCounters() {
  const currentCount = STATE.players.filter(p => p.status === 'current').length;
  const formerCount = STATE.players.filter(p => p.status === 'former').length;
  if (DOM.countCurrent) DOM.countCurrent.textContent = String(currentCount);
  if (DOM.countFormer) DOM.countFormer.textContent = String(formerCount);
}

/**
 * Parses URL hash into { view, subId }
 * Supported routes: #club, #history, #history/timeline, #squad, #squad/:playerId, #gallery, #gallery/:photoId
 */
function parseHashRoute(hashStr = window.location.hash) {
  const cleaned = (hashStr || '#club').replace(/^#\/?/, '').trim();
  const [rawView, rawSubId] = cleaned.split('/');
  const view = ['club', 'history', 'squad', 'gallery'].includes(rawView) ? rawView : 'club';
  return { view, subId: rawSubId ? decodeURIComponent(rawSubId) : null };
}

/**
 * Synchronizes active view tab, open dialogs, and History API state
 */
function applyRoute({ view, subId }, { pushHistory = false, replaceHistory = false } = {}) {
  STATE.activeView = view;

  // Toggle active view section
  Object.entries(DOM.views).forEach(([key, sectionEl]) => {
    if (!sectionEl) return;
    sectionEl.classList.toggle('is-active', key === view);
  });

  // Update nav aria-current state
  DOM.navButtons.forEach(btn => {
    const isTarget = btn.getAttribute('data-route') === view;
    if (isTarget) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  const targetHash = subId ? `#${view}/${encodeURIComponent(subId)}` : `#${view}`;
  if (pushHistory && window.location.hash !== targetHash) {
    history.pushState({ view, subId }, '', targetHash);
  } else if (replaceHistory) {
    history.replaceState({ view, subId }, '', targetHash);
  }

  // Handle sub-route modals (#squad/alex-rivera or #gallery/match-01)
  if (view === 'squad' && subId) {
    const player = STATE.players.find(p => p.id === subId);
    if (player) {
      socialSheet?.open(player);
    }
  } else {
    if (socialSheet?.dialog?.open) {
      socialSheet.close();
    }
  }

  if (view === 'gallery' && subId) {
    const idx = STATE.filteredGallery.findIndex(item => item.id === subId);
    if (idx !== -1) {
      openLightboxAtIndex(idx, { syncRoute: false });
    }
  } else {
    if (DOM.lightboxDialog?.open) {
      DOM.lightboxDialog.close();
    }
  }
}

/**
 * Lightbox Controller Methods
 */
function openLightboxAtIndex(index, { syncRoute = true } = {}) {
  const list = STATE.filteredGallery;
  if (!list.length || !DOM.lightboxDialog) return;

  const safeIndex = (index + list.length) % list.length;
  STATE.lightboxIndex = safeIndex;
  const item = list[safeIndex];

  DOM.lightboxImg.src = item.src;
  DOM.lightboxImg.alt = item.title;
  DOM.lightboxTitle.textContent = item.title;
  DOM.lightboxCaption.textContent = `${item.caption} (${item.location || 'New Jersey'})`;
  DOM.lightboxSeasonTag.textContent = item.season;
  DOM.lightboxCounter.textContent = `${safeIndex + 1} / ${list.length}`;

  if (!DOM.lightboxDialog.open) {
    DOM.lightboxDialog.showModal();
  }

  if (syncRoute) {
    const targetHash = `#gallery/${encodeURIComponent(item.id)}`;
    if (window.location.hash !== targetHash) {
      history.pushState({ view: 'gallery', subId: item.id }, '', targetHash);
    }
  }
}

function stepLightbox(delta) {
  openLightboxAtIndex(STATE.lightboxIndex + delta, { syncRoute: true });
}

/**
 * Applies Light or Dark mode theme and persists user preference in localStorage
 */
function applyTheme(theme, { persist = true } = {}) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', normalized);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', normalized === 'light' ? '#f4f6fb' : '#0f0e2a');
  }

  DOM.themeButtons.forEach(btn => {
    const isMatch = btn.getAttribute('data-theme-value') === normalized;
    btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
  });

  if (persist) {
    try {
      localStorage.setItem('gss-theme', normalized);
    } catch {}
  }
}

/**
 * Binds UI interactions for Navigation, Theme Switcher, Copy Address, Squad Filters, Social Sheet, and Lightbox
 */
function bindInteractions() {
  // 0. Live Theme Switcher Bar (Light / Dark)
  const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(initialTheme, { persist: false });

  DOM.themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const nextTheme = btn.getAttribute('data-theme-value') || 'dark';
      applyTheme(nextTheme, { persist: true });
    });
  });

  // 1. Primary Tab Navigation
  DOM.navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.getAttribute('data-route') || 'club';
      applyRoute({ view: route, subId: null }, { pushHistory: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // 2. Back/Forward Gesture Support (iOS edge-swipe & Android hardware back button)
  window.addEventListener('popstate', () => {
    const parsed = parseHashRoute(window.location.hash);
    applyRoute(parsed, { pushHistory: false });
  });

  // 3. One-Tap Copy Address, 2026 Performance Tabs & Story CTA Buttons in #club view
  DOM.clubRoot?.addEventListener('click', async (e) => {
    const perfTabBtn = e.target.closest('.js-club-perf-tab');
    if (perfTabBtn) {
      const nextPerfTab = perfTabBtn.getAttribute('data-perf-tab') || 'both';
      renderClubView(STATE.club, DOM.clubRoot, nextPerfTab);
      return;
    }

    const seasonGamesBtn = e.target.closest('.js-go-season-games');
    if (seasonGamesBtn) {
      const tabId = seasonGamesBtn.getAttribute('data-timeline-tab') || 'summer-t20';
      const yrId = seasonGamesBtn.getAttribute('data-timeline-year') || '2026';
      renderHistoryView(STATE.club, DOM.historyRoot, tabId, yrId);
      applyRoute({ view: 'history', subId: 'timeline' }, { pushHistory: true });
      setTimeout(() => {
        document.getElementById('history-timeline-anchor')?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
      return;
    }

    const historyTrigger = e.target.closest('.js-go-history');
    if (historyTrigger) {
      const scrollTimeline = historyTrigger.getAttribute('data-scroll-timeline') === 'true';
      applyRoute({ view: 'history', subId: scrollTimeline ? 'timeline' : null }, { pushHistory: true });
      if (scrollTimeline) {
        setTimeout(() => {
          document.getElementById('history-timeline-anchor')?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const copyBtn = e.target.closest('.js-copy-address');
    if (!copyBtn) return;

    const addressText = copyBtn.getAttribute('data-address') || '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(addressText);
      } else {
        const tempInput = document.createElement('textarea');
        tempInput.value = addressText;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        tempInput.remove();
      }
      showToast('Ground address copied for WhatsApp!');
    } catch {
      showToast('Copied: ' + addressText);
    }
  });

  // 3b. History Page CTAs (Multi-Tabbed Timeline Switcher, Year Sub-Filter, Scroll to Timeline & Go to Squad)
  DOM.historyRoot?.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.js-timeline-tab');
    if (tabBtn) {
      const nextTabId = tabBtn.getAttribute('data-timeline-tab') || 'club';
      renderHistoryView(STATE.club, DOM.historyRoot, nextTabId, 'overview');
      return;
    }

    const yearChip = e.target.closest('.js-timeline-year-chip');
    if (yearChip) {
      const tabId = yearChip.getAttribute('data-timeline-tab') || 'summer-t20';
      const yearId = yearChip.getAttribute('data-timeline-year') || 'overview';
      renderHistoryView(STATE.club, DOM.historyRoot, tabId, yearId);
      return;
    }

    const scrollTimelineBtn = e.target.closest('.js-scroll-to-timeline');
    if (scrollTimelineBtn) {
      document.getElementById('history-timeline-anchor')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const goSquadBtn = e.target.closest('.js-go-squad-from-history');
    if (goSquadBtn) {
      applyRoute({ view: 'squad', subId: null }, { pushHistory: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // 4. Squad Dual-Layer Filtering (Status Segmented Pill + Role Scroll-Snap Strip)
  DOM.statusButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.getAttribute('data-status-filter') || 'current';
      STATE.squadFilter.status = status;
      DOM.statusButtons.forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      renderSquadView(STATE.players, STATE.squadFilter, DOM.squadRoot);
    });
  });

  DOM.roleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.getAttribute('data-role-filter') || 'All';
      STATE.squadFilter.role = role;
      DOM.roleButtons.forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      renderSquadView(STATE.players, STATE.squadFilter, DOM.squadRoot);
    });
  });

  // 5. Open Hybrid Social Feed & Player Spotlight Sheet
  DOM.squadRoot?.addEventListener('click', (e) => {
    const trigger = e.target.closest('.js-open-social-sheet');
    if (!trigger) return;

    const playerId = trigger.getAttribute('data-player-id');
    const platform = trigger.getAttribute('data-platform') || 'spotlight';
    const player = STATE.players.find(p => p.id === playerId);
    if (!player) return;

    const targetHash = `#squad/${encodeURIComponent(player.id)}`;
    if (window.location.hash !== targetHash) {
      history.pushState({ view: 'squad', subId: player.id }, '', targetHash);
    }
    socialSheet?.open(player, platform);
  });

  // 6. Gallery Season Filter & Lightbox Triggers
  DOM.galleryFilterRoot?.addEventListener('click', (e) => {
    const chip = e.target.closest('.js-gallery-season-chip');
    if (!chip) return;
    const season = chip.getAttribute('data-season') || 'All';
    STATE.gallerySeason = season;
    STATE.filteredGallery = season === 'All'
      ? STATE.gallery
      : STATE.gallery.filter(p => p.season === season);

    DOM.galleryFilterRoot.querySelectorAll('.js-gallery-season-chip').forEach(c => {
      c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
    });

    renderGalleryView(STATE.gallery, STATE.gallerySeason, DOM.galleryRoot, DOM.galleryFilterRoot);
  });

  DOM.galleryRoot?.addEventListener('click', (e) => {
    const card = e.target.closest('.js-open-lightbox');
    if (!card) return;
    const index = Number(card.getAttribute('data-photo-index') || 0);
    openLightboxAtIndex(index, { syncRoute: true });
  });

  // Lightbox Navigation & Swipe Gestures
  DOM.lightboxPrevBtn?.addEventListener('click', () => stepLightbox(-1));
  DOM.lightboxNextBtn?.addEventListener('click', () => stepLightbox(1));
  DOM.lightboxCloseBtn?.addEventListener('click', () => DOM.lightboxDialog?.close());

  DOM.lightboxDialog?.addEventListener('click', (e) => {
    if (e.target === DOM.lightboxDialog) {
      DOM.lightboxDialog.close();
    }
  });

  DOM.lightboxDialog?.addEventListener('close', () => {
    if (window.location.hash.startsWith('#gallery/')) {
      history.pushState({ view: 'gallery', subId: null }, '', '#gallery');
    }
  });

  // Keyboard Left/Right navigation when Lightbox is open
  window.addEventListener('keydown', (e) => {
    if (!DOM.lightboxDialog?.open) return;
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });

  // Touch Swipe Left/Right on Lightbox Stage
  let touchStartX = 0;
  DOM.lightboxTouchStage?.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  DOM.lightboxTouchStage?.addEventListener('touchend', (e) => {
    const deltaX = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(deltaX) > 45) {
      stepLightbox(deltaX < 0 ? 1 : -1);
    }
  }, { passive: true });

  // 7. Global One-Tap Copy Email & Legal Bottom Sheet (<dialog>) Triggers
  document.addEventListener('click', async (e) => {
    const copyEmailBtn = e.target.closest('.js-copy-email');
    if (copyEmailBtn) {
      const emailText = copyEmailBtn.getAttribute('data-email') || 'info@gardenstatestrikers.org';
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(emailText);
        } else {
          const tempInput = document.createElement('textarea');
          tempInput.value = emailText;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          tempInput.remove();
        }
        showToast(`Email copied: ${emailText}`);
      } catch {
        showToast(`Email: ${emailText}`);
      }
      return;
    }

    const openLegalBtn = e.target.closest('.js-open-legal-sheet');
    if (openLegalBtn && DOM.legalDialog) {
      const tabId = openLegalBtn.getAttribute('data-legal-tab') || 'terms';
      renderLegalSheet(STATE.club, DOM.legalBody, tabId);
      if (!DOM.legalDialog.open) {
        DOM.legalDialog.showModal();
      }
      return;
    }

    const switchLegalTabBtn = e.target.closest('.js-legal-tab-btn');
    if (switchLegalTabBtn && DOM.legalBody) {
      const nextTab = switchLegalTabBtn.getAttribute('data-legal-tab') || 'terms';
      renderLegalSheet(STATE.club, DOM.legalBody, nextTab);
    }
  });

  DOM.legalCloseBtn?.addEventListener('click', () => DOM.legalDialog?.close());
  DOM.legalDialog?.addEventListener('click', (e) => {
    if (e.target === DOM.legalDialog) {
      DOM.legalDialog.close();
    }
  });
}

/**
 * Registers the Versioned Offline Service Worker (./sw.js) and reloads once when an updated SW takes control
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
      const reg = await navigator.serviceWorker.register('./sw.js', {
        scope: './',
        updateViaCache: 'none'
      });
      reg.update();
    } catch (err) {
      console.warn('Service Worker registration skipped or failed:', err);
    }
  }
}

/**
 * Application Bootstrap
 */
async function initApp() {
  socialSheet = new SocialSheetController({
    dialogEl: document.getElementById('social-sheet-dialog'),
    titleEl: document.getElementById('sheet-player-title'),
    bodyEl: document.getElementById('sheet-body-root'),
    closeBtnEl: document.getElementById('sheet-close-btn'),
    onCloseRouteSync: () => {
      if (window.location.hash.startsWith('#squad/')) {
        history.pushState({ view: 'squad', subId: null }, '', '#squad');
      }
    }
  });

  bindInteractions();

  try {
    await loadHeadlessData();

    // Render all views from JSON data
    renderClubView(STATE.club, DOM.clubRoot);
    renderHistoryView(STATE.club, DOM.historyRoot);
    updateRosterCounters();
    renderSquadView(STATE.players, STATE.squadFilter, DOM.squadRoot);
    renderGalleryView(STATE.gallery, STATE.gallerySeason, DOM.galleryRoot, DOM.galleryFilterRoot);

    // Sync initial URL hash route
    const initialRoute = parseHashRoute(window.location.hash);
    applyRoute(initialRoute, { replaceHistory: true });
  } catch (err) {
    console.error('Error initializing Garden State Strikers PWA:', err);
  }

  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', initApp);
