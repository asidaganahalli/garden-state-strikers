/**
 * GARDEN STATE STRIKERS PWA — HYBRID IN-APP SOCIAL FEED & PLAYER SPOTLIGHT SHEET
 * Controls the slide-up iOS <dialog> sheet with lazy-loaded YouTube embed & native app deep links.
 */

import { escapeHtml, buildPlayerAvatarHtml } from './renderer.js?v=2.6.0';

/**
 * Resolves deep links and web fallback URLs for Instagram, X, and YouTube
 */
function getSocialLinks(platform, handle) {
  const clean = String(handle || '').replace(/^@/, '').trim();
  switch (platform) {
    case 'instagram':
      return {
        label: 'Instagram',
        handleDisplay: `@${clean}`,
        deepLink: `instagram://user?username=${encodeURIComponent(clean)}`,
        webUrl: `https://www.instagram.com/${encodeURIComponent(clean)}/`
      };
    case 'x':
      return {
        label: 'X (Twitter)',
        handleDisplay: `@${clean}`,
        deepLink: `twitter://user?screen_name=${encodeURIComponent(clean)}`,
        webUrl: `https://x.com/${encodeURIComponent(clean)}`
      };
    case 'youtube':
      return {
        label: 'YouTube',
        handleDisplay: 'Official Channel Highlights',
        deepLink: `vnd.youtube://www.youtube.com/channel/${encodeURIComponent(clean)}`,
        webUrl: `https://www.youtube.com/channel/${encodeURIComponent(clean)}`,
        // Convert UC... channel ID to UU... uploads playlist for reliable unauthenticated iframe embed
        embedUrl: clean.startsWith('UC')
          ? `https://www.youtube-nocookie.com/embed/videoseries?list=UU${encodeURIComponent(clean.slice(2))}&rel=0`
          : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(clean)}?rel=0`
      };
    case 'cricclubs':
      return {
        label: 'CricClubs',
        handleDisplay: `Player ID #${clean}`,
        deepLink: `https://cricclubs.com/MillenniumTwenty20/viewPlayer.do?playerId=${encodeURIComponent(clean)}&clubId=21827`,
        webUrl: `https://cricclubs.com/MillenniumTwenty20/viewPlayer.do?playerId=${encodeURIComponent(clean)}&clubId=21827`
      };
    default:
      return null;
  }
}

export class SocialSheetController {
  constructor({ dialogEl, titleEl, bodyEl, closeBtnEl, onCloseRouteSync }) {
    this.dialog = dialogEl;
    this.titleEl = titleEl;
    this.bodyEl = bodyEl;
    this.closeBtn = closeBtnEl;
    this.onCloseRouteSync = onCloseRouteSync;
    this.activePlayerId = null;

    this._bindEvents();
  }

  _bindEvents() {
    if (!this.dialog) return;

    this.closeBtn?.addEventListener('click', () => this.close());

    // Close when tapping the dimmed backdrop outside the bottom sheet
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) {
        this.close();
      }
    });

    this.dialog.addEventListener('close', () => {
      // Unmount any lazy-loaded iframe on close so audio/video stops immediately
      if (this.bodyEl) {
        const iframes = this.bodyEl.querySelectorAll('iframe');
        iframes.forEach(frame => frame.remove());
      }
      const closedId = this.activePlayerId;
      this.activePlayerId = null;
      if (closedId && typeof this.onCloseRouteSync === 'function') {
        this.onCloseRouteSync(closedId);
      }
    });
  }

  open(player, preferredPlatform = 'spotlight') {
    if (!this.dialog || !player) return;

    this.activePlayerId = player.id;
    this.titleEl.textContent = `${player.name} • #${player.number}`;

    const socials = player.socials || {};
    const availablePlatforms = Object.keys(socials).filter(k => Boolean(socials[k]));
    const activePlatform = socials[preferredPlatform]
      ? preferredPlatform
      : (availablePlatforms[0] || 'spotlight');

    // Build platform switcher pills inside the sheet if player has socials
    const platformTabsHtml = availablePlatforms.length > 0
      ? `
        <div class="role-filter-strip" role="tablist" aria-label="Player Social Channels">
          ${availablePlatforms.map(p => {
            const info = getSocialLinks(p, socials[p]);
            const isSelected = p === activePlatform;
            return `
              <button
                type="button"
                class="role-chip js-sheet-platform-tab"
                data-platform="${escapeHtml(p)}"
                aria-pressed="${isSelected ? 'true' : 'false'}"
              >
                ${escapeHtml(info ? info.label : p)}
              </button>
            `;
          }).join('')}
        </div>
      `
      : '';

    const mediaSectionHtml = this._buildPlatformSection(player, activePlatform);

    this.bodyEl.innerHTML = `
      <!-- Player Spotlight Card (Always rendered to avoid login walls) -->
      <div class="spotlight-banner">
        ${buildPlayerAvatarHtml(player)}
        <div style="min-width:0;">
          <div class="player-badges">
            <span class="role-badge">${escapeHtml(player.role)}</span>
            <span class="badge-pill">${escapeHtml(player.badge || player.tenure)}</span>
          </div>
          <h3 style="font-size:var(--text-lg); font-weight:800; margin-top:2px;">${escapeHtml(player.name)}</h3>
          <p style="font-size:var(--text-xs); color:var(--text-secondary);">
            ${escapeHtml(player.battingStyle || '')}${player.bowlingStyle ? ` • ${escapeHtml(player.bowlingStyle)}` : ''}
          </p>
        </div>
      </div>

      <p style="font-size:var(--text-sm); color:var(--text-secondary); line-height:1.5;">
        ${escapeHtml(player.bio)}
      </p>

      ${player.milestone ? `
        <div class="spotlight-milestone">
          <strong style="color:var(--gss-orange-400); display:block; font-size:var(--text-xs); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px;">
            Club Milestone Highlight
          </strong>
          ${escapeHtml(player.milestone)}
        </div>
      ` : ''}

      <div class="player-stats">
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

      ${platformTabsHtml}

      <div id="sheet-platform-stage">
        ${mediaSectionHtml}
      </div>
    `;

    this._attachAvatarFallback(this.bodyEl);
    this._bindPlatformSwitchers(player);

    if (!this.dialog.open) {
      this.dialog.showModal();
    }
  }

  _buildPlatformSection(player, platform) {
    const socials = player.socials || {};
    const handle = socials[platform];
    const linkInfo = handle ? getSocialLinks(platform, handle) : null;

    // 1. YouTube: Lazy-loaded official iframe embed + native app deep link
    if (platform === 'youtube' && linkInfo) {
      return `
        <div class="social-deeplink-group">
          <div class="embed-frame-wrap" id="yt-lazy-container">
            <iframe
              src="${escapeHtml(linkInfo.embedUrl)}"
              title="${escapeHtml(player.name)} YouTube Highlights"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
          <div class="ground-actions" style="margin-top:var(--space-2);">
            <a
              href="${escapeHtml(linkInfo.deepLink)}"
              class="btn-action btn-action--primary"
            >
              <span>Open YouTube App</span>
            </a>
            <a
              href="${escapeHtml(linkInfo.webUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-action btn-action--secondary"
            >
              <span>Watch on Web</span>
            </a>
          </div>
        </div>
      `;
    }

    // 2. Instagram, X & CricClubs: Player Spotlight Highlight Image + Resilient Native App Deep Link & Web Fallback
    if ((platform === 'instagram' || platform === 'x' || platform === 'cricclubs') && linkInfo) {
      return `
        <div class="social-deeplink-group">
          ${player.highlightImage ? `
            <img
              src="${escapeHtml(player.highlightImage)}"
              alt="${escapeHtml(player.name)} Matchday Highlight"
              class="spotlight-highlight-img"
              loading="lazy"
              decoding="async"
            />
          ` : ''}

          <div class="bento-card" style="padding:var(--space-4); background:rgba(9,8,27,0.6);">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
              <span style="font-size:var(--text-xs); font-weight:700; color:var(--gss-orange-400); text-transform:uppercase;">
                ${escapeHtml(linkInfo.label)} Spotlight
              </span>
              <span style="font-size:var(--text-xs); color:var(--text-secondary); font-weight:600;">
                ${escapeHtml(linkInfo.handleDisplay)}
              </span>
            </div>
            <p style="font-size:var(--text-xs); color:var(--text-tertiary); margin-bottom:var(--space-3);">
              Open ${escapeHtml(player.name)}'s official ${escapeHtml(linkInfo.label)} profile and full match-by-match scorecards.
            </p>
            <div class="ground-actions">
              <a
                href="${escapeHtml(linkInfo.deepLink)}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-action btn-action--primary"
              >
                <span>Open ${escapeHtml(linkInfo.label)}</span>
              </a>
              <a
                href="${escapeHtml(linkInfo.webUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-action btn-action--secondary"
              >
                <span>View on Web</span>
              </a>
            </div>
          </div>
        </div>
      `;
    }

    // 3. Default / Alumni Spotlight (no social profiles configured)
    return `
      <div class="social-deeplink-group">
        ${player.highlightImage ? `
          <img
            src="${escapeHtml(player.highlightImage)}"
            alt="${escapeHtml(player.name)} Matchday Highlight"
            class="spotlight-highlight-img"
            loading="lazy"
            decoding="async"
          />
        ` : ''}
        ${player.cricclubsUrl ? `
          <a
            href="${escapeHtml(player.cricclubsUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-action btn-action--secondary"
            style="width:100%;"
          >
            <span>View Full CricClubs Career Profile</span>
          </a>
        ` : ''}
      </div>
    `;
  }

  _bindPlatformSwitchers(player) {
    const tabs = this.bodyEl.querySelectorAll('.js-sheet-platform-tab');
    const stage = this.bodyEl.querySelector('#sheet-platform-stage');
    if (!tabs.length || !stage) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const nextPlatform = tab.getAttribute('data-platform');
        tabs.forEach(t => t.setAttribute('aria-pressed', t === tab ? 'true' : 'false'));
        stage.innerHTML = this._buildPlatformSection(player, nextPlatform);
      });
    });
  }

  _attachAvatarFallback(root) {
    const img = root.querySelector('.js-player-photo');
    if (!img) return;
    img.addEventListener('error', () => {
      const wrap = img.closest('.player-avatar-wrap');
      if (!wrap) return;
      const initials = wrap.getAttribute('data-initials') || 'GS';
      const num = wrap.getAttribute('data-number') || '00';
      wrap.innerHTML = `
        <div class="player-monogram">
          <span class="monogram-initials">${escapeHtml(initials)}</span>
          <span class="monogram-badge tabular-nums">#${escapeHtml(num)} • ${escapeHtml(initials)}</span>
        </div>
      `;
    }, { once: true });
  }

  close() {
    if (this.dialog && this.dialog.open) {
      this.dialog.close();
    }
  }
}
