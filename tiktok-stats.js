function formatCompactNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  if (value >= 1000000000) return (value / 1000000000).toFixed(1).replace('.0', '') + 'Md';
  if (value >= 1000000) return (value / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(value);
}

function initialsFromUsername(username) {
  const clean = username.replace(/[^a-zA-Z0-9]/g, '');
  return (clean.slice(0, 2) || 'BS').toUpperCase();
}

async function fetchTikTokStats(username) {
  const endpoint = 'https://www.tikwm.com/api/user/info?unique_id=' + encodeURIComponent(username);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const response = await fetch(endpoint, { signal: controller.signal });
  clearTimeout(timeout);
  if (!response.ok) throw new Error('bad response');
  const json = await response.json();
  if (!json || json.code !== 0 || !json.data || !json.data.user || !json.data.stats) {
    throw new Error('unexpected payload');
  }
  return {
    avatar: json.data.user.avatarLarger || json.data.user.avatarMedium || json.data.user.avatarThumb || '',
    followers: json.data.stats.followerCount,
    likes: json.data.stats.heartCount,
    following: json.data.stats.followingCount,
    videos: json.data.stats.videoCount
  };
}

async function refreshCreatorCard(card) {
  const username = card.getAttribute('data-username');
  if (!username) return;

  const avatarSlot = card.querySelector('[data-role="avatar"]');
  const followersSlot = card.querySelector('[data-role="followers"]');
  const likesSlot = card.querySelector('[data-role="likes"]');
  const followingSlot = card.querySelector('[data-role="following"]');
  const videosSlot = card.querySelector('[data-role="videos"]');
  const statusSlot = card.querySelector('[data-role="status"]');
  const fallbackSlot = card.querySelector('[data-role="fallback"]');

  try {
    const stats = await fetchTikTokStats(username);

    if (stats.avatar) {
      avatarSlot.innerHTML = '';
      const img = document.createElement('img');
      img.src = stats.avatar;
      img.alt = 'Photo de profil TikTok de ' + username;
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => { avatarSlot.textContent = initialsFromUsername(username); };
      avatarSlot.appendChild(img);
    }

    if (followersSlot) { followersSlot.textContent = formatCompactNumber(stats.followers); followersSlot.classList.remove('is-loading'); }
    if (likesSlot) { likesSlot.textContent = formatCompactNumber(stats.likes); likesSlot.classList.remove('is-loading'); }
    if (followingSlot) { followingSlot.textContent = formatCompactNumber(stats.following); followingSlot.classList.remove('is-loading'); }
    if (videosSlot) { videosSlot.textContent = formatCompactNumber(stats.videos); videosSlot.classList.remove('is-loading'); }

    if (fallbackSlot) fallbackSlot.classList.remove('is-visible');
    if (statusSlot) {
      const now = new Date();
      const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      statusSlot.textContent = 'Mis à jour à ' + time;
    }
  } catch (err) {
    if (fallbackSlot) fallbackSlot.classList.add('is-visible');
    if (statusSlot) statusSlot.textContent = 'Actualisation indisponible';
    [followersSlot, likesSlot, followingSlot, videosSlot].forEach(slot => {
      if (slot && slot.textContent === '—') slot.classList.remove('is-loading');
    });
    avatarSlot.textContent = avatarSlot.textContent.trim() || initialsFromUsername(username);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('[data-tiktok-card]');
  if (!cards.length) return;
  cards.forEach(card => {
    refreshCreatorCard(card);
    setInterval(() => refreshCreatorCard(card), 60000);
  });
});
