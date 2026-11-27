/**
 * GARDEN STATE STRIKERS PWA — HEADLESS JSON RENDERER
 * Renders Club overview, NJ Home Grounds, Club Timeline, Squad Roster (with graceful degradation), and Matchday Gallery.
 */

const ICONS = {
  mapPin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4l11.733 16h4.267l-11.733 -16z"></path><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"></path></svg>`,
  youtube: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
};

/**
 * Escapes HTML special characters to prevent XSS when rendering JSON fields
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Computes two-letter monogram initials from player name (e.g., "Alex Rivera" -> "AR")
 */
export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'GS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Builds platform-smart Maps URL (Apple Maps `maps://` on iOS/iPadOS, universal Google Maps HTTPS fallback elsewhere)
 */
export function buildMapsHref(ground) {
  const query = encodeURIComponent(`${ground.name}, ${ground.address}`);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    return `maps://?q=${query}&ll=${ground.coordinates.lat},${ground.coordinates.lng}`;
  }
  return `https://maps.google.com/?q=${query}`;
}

/**
 * Renders a single 2026 Season Performance Card (used for Summer Performance and Fall Performance)
 */
function buildSeasonPerformanceCardHtml(seasonObj, badgeLabel, spanClass = 'bento-span-6', timelineTabTarget = 'summer-t20') {
  if (!seasonObj) return '';
  return `
    <article class="bento-card bento-card--hero ${spanClass} performance-season-card">
      <div class="card-kicker" style="margin-bottom: var(--space-2);">
        <span>${escapeHtml(badgeLabel)}</span>
        <span class="badge-pill badge-pill--orange">${escapeHtml(seasonObj.status)}</span>
      </div>

      <h3 class="ground-title" style="margin-bottom: var(--space-2);">${escapeHtml(seasonObj.name)}</h3>

      <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between;">
        <span class="badge-pill">${escapeHtml(seasonObj.league)}</span>
        <span class="badge-pill badge-pill--orange tabular-nums">${escapeHtml(seasonObj.record.standing)}</span>
      </div>

      <div class="season-stats-strip" aria-label="${escapeHtml(seasonObj.name)} Record">
        <div class="season-stat-box">
          <span class="season-stat-val tabular-nums">${escapeHtml(seasonObj.record.played)}</span>
          <span class="season-stat-lbl">Played</span>
        </div>
        <div class="season-stat-box">
          <span class="season-stat-val season-stat-val--accent tabular-nums">${escapeHtml(seasonObj.record.won)}</span>
          <span class="season-stat-lbl">Won</span>
        </div>
        <div class="season-stat-box">
          <span class="season-stat-val tabular-nums">${escapeHtml(seasonObj.record.lost)}</span>
          <span class="season-stat-lbl">Lost</span>
        </div>
        <div class="season-stat-box">
          <span class="season-stat-val tabular-nums">${escapeHtml(seasonObj.record.points)}</span>
          <span class="season-stat-lbl">Points</span>
        </div>
      </div>

      ${seasonObj.highlight ? `
        <p class="ground-note" style="margin-top: var(--space-3);">
          ${escapeHtml(seasonObj.highlight)}
        </p>
      ` : ''}

      <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; margin-top:var(--space-3); padding-top:var(--space-3); border-top:1px solid var(--border-hairline); font-size:var(--text-xs); color:var(--text-secondary);">
        <span>Capt: <strong>${escapeHtml(seasonObj.captain || 'Anil Sidaganahalli')}</strong> • VC: <strong>${escapeHtml(seasonObj.viceCaptain || 'Santosh Lalan')}</strong></span>
        <button
          type="button"
          class="welcome-inline-link js-go-season-games"
          data-timeline-tab="${escapeHtml(timelineTabTarget)}"
          data-timeline-year="2026"
          style="font-size:var(--text-xs);"
        >
          View All ${escapeHtml(seasonObj.record.played)} Games →
        </button>
      </div>
    </article>
  `;
}

/**
 * Renders the #club landing view from data/club.json (Welcome story, 2026 Summer & Fall Performance Tabs & Cards, and Single NJ Home Ground)
 */
export function renderClubView(clubData, container, activePerfTab = 'both') {
  if (!clubData || !container) return;

  const { welcome = {}, season, fallSeason, grounds = [] } = clubData;

  const perfTabs = [
    { id: 'both', label: 'All 2026 Seasons (Summer & Fall)' },
    { id: 'summer', label: 'Summer T20 Performance' },
    { id: 'fall', label: 'Fall T20 Performance' }
  ];

  const perfTabsHtml = perfTabs.map(t => {
    const isSelected = t.id === activePerfTab;
    return `
      <button
        type="button"
        class="timeline-tab-btn js-club-perf-tab"
        role="tab"
        data-perf-tab="${escapeHtml(t.id)}"
        aria-selected="${isSelected ? 'true' : 'false'}"
        aria-pressed="${isSelected ? 'true' : 'false'}"
      >
        ${escapeHtml(t.label)}
      </button>
    `;
  }).join('');

  let performanceCardsHtml = '';
  if (activePerfTab === 'summer') {
    performanceCardsHtml = buildSeasonPerformanceCardHtml(season, '2026 Summer T20 Performance', 'bento-span-12', 'summer-t20');
  } else if (activePerfTab === 'fall') {
    performanceCardsHtml = buildSeasonPerformanceCardHtml(fallSeason, '2026 Fall T20 Performance', 'bento-span-12', 'fall-t20');
  } else {
    performanceCardsHtml =
      buildSeasonPerformanceCardHtml(season, '2026 Summer T20 Performance', 'bento-span-6', 'summer-t20') +
      buildSeasonPerformanceCardHtml(fallSeason, '2026 Fall T20 Performance', 'bento-span-6', 'fall-t20');
  }

  const groundsHtml = grounds.map(ground => {
    const mapsHref = buildMapsHref(ground);
    const webMapsFallback = `https://maps.google.com/?q=${encodeURIComponent(ground.address)}`;
    const specsHtml = [ground.pitchType, ground.boundaryMeters, ...(ground.facilities || [])]
      .filter(Boolean)
      .map(item => `<span class="spec-chip">${escapeHtml(item)}</span>`)
      .join('');

    return `
      <article class="bento-card ground-card bento-span-12">
        <div class="ground-header">
          <div class="card-kicker">
            <span>${escapeHtml(ground.city)}</span>
            <span class="badge-pill badge-pill--orange">${escapeHtml(ground.badge)}</span>
          </div>
          <h3 class="ground-title">${escapeHtml(ground.name)}</h3>
          <p class="ground-address">${escapeHtml(ground.address)}</p>
        </div>

        <div class="ground-specs" aria-label="Ground Specifications">
          ${specsHtml}
        </div>

        ${ground.notes ? `<p class="ground-note">${escapeHtml(ground.notes)}</p>` : ''}

        <div class="ground-actions">
          <a
            href="${mapsHref}"
            data-fallback-url="${webMapsFallback}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-action btn-action--primary"
            aria-label="Open ${escapeHtml(ground.name)} in Maps"
          >
            ${ICONS.mapPin}
            <span>Open in Maps</span>
          </a>
          <button
            type="button"
            class="btn-action btn-action--secondary js-copy-address"
            data-address="${escapeHtml(ground.name)} — ${escapeHtml(ground.address)}"
            aria-label="Copy address for ${escapeHtml(ground.name)}"
          >
            ${ICONS.copy}
            <span>Copy Address</span>
          </button>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = `
    <div class="bento-grid">
      <!-- Landing Welcome Narrative Card (Full Width 12-Col Bento) -->
      <article class="bento-card welcome-story-card bento-span-12">
        <div class="hero-top" style="margin-bottom: 0;">
          <div class="hero-crest-wrap">
            <img
              src="${escapeHtml(clubData.logo || clubData.logoFallback || './images/gss-logo.jpg')}"
              alt="${escapeHtml(clubData.clubName)} Crest"
              class="hero-crest-img"
              width="68"
              height="68"
            />
          </div>
          <div>
            <h2 class="hero-title">${escapeHtml(welcome.heading || 'Welcome to Garden State Strikers')}</h2>
          </div>
        </div>

        <div class="welcome-prose">
          <p>
            ${escapeHtml(welcome.lead)}
            <button type="button" class="welcome-inline-link js-go-history" data-target-route="history">
              (${escapeHtml(welcome.storyCtaText || 'Want to see how it all began? Read our club story below.')})
            </button>
          </p>
          <p>${escapeHtml(welcome.philosophy)}</p>
          <p><strong>${escapeHtml(welcome.connect)}</strong></p>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; padding-top:var(--space-2);">
          <button type="button" class="btn-action btn-action--primary js-go-history" data-target-route="history">
            ${ICONS.shield}
            <span>Read Our History &amp; Club Story</span>
          </button>
          <button type="button" class="btn-action btn-action--secondary js-go-history" data-target-route="history" data-scroll-timeline="true">
            ${ICONS.calendar}
            <span>Explore Club Timeline</span>
          </button>
        </div>
      </article>
    </div>

    <!-- 2026 Season Performance Section with Tab Bar & Two Performance Cards (Summer & Fall) -->
    <div class="section-header" style="flex-wrap: wrap; align-items: center;">
      <div>
        <h2 class="section-title">2026 Season Performance</h2>
        <p class="section-subtitle">Summer T20 Gold Division &amp; MCL Fall T20 Elite Statistics (15W – 3L – 2NR Combined)</p>
      </div>
      <div class="timeline-segmented-tabs" role="tablist" aria-label="2026 Season Performance Filter" style="width: 100%; max-width: 560px;">
        ${perfTabsHtml}
      </div>
    </div>

    <div class="bento-grid" id="club-performance-cards-grid" aria-live="polite">
      <!-- Card 1: 2026 Summer Performance & Card 2: 2026 Fall Performance -->
      ${performanceCardsHtml}
    </div>

    <!-- NJ Home Ground Section -->
    <div class="section-header">
      <div>
        <h2 class="section-title">New Jersey Home Ground</h2>
        <p class="section-subtitle">One-tap directions &amp; WhatsApp address copy</p>
      </div>
    </div>

    <div class="bento-grid">
      ${groundsHtml}
    </div>
  `;
}

/**
 * Renders the dedicated #history view (Our History narrative chapters leading into the Multi-Tabbed Club & Season Timeline Card with Year Sub-Filters)
 */
export function renderHistoryView(clubData, container, activeTabId = 'club', activeYearId = 'overview') {
  if (!clubData || !container) return;

  const { history = {}, timelineTabs = [] } = clubData;
  const chapters = history.chapters || [];
  const selectedTab = timelineTabs.find(t => t.id === activeTabId) || timelineTabs[0] || { id: 'club', label: 'Club Milestones', items: [] };

  const yearFilters = selectedTab.yearFilters || [];
  const selectedYearFilter = yearFilters.find(yf => yf.id === activeYearId) || yearFilters[0] || null;
  const activeItems = selectedYearFilter ? (selectedYearFilter.items || []) : (selectedTab.items || []);
  const activeSummary = selectedYearFilter ? (selectedYearFilter.summary || selectedTab.subtitle) : (selectedTab.subtitle || '');
  const highlightItem = selectedYearFilter?.highlightItem || null;

  const chaptersHtml = chapters.map((chap, idx) => {
    const paragraphs = String(chap.description || '')
      .split('\n\n')
      .filter(Boolean)
      .map(p => `<p>${escapeHtml(p)}</p>`)
      .join('');

    return `
      <article class="bento-card history-chapter-card">
        <div class="card-kicker">
          <span class="history-chapter-era tabular-nums">Chapter 0${idx + 1} • ${escapeHtml(chap.era)}</span>
          <span class="badge-pill badge-pill--orange">${escapeHtml(chap.tag)}</span>
        </div>
        <h2 class="history-chapter-title">${escapeHtml(chap.title)}</h2>
        <div class="history-chapter-prose">
          ${paragraphs}
        </div>
        ${chap.founderHighlight ? `
          <div style="margin-top:auto; padding-top:var(--space-3); border-top:1px solid var(--border-hairline); font-size:var(--text-xs); color:var(--gss-orange-400); font-weight:700;">
            ★ ${escapeHtml(chap.founderHighlight)}
          </div>
        ` : ''}
      </article>
    `;
  }).join('');

  const tabsHeaderHtml = timelineTabs.map(tab => {
    const isActive = tab.id === selectedTab.id;
    return `
      <button
        type="button"
        class="timeline-tab-btn js-timeline-tab"
        role="tab"
        data-timeline-tab="${escapeHtml(tab.id)}"
        aria-selected="${isActive ? 'true' : 'false'}"
        aria-pressed="${isActive ? 'true' : 'false'}"
      >
        ${escapeHtml(tab.label)}
      </button>
    `;
  }).join('');

  const yearFilterStripHtml = yearFilters.length > 0
    ? `
      <div class="timeline-year-filter-strip" role="group" aria-label="Filter Season by Year">
        ${yearFilters.map(yf => {
          const isSelected = selectedYearFilter && yf.id === selectedYearFilter.id;
          return `
            <button
              type="button"
              class="role-chip js-timeline-year-chip"
              data-timeline-tab="${escapeHtml(selectedTab.id)}"
              data-timeline-year="${escapeHtml(yf.id)}"
              aria-pressed="${isSelected ? 'true' : 'false'}"
            >
              ${escapeHtml(yf.label)}
            </button>
          `;
        }).join('')}
      </div>
    `
    : '';

  const highlightBannerHtml = highlightItem
    ? `
      <div class="timeline-season-highlight-banner">
        <div class="timeline-head" style="margin-bottom:6px;">
          <span class="timeline-year tabular-nums">${escapeHtml(highlightItem.year)} Season Summary</span>
          <span class="badge-pill badge-pill--orange">${escapeHtml(highlightItem.tag)}</span>
        </div>
        <h3 class="timeline-title" style="margin-bottom:4px;">${escapeHtml(highlightItem.title)}</h3>
        <p class="timeline-desc">${escapeHtml(highlightItem.description)}</p>
      </div>
    `
    : '';

  const timelineItemsHtml = activeItems.map(item => {
    const outcomeClass = item.outcome === 'WIN'
      ? 'timeline-tag--win'
      : item.outcome === 'LOSS'
        ? 'timeline-tag--loss'
        : item.outcome === 'NR'
          ? 'timeline-tag--nr'
          : '';
    const dotClass = item.outcome === 'WIN'
      ? 'timeline-dot--win'
      : item.outcome === 'LOSS'
        ? 'timeline-dot--loss'
        : '';

    return `
      <li class="timeline-item">
        <span class="timeline-dot ${dotClass}" aria-hidden="true"></span>
        <div class="timeline-head">
          <span class="timeline-year tabular-nums">${escapeHtml(item.year)}</span>
          <span class="timeline-tag ${outcomeClass}">${escapeHtml(item.tag)}</span>
          ${item.scorecardUrl ? `
            <a
              href="${escapeHtml(item.scorecardUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="timeline-scorecard-link"
            >
              Scorecard ↗
            </a>
          ` : ''}
        </div>
        <h3 class="timeline-title">${escapeHtml(item.title)}</h3>
        <p class="timeline-desc tabular-nums">${escapeHtml(item.description)}</p>
      </li>
    `;
  }).join('');

  container.innerHTML = `
    <!-- History Hero Intro Banner -->
    <article class="bento-card history-hero-card">
      <h1 class="hero-title">${escapeHtml(history.heading || 'Our History')}</h1>
      <p style="font-size:var(--text-base); color:var(--text-secondary); margin-top:6px; max-width:780px;">
        ${escapeHtml(history.subheading || '')}
      </p>
      <div style="margin-top:var(--space-4); display:flex; flex-wrap:wrap; gap:10px;">
        <button type="button" class="btn-action btn-action--primary js-scroll-to-timeline">
          ${ICONS.calendar}
          <span>Jump to Club &amp; Season Timelines ↓</span>
        </button>
        <button type="button" class="btn-action btn-action--secondary js-go-squad-from-history">
          <span>Meet the Founders &amp; Squad →</span>
        </button>
      </div>
    </article>

    <!-- 4 Founding Story Chapters -->
    <div class="section-header" style="margin-top:0;">
      <div>
        <h2 class="section-title">How It All Began</h2>
        <p class="section-subtitle">Four chapters of persistence, community, and love for the game</p>
      </div>
    </div>

    <div class="history-chapters-grid">
      ${chaptersHtml}
    </div>

    <!-- Multi-Tabbed Club & Season Timeline Card -->
    <div class="section-header" id="history-timeline-anchor">
      <div>
        <h2 class="section-title">Club &amp; Season Timelines</h2>
        <p class="section-subtitle">Switch tabs for Club Milestones, Summer T20, and Fall T20 — or filter by year for every match</p>
      </div>
    </div>

    <article class="bento-card timeline-tabbed-card">
      <div class="timeline-tabs-header">
        <div class="timeline-segmented-tabs" role="tablist" aria-label="Club Timeline Categories">
          ${tabsHeaderHtml}
        </div>
        ${yearFilterStripHtml}
        <p class="timeline-tab-subtitle" id="timeline-active-subtitle">
          ${escapeHtml(activeSummary)}
        </p>
      </div>

      ${highlightBannerHtml}

      <ol class="timeline-list" id="timeline-items-list" aria-live="polite">
        ${timelineItemsHtml}
      </ol>
    </article>
  `;
}

/**
 * Builds the HTML for a single player's avatar or monogram fallback (#07 • AR)
 * Supports large trading-card showcase mode (`isShowcase = true`) for the Squad Grid
 */
export function buildPlayerAvatarHtml(player, { isShowcase = false } = {}) {
  const initials = getInitials(player.name);
  const number = escapeHtml(player.number || '00');
  const wrapClass = isShowcase ? 'player-avatar-wrap player-avatar-wrap--showcase' : 'player-avatar-wrap';
  const imgSize = isShowcase ? 220 : 78;

  const monogramMarkup = `
    <div class="player-monogram" aria-label="${escapeHtml(player.name)} Monogram">
      <span class="monogram-initials">${escapeHtml(initials)}</span>
      <span class="monogram-badge tabular-nums">#${number} • ${escapeHtml(initials)}</span>
    </div>
  `;

  if (!player.photo) {
    return `<div class="${wrapClass}">${monogramMarkup}</div>`;
  }

  return `
    <div class="${wrapClass}" data-initials="${escapeHtml(initials)}" data-number="${number}">
      <img
        src="${escapeHtml(player.photo)}"
        alt="${escapeHtml(player.name)}"
        class="player-avatar-img js-player-photo"
        loading="lazy"
        decoding="async"
        width="${imgSize}"
        height="${imgSize}"
      />
      <span class="player-jersey-pill tabular-nums">#${number}</span>
    </div>
  `;
}

/**
 * Renders the filtered Squad Grid from data/players.json with graceful degradation
 */
export function renderSquadView(players = [], filterState = { status: 'current', role: 'All' }, container) {
  if (!container) return;

  const filtered = players.filter(p => {
    const statusMatch = (p.status || 'current').toLowerCase() === filterState.status.toLowerCase();
    const roleMatch = filterState.role === 'All' || (p.role || '').toLowerCase() === filterState.role.toLowerCase();
    return statusMatch && roleMatch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bento-card" style="grid-column: 1 / -1; text-align: center; padding: var(--space-8);">
        <p style="font-size: var(--text-base); font-weight: 700;">No players match this filter</p>
        <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-top: 4px;">
          Try switching the role chip above to view more Garden State Strikers.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(player => {
    const socials = player.socials || {};
    const socialKeys = Object.keys(socials).filter(k => Boolean(socials[k]));

    const socialPillsHtml = socialKeys.map(platform => {
      const icon = ICONS[platform] || ICONS.sparkle;
      const label = platform === 'x'
        ? 'X'
        : platform === 'youtube'
          ? 'YouTube'
          : platform === 'cricclubs'
            ? 'CricClubs'
            : 'IG';
      return `
        <button
          type="button"
          class="social-pill js-open-social-sheet"
          data-player-id="${escapeHtml(player.id)}"
          data-platform="${escapeHtml(platform)}"
          aria-label="Open ${escapeHtml(player.name)} ${label} spotlight"
        >
          ${icon}
          <span>${label}</span>
        </button>
      `;
    }).join('');

    const footerHtml = socialKeys.length > 0
      ? `
        <div class="player-footer">
          <div class="player-socials" aria-label="${escapeHtml(player.name)} Social Links">
            ${socialPillsHtml}
          </div>
          <button
            type="button"
            class="spotlight-trigger js-open-social-sheet"
            data-player-id="${escapeHtml(player.id)}"
            data-platform="${escapeHtml(socialKeys[0])}"
          >
            <span>Spotlight</span>
          </button>
        </div>
      `
      : `
        <div class="player-footer">
          <span style="font-size:var(--text-xs); color:var(--text-tertiary); font-weight:600;">
            ${escapeHtml(player.badge || 'Club Alumni')}
          </span>
          <button
            type="button"
            class="spotlight-trigger js-open-social-sheet"
            data-player-id="${escapeHtml(player.id)}"
            data-platform="spotlight"
          >
            <span>Player Bio</span>
          </button>
        </div>
      `;

    return `
      <article class="player-card player-card--enlarged" data-player-card-id="${escapeHtml(player.id)}">
        <div class="player-card-showcase">
          ${buildPlayerAvatarHtml(player, { isShowcase: true })}
          <div class="player-identity player-identity--enlarged">
            <div class="player-badges">
              <span class="role-badge">${escapeHtml(player.role)}</span>
              <span class="tenure-badge tabular-nums">${escapeHtml(player.tenure)}</span>
            </div>
            <h2 class="player-name">${escapeHtml(player.name)}</h2>
            <p class="player-subrole">${escapeHtml(player.battingStyle || player.badge || 'Garden State Strikers')}</p>
          </div>
        </div>

        <div class="player-stats player-stats--enlarged" aria-label="${escapeHtml(player.name)} Career Stats">
          <div class="stat-cell">
            <span class="stat-value tabular-nums">${escapeHtml(player.stats?.matches ?? 0)}</span>
            <span class="stat-label">Matches</span>
          </div>
          <div class="stat-cell">
            <span class="stat-value tabular-nums">${escapeHtml(player.stats?.runs ?? 0)}</span>
            <span class="stat-label">Runs</span>
          </div>
          <div class="stat-cell">
            <span class="stat-value tabular-nums">${escapeHtml(player.stats?.wickets ?? 0)}</span>
            <span class="stat-label">Wickets</span>
          </div>
        </div>

        ${footerHtml}
      </article>
    `;
  }).join('');

  // Attach graceful image error fallback handler so cards NEVER show broken image icons
  container.querySelectorAll('.js-player-photo').forEach(img => {
    img.addEventListener('error', () => {
      const wrap = img.closest('.player-avatar-wrap');
      if (!wrap) return;
      const initials = wrap.getAttribute('data-initials') || 'GS';
      const num = wrap.getAttribute('data-number') || '00';
      wrap.innerHTML = `
        <div class="player-monogram" aria-label="Player Monogram">
          <span class="monogram-initials">${escapeHtml(initials)}</span>
          <span class="monogram-badge tabular-nums">#${escapeHtml(num)} • ${escapeHtml(initials)}</span>
        </div>
      `;
    }, { once: true });
  });
}

/**
 * Renders the Matchday & Team Gallery grid from data/gallery.json
 */
export function renderGalleryView(photos = [], activeSeason = 'All', gridContainer, filterContainer) {
  if (!gridContainer) return;

  if (filterContainer && filterContainer.children.length === 0) {
    const seasons = ['All', ...new Set(photos.map(p => p.season).filter(Boolean))];
    filterContainer.innerHTML = seasons.map(season => `
      <button
        type="button"
        class="role-chip js-gallery-season-chip"
        data-season="${escapeHtml(season)}"
        aria-pressed="${season === activeSeason ? 'true' : 'false'}"
      >
        ${escapeHtml(season === 'All' ? 'All Seasons' : season)}
      </button>
    `).join('');
  }

  const filtered = activeSeason === 'All'
    ? photos
    : photos.filter(p => p.season === activeSeason);

  gridContainer.innerHTML = filtered.map((photo, idx) => {
    const isVideo = photo.type === 'video' || Boolean(photo.videoSrc);
    const playOverlayHtml = isVideo
      ? `
        <span class="gallery-video-play-badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <polygon points="8 5 19 12 8 19 8 5"></polygon>
          </svg>
          <span>Play Video</span>
        </span>
      `
      : '';

    return `
    <button
      type="button"
      class="gallery-card js-open-lightbox"
      data-photo-id="${escapeHtml(photo.id)}"
      data-photo-index="${idx}"
      aria-label="${isVideo ? 'Play video' : 'View photo'}: ${escapeHtml(photo.title)}"
    >
      <div class="gallery-media" data-ratio="${escapeHtml(photo.aspectRatio || '4 / 3')}">
        <img
          src="${escapeHtml(photo.src)}"
          alt="${escapeHtml(photo.title)}"
          class="gallery-img"
          loading="lazy"
          decoding="async"
        />
        <span class="gallery-season-tag tabular-nums">${escapeHtml(photo.season)}</span>
        ${playOverlayHtml}
      </div>
      <div class="gallery-body">
        <h2 class="gallery-title">${escapeHtml(photo.title)}</h2>
        <p class="gallery-caption">${escapeHtml(photo.caption)}</p>
        <div class="gallery-meta">
          <span>${escapeHtml(photo.location || 'Mercer County Park, NJ')}</span>
          <span class="tabular-nums">${escapeHtml(photo.date || '')}</span>
        </div>
      </div>
    </button>
  `;
  }).join('');
}

const DEFAULT_LEGAL_SECTIONS = [
  {
    id: 'terms',
    label: 'Terms & Conditions',
    title: 'Terms & Conditions of Use',
    updated: 'Effective Date: 2026 Season',
    clauses: [
      {
        heading: '1. Club Nature & Membership',
        body: 'Garden State Strikers (GSS) is a private, closed recreational cricket club based in New Jersey. Access to this Progressive Web App (PWA) and website is provided for informational purposes for team members, alumni, league officials, and invited supporters. Participation in club practices, net sessions, and league fixtures is strictly by invitation and subject to adherence to our team code of conduct and spirit-of-the-game principles.'
      },
      {
        heading: '2. Intellectual Property & Club Identity',
        body: 'The Garden State Strikers name, shield crest, custom graphics, and written club history are the property of Garden State Strikers. You may not reproduce or use the club crest or branding for commercial purposes, merchandise, or unauthorized representation without prior written consent via info@gardenstatestrikers.org.'
      },
      {
        heading: '3. Accuracy of Match & Statistical Data',
        body: 'All match scores, seasonal timelines, and player career statistics are compiled from official league scorecards hosted on CricClubs (including USCL and Millennium Cricket League). While we strive to keep records accurate, official league portals remain the authoritative record for tournament standings and statistics.'
      }
    ]
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    title: 'Privacy Policy (Zero-Tracking Architecture)',
    updated: 'Effective Date: 2026 Season',
    clauses: [
      {
        heading: '1. Zero Personal Data Collection or Tracking',
        body: 'This website and Progressive Web App operate on a 100% static, serverless architecture. We do not use tracking cookies, advertising pixels, third-party analytics trackers, user login databases, or background telemetry. Your browsing activity on this app is never tracked, profiled, or sold.'
      },
      {
        heading: '2. Local Device Storage & Offline Cache',
        body: 'To provide a fast, native-like experience at cricket grounds with weak cellular reception, your browser stores a local copy of the app shell, roster JSON data, and your Light/Dark mode theme preference (\'gss-theme\' in localStorage) directly on your device. You may clear this local cache at any time through your browser settings.'
      },
      {
        heading: '3. Public Roster & Third-Party Links',
        body: 'Player names, roles, photos, and cricket statistics displayed in the Squad and History views reflect publicly published league participation records on CricClubs. Clicking external links (such as CricClubs scorecards, Apple/Google Maps directions, or social media deep links) will take you to third-party services governed by their own respective privacy policies. To request an update or removal of your profile photo or roster information, contact info@gardenstatestrikers.org.'
      }
    ]
  },
  {
    id: 'disclaimers',
    label: 'Disclaimers',
    title: 'Club Disclaimers, Waivers & Media Notice',
    updated: 'Effective Date: 2026 Season',
    clauses: [
      {
        heading: '1. Recreational Sport & Assumption of Risk',
        body: 'Hard-ball (leather-ball) cricket involves inherent physical risks. All players, guests, and visitors participating in or attending Garden State Strikers matches, net practices, or events at Cedar Brook Park or other league venues do so voluntarily and at their own risk. Garden State Strikers, its founders, captains, and members assume no liability for personal injury, property damage, or loss incurred during matches, practices, or travel.'
      },
      {
        heading: '2. Matchday Photography & Media Consent',
        body: 'Photographs and match highlights featured in the Gallery and Player Spotlight sections capture public league fixtures and club events. If you appear in any club photo and wish to have it credited, updated, or removed, please email info@gardenstatestrikers.org and we will promptly accommodate your request.'
      },
      {
        heading: '3. Non-Commercial Recreational Club',
        body: 'Garden State Strikers operates strictly as a community and recreational sporting group. This site does not process payments, sell tickets, or conduct commercial e-commerce transactions.'
      }
    ]
  }
];

/**
 * Renders the unified Club Info, Contact & Legal iOS Bottom Sheet (<dialog>) triggered from the top header (ⓘ) button
 */
export function renderLegalSheet(clubData, container, activeSectionId = 'terms') {
  if (!container) return;

  const safeClub = clubData || {};
  const legal = safeClub.legal || {};
  const email = legal.email || safeClub.contactEmail || 'info@gardenstatestrikers.org';
  const copyright = legal.copyright || '© 2026 Garden State Strikers Cricket Club • New Jersey';
  const sections = (legal.sections && legal.sections.length > 0) ? legal.sections : DEFAULT_LEGAL_SECTIONS;
  const selectedSection = sections.find(s => s.id === activeSectionId) || sections[0];
  if (!selectedSection) return;

  const tabsHtml = sections.map(sec => {
    const isActive = sec.id === selectedSection.id;
    return `
      <button
        type="button"
        class="timeline-tab-btn js-legal-tab-btn"
        role="tab"
        data-legal-tab="${escapeHtml(sec.id)}"
        aria-selected="${isActive ? 'true' : 'false'}"
        aria-pressed="${isActive ? 'true' : 'false'}"
      >
        ${escapeHtml(sec.label)}
      </button>
    `;
  }).join('');

  const clausesHtml = (selectedSection.clauses || []).map(clause => `
    <div class="legal-clause-card">
      <h4 class="legal-clause-heading">${escapeHtml(clause.heading)}</h4>
      <p class="legal-clause-body">${escapeHtml(clause.body)}</p>
    </div>
  `).join('');

  container.innerHTML = `
    <!-- Top Contact Card inside the Info Bottom Sheet -->
    <div class="welcome-contact-bar">
      <div class="welcome-contact-info">
        <span class="welcome-contact-kicker">Official Club Contact</span>
        <a href="mailto:${escapeHtml(email)}" class="welcome-contact-email">
          ${ICONS.mail}
          <span>${escapeHtml(email)}</span>
        </a>
      </div>
      <div class="welcome-contact-actions">
        <a
          href="mailto:${escapeHtml(email)}?subject=Connecting%20with%20Garden%20State%20Strikers"
          class="btn-action btn-action--primary"
          style="padding: 8px 14px; font-size: var(--text-xs);"
        >
          ${ICONS.mail}
          <span>Send Email</span>
        </a>
        <button
          type="button"
          class="btn-action btn-action--secondary js-copy-email"
          data-email="${escapeHtml(email)}"
          aria-label="Copy club email address"
          style="padding: 8px 14px; font-size: var(--text-xs);"
        >
          ${ICONS.copy}
          <span>Copy Email</span>
        </button>
      </div>
    </div>

    <!-- Segmented Legal Tabs (Terms & Conditions | Privacy Policy | Disclaimers) -->
    <div class="timeline-segmented-tabs" role="tablist" aria-label="Legal Document Sections" style="max-width: 100%;">
      ${tabsHtml}
    </div>

    <div class="legal-section-header">
      <h3 class="legal-section-title">${escapeHtml(selectedSection.title)}</h3>
      <span class="legal-section-updated">${escapeHtml(selectedSection.updated || '')}</span>
    </div>

    <div class="legal-clauses-list">
      ${clausesHtml}
    </div>

    <p style="text-align: center; font-size: var(--text-xs); color: var(--text-tertiary); padding-top: var(--space-2);">
      ${escapeHtml(copyright)}
    </p>
  `;
}
