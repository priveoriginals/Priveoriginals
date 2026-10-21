document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const View = {
    page: document.getElementById("cc-view"),
    meta: document.querySelector(".cc-meta"),
    origin: location.origin,
    currentUrl: location.href,
    profile: {}
  };

  if (!View.page || !View.meta) {
    return;
  }

  const State = {
    workFilter: "all",
    workVisible: 6,
    workReady: null,
    workDataCache: new Map(),
    feedCache: new Map(),
    ccProfileCache: new Map()
  };

  const Helper = {
    text(root, selector) {
      const element = root.querySelector(selector);
      return element ? element.textContent.trim() : "";
    },

    all(root, selector) {
      return Array.from(root.querySelectorAll(selector));
    },

    attr(root, selector, name = "src") {
      const element = root.querySelector(selector);
      return element ? (element.getAttribute(name) || "").trim() : "";
    },

    isValidUrl(value) {
      if (!value) return false;
      try {
        const url = new URL(value, location.href);
        return !!url.href;
      } catch (error) {
        return false;
      }
    },

    normalize(url) {
      return (url || "")
        .replace(View.origin, "")
        .replace("?m=1", "")
        .replace(/\/$/, "")
        .trim();
    },

    escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    stripHtml(html) {
      if (!html) return "";
      const div = document.createElement("div");
      div.innerHTML = html;
      return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
    },

    slugify(value) {
      return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    },

    titleFromSlug(value) {
      const slug = String(value || "")
        .replace(/[-_]+/g, " ")
        .trim();
      if (!slug) return "";
      return slug
        .split(" ")
        .filter(Boolean)
        .map(function (word) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
    },

    formatDate(value) {
      if (!value) return "";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(date);
    },

    placeholder(label, width = 900, height = 1200) {
      const safeLabel = String(label || "FLIXYAN");
      const initials = safeLabel
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(function (item) {
          return item.charAt(0);
        })
        .join("")
        .slice(0, 2)
        .toUpperCase() || "FX";

      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#11131d"/>
              <stop offset="55%" stop-color="#2b2148"/>
              <stop offset="100%" stop-color="#7c3aed"/>
            </linearGradient>
            <radialGradient id="r" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity=".10"/>
              <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
          <circle cx="${width * 0.76}" cy="${height * 0.22}" r="${Math.min(width, height) * 0.18}" fill="url(#r)"/>
          <circle cx="${width * 0.18}" cy="${height * 0.78}" r="${Math.min(width, height) * 0.12}" fill="rgba(255,255,255,.05)"/>
          <text x="50%" y="47%" text-anchor="middle" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(26, Math.min(width, height) / 4.8)}" font-weight="700">${Helper.escapeHtml(initials)}</text>
          <text x="50%" y="58%" text-anchor="middle" fill="rgba(255,255,255,.78)" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(12, Math.min(width, height) / 14)}" font-weight="600">${Helper.escapeHtml(safeLabel)}</text>
        </svg>
      `.trim();

      return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    },

    show(element) {
      if (element) element.style.display = "";
    },

    hide(element) {
      if (element) element.style.display = "none";
    }
  };

  View.profile = parseHiddenProfile();

  const Module = {
    Hero: {},
    About: {},
    Social: {},
    Work: {},
    News: {},
    Related: {},
    SEO: {},
    Init: {}
  };

  function parseHiddenProfile() {
    const root = View.meta;

    const profile = {
      id: Helper.slugify(Helper.text(root, ".cc-id")),
      type: Helper.text(root, ".cc-type"),
      name: Helper.text(root, ".cc-name"),
      profession: Helper.text(root, ".cc-profession"),
      photo: Helper.text(root, ".cc-photo"),
      cover: Helper.text(root, ".cc-cover"),
      about: Helper.text(root, ".cc-about"),
      instagram: Helper.text(root, ".cc-instagram"),
      facebook: Helper.text(root, ".cc-facebook"),
      twitter: Helper.text(root, ".cc-twitter"),
      youtube: Helper.text(root, ".cc-youtube"),
      threads: Helper.text(root, ".cc-threads"),
      newsLabel: Helper.text(root, ".cc-news-label"),
      workItems: []
    };

    const workNodes = Helper.all(root, ".cc-work-item");
    workNodes.forEach(function (node) {
      const type = Helper.slugify(Helper.text(node, ".cc-work-type")) || "series";
      const id = Helper.slugify(Helper.text(node, ".cc-work-id"));
      const role = Helper.text(node, ".cc-work-role");

      if (!id) return;

      profile.workItems.push({
        type: type === "movies" ? "movies" : "series",
        id: id,
        role: role
      });
    });

    if (!profile.workItems.length) {
      Helper.all(root, ".cc-work").forEach(function (node) {
        const raw = Helper.text(node);
        const parts = raw.split(",").map(function (item) {
          return item.trim();
        }).filter(Boolean);

        parts.forEach(function (part) {
          profile.workItems.push({
            type: "series",
            id: Helper.slugify(part),
            role: ""
          });
        });
      });
    }

    if (!profile.id) {
      profile.id = profile.name ? Helper.slugify(profile.name) : "";
    }

    return profile;
  }

  function setMetaDescription(text) {
    let meta = document.querySelector('meta[name="description"]');
    const description = Helper.stripHtml(text || "").trim();

    if (!description) return;

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }

    meta.setAttribute("content", description);
  }

  function buildProfileUrl(slug) {
    const url = new URL(location.href);
    url.searchParams.set("id", slug);
    return `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
  }

  function parseCcProfileFromPost(post) {
    const html = post?.content?.$t || "";
    if (!html || !html.includes("cc-meta")) return null;

    const doc = new DOMParser().parseFromString(html, "text/html");
    const q = function (selector) {
      return doc.querySelector(selector)?.textContent.trim() || "";
    };

    const id = Helper.slugify(q(".cc-id"));
    if (!id) return null;

    const profile = {
      slug: id,
      id: id,
      type: q(".cc-type"),
      name: q(".cc-name") || Helper.titleFromSlug(id),
      profession: q(".cc-profession"),
ai: Helper.text(root, ".cc-ai") === "true",
      photo: q(".cc-photo"),
      cover: q(".cc-cover"),
      about: q(".cc-about"),
      instagram: q(".cc-instagram"),
      facebook: q(".cc-facebook"),
      twitter: q(".cc-twitter"),
      youtube: q(".cc-youtube"),
      threads: q(".cc-threads"),
      newsLabel: q(".cc-news-label"),
      url: post?.link?.find(function (item) {
        return item.rel === "alternate";
      })?.href || buildProfileUrl(id)
    };

    return profile;
  }

  function parseWorkPost(post) {
    const html = post?.content?.$t || "";
    const doc = new DOMParser().parseFromString(html, "text/html");

    const q = function (selector) {
      return doc.querySelector(selector)?.textContent.trim() || "";
    };

    const img = function (selector) {
      return doc.querySelector(selector)?.getAttribute("src") || "";
    };

    const firstImage = doc.querySelector("img")?.getAttribute("src") || "";

    const id = Helper.slugify(
      q(".series-id") ||
      q(".movie-id") ||
      Helper.stripHtml(post?.title?.$t || "")
    );

    const title = q(".series-title") ||
      q(".movie-title") ||
      q(".content-title") ||
      Helper.titleFromSlug(id) ||
      Helper.stripHtml(post?.title?.$t || "");

    const poster = q(".series-poster") ||
      q(".movie-poster") ||
      q(".series-banner") ||
      q(".movie-banner") ||
      img(".series-poster img") ||
      img(".movie-poster img") ||
      firstImage ||
      Helper.placeholder(title, 900, 1200);

    const description = q(".series-description") ||
      q(".movie-description") ||
      q(".content-description") ||
      Helper.stripHtml(post?.summary?.$t || "");

    const year = q(".series-year") || q(".movie-year") || "";
    const url = post?.link?.find(function (item) {
      return item.rel === "alternate";
    })?.href || "#";

    const members = [];

    doc.querySelectorAll(
      ".series-cast-member, .series-crew-member, .movie-cast-member, .movie-crew-member"
    ).forEach(function (node) {
      const name = node.querySelector(".cast-name, .crew-name")?.textContent.trim() || "";
      const role = node.querySelector(".cast-role, .crew-role")?.textContent.trim() || "";
      if (!name) return;

      members.push({
        name: name,
        role: role,
        slug: Helper.slugify(name)
      });
    });

    return {
      id: id,
      title: title,
      poster: poster,
      description: description,
      year: year,
      url: url,
      members: members,
      raw: html
    };
  }

  async function fetchFeedPage(label, startIndex = 1, maxResults = 100) {
    const cacheKey = `${label || "all"}:${startIndex}:${maxResults}`;
    if (State.feedCache.has(cacheKey)) {
      return State.feedCache.get(cacheKey);
    }

    const endpoint = label
      ? `${View.origin}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=${maxResults}&start-index=${startIndex}`
      : `${View.origin}/feeds/posts/default?alt=json&max-results=${maxResults}&start-index=${startIndex}`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);

      const data = await response.json();
      const posts = Array.isArray(data?.feed?.entry) ? data.feed.entry : [];
      State.feedCache.set(cacheKey, posts);
      return posts;
    } catch (error) {
      console.error("Feed Error:", label || "all", error);
      State.feedCache.set(cacheKey, []);
      return [];
    }
  }

  async function resolveWorkItem(item) {
    const cacheKey = `${item.type}:${item.id}`;
    if (State.workDataCache.has(cacheKey)) {
      return State.workDataCache.get(cacheKey);
    }

    const label = item.type === "movies" ? "movies" : "series";
    const target = Helper.slugify(item.id);
    const pageSize = 100;
    const maxPages = 60;

    let found = null;

    for (let page = 1; page <= maxPages; page++) {
      const startIndex = 1 + (page - 1) * pageSize;
      const posts = await fetchFeedPage(label, startIndex, pageSize);

      if (!posts.length) break;

      for (const post of posts) {
        const parsed = parseWorkPost(post);
        if (Helper.slugify(parsed.id) === target) {
          found = parsed;
          break;
        }
      }

      if (found || posts.length < pageSize) {
        break;
      }
    }

    if (!found) {
      found = {
        id: item.id,
        title: Helper.titleFromSlug(item.id),
        poster: Helper.placeholder(item.id, 900, 1200),
        description: "",
        year: "",
        url: "#",
        members: []
      };
    }

    found.type = item.type;
    found.role = item.role || "";
    State.workDataCache.set(cacheKey, found);
    return found;
  }

  async function preloadWorkItems() {
    const tasks = View.profile.workItems.map(function (item) {
      return resolveWorkItem(item);
    });

    await Promise.all(tasks);
  }

  function buildWorkCard(work, item) {
    const href = work.url || "#";
    const title = work.title || Helper.titleFromSlug(item.id);
    const role = item.role || "";
    const poster = work.poster || Helper.placeholder(title, 900, 1200);

    return `
      <a href="${Helper.escapeHtml(href)}" class="cc-work-item" data-type="${Helper.escapeHtml(item.type)}" data-id="${Helper.escapeHtml(item.id)}" title="${Helper.escapeHtml(title)}">
        <div class="cc-work-thumb">
          <img src="${Helper.escapeHtml(poster)}" alt="${Helper.escapeHtml(title)}" loading="lazy">
        </div>
        <div class="cc-work-info">
          <h3 class="cc-work-title">${Helper.escapeHtml(title)}</h3>
          ${role ? `<p class="cc-work-role">${Helper.escapeHtml(role)}</p>` : ""}
        </div>
      </a>
    `;
  }

  function renderWorkList() {
    const grid = document.querySelector(".cc-work-grid");
    const loadMoreBtn = document.querySelector(".cc-loadmore-btn");
    if (!grid) return;

    const renderId = ++State._workRenderId || 1;
    State._workRenderId = renderId;

    grid.innerHTML = `<div class="cc-work-empty">Loading work list...</div>`;

    State.workReady.then(function () {
      if (State._workRenderId !== renderId) return;

      const filtered = View.profile.workItems.filter(function (item) {
        if (State.workFilter === "all") return true;
        return item.type === State.workFilter;
      });

      const visibleItems = filtered.slice(0, State.workVisible);
      const cards = visibleItems.map(function (item) {
        const data = State.workDataCache.get(`${item.type}:${item.id}`) || {
          id: item.id,
          title: Helper.titleFromSlug(item.id),
          poster: Helper.placeholder(item.id, 900, 1200),
          url: "#"
        };
        return buildWorkCard(data, item);
      });

      if (!cards.length) {
        grid.innerHTML = `<div class="cc-work-empty">No works found.</div>`;
      } else {
        grid.innerHTML = cards.join("");
      }

      if (loadMoreBtn) {
        loadMoreBtn.style.display = filtered.length > State.workVisible ? "" : "none";
        loadMoreBtn.disabled = filtered.length <= State.workVisible;
      }
    }).catch(function (error) {
      console.error("Work render error:", error);
      if (State._workRenderId !== renderId) return;
      grid.innerHTML = `<div class="cc-work-empty">Unable to load work list.</div>`;
      if (loadMoreBtn) {
        loadMoreBtn.style.display = "none";
      }
    });
  }

  function attachWorkEvents() {
    const tabs = Helper.all(document, ".cc-tab");
    const loadMoreBtn = document.querySelector(".cc-loadmore-btn");

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        const filter = (tab.dataset.filter || "all").toLowerCase();

        tabs.forEach(function (item) {
          item.classList.remove("is-active");
        });

        tab.classList.add("is-active");
        State.workFilter = filter;
        State.workVisible = 6;
        renderWorkList();
      });
    });

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", function () {
        State.workVisible += 6;
        renderWorkList();
      });
    }
  }

  function renderHero() {
    const hero = document.querySelector(".cc-hero");
    const breadcrumbCurrent = document.querySelector(".cc-current-name");
    const heroName = document.querySelector(".cc-name");
    const profession = document.querySelector(".cc-profession");
    const image = document.querySelector(".cc-hero-image");
    const imageWrap = document.querySelector(".cc-hero-image-wrap");

const aiBadge=document.querySelector(".cc-ai-badge");

    const name = View.profile.name || Helper.titleFromSlug(View.profile.id);
    const title = name || "Cast & Crew";

    if (breadcrumbCurrent) breadcrumbCurrent.textContent = title;
    if (heroName) heroName.textContent = title;
    if (profession) {
      profession.textContent = View.profile.profession || "";
      profession.style.display = View.profile.profession ? "" : "none";
    }

    if (image) {
      const src = Helper.isValidUrl(View.profile.photo)
        ? View.profile.photo
        : Helper.placeholder(title, 900, 1200);
      image.src = src;
      image.alt = title;
    }

    if (imageWrap && !View.profile.photo) {
      imageWrap.classList.add("has-placeholder");
    }

if(aiBadge){

aiBadge.style.display=View.profile.ai ? "inline-flex" : "none";

}
    document.title = `${title}${View.profile.profession ? " | " + View.profile.profession : ""} | Cast & Crew`;

    if (hero && Helper.isValidUrl(View.profile.cover)) {
      hero.style.background = `
        linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)),
        radial-gradient(circle at top right, rgba(124,58,237,.18), transparent 35%),
        url("${View.profile.cover}")
      `;
      hero.style.backgroundSize = "cover, cover, cover";
      hero.style.backgroundPosition = "center, center, center";
    }
  }

  function setSocialLink(anchor, url, label) {
    if (!anchor) return;

    if (Helper.isValidUrl(url)) {
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.setAttribute("aria-label", label);
      Helper.show(anchor);
    } else {
      Helper.hide(anchor);
    }
  }

  function renderSocials() {
    const socialWrap = document.querySelector(".cc-socials");

    const socials = [
      { selector: ".cc-instagram-link", url: View.profile.instagram, label: "Instagram" },
      { selector: ".cc-facebook-link", url: View.profile.facebook, label: "Facebook" },
      { selector: ".cc-twitter-link", url: View.profile.twitter, label: "Twitter" },
      { selector: ".cc-youtube-link", url: View.profile.youtube, label: "YouTube" },
      { selector: ".cc-threads-link", url: View.profile.threads, label: "Threads" }
    ];

    let visibleCount = 0;

    socials.forEach(function (item) {
      const anchor = document.querySelector(item.selector);
      if (!anchor) return;

      if (Helper.isValidUrl(item.url)) {
        setSocialLink(anchor, item.url, item.label);
        visibleCount += 1;
      } else {
        Helper.hide(anchor);
      }
    });

    if (socialWrap) {
      socialWrap.style.display = visibleCount ? "" : "none";
    }
  }

  function renderAbout() {
    const aboutCard = document.querySelector(".cc-about-card");
    const content = document.querySelector(".cc-about-content");
    const text = document.querySelector(".cc-about-text");
    const button = document.querySelector(".cc-readmore-btn");

    if (!aboutCard || !content || !text) return;

    const aboutText = (View.profile.about || "").trim();
    const safeAbout = aboutText || "No biography available yet.";

    text.textContent = safeAbout;

    const isExpandable = aboutText.length > 260;
    if (!isExpandable) {
      content.classList.remove("is-collapsed", "is-expanded");
      if (button) button.style.display = "none";
      return;
    }

    content.classList.add("is-collapsed");
    content.classList.remove("is-expanded");

    if (button) {
      button.style.display = "";
      button.textContent = "Read More";
      button.addEventListener("click", function () {
  const expanded = content.classList.toggle("is-expanded");
  content.classList.toggle("is-collapsed", !expanded);
  button.textContent = expanded ? "Read Less" : "Read More";
});
    }
const notice=document.querySelector(".cc-ai-notice");

if(notice){

notice.style.display=View.profile.ai ? "block":"none";

}
  }



  async function initNews() {
    const section = document.querySelector(".cc-news-card");
    const list = document.querySelector(".cc-news-list");
    const viewAll = document.querySelector(".cc-news-viewall");

    if (!section || !list) return;

    const label = (View.profile.newsLabel || "").trim();
    if (!label) {
      Helper.hide(section);
      return;
    }

    if (viewAll) {
      viewAll.href = `/p/news.html?category=Celebrity&value=${encodeURIComponent(label)}`;
    }

    const posts = await fetchFeedPage(label, 1, 5);

    if (!posts.length) {
      Helper.hide(section);
      return;
    }

    const cards = posts.slice(0, 5).map(function (post) {
      const url = post?.link?.find(function (item) {
        return item.rel === "alternate";
      })?.href || "#";

      const title = Helper.stripHtml(post?.title?.$t || "") || "Untitled";
      
const html = post?.content?.$t || "";
const doc = new DOMParser().parseFromString(html, "text/html");

const description =
  (doc.querySelector(".news-short-desc")?.textContent || "").trim() ||
  Helper.stripHtml(html).slice(0, 180);

      const date = Helper.formatDate(post?.published?.$t || post?.updated?.$t);
      const category = "Celebrity";

let thumb =
  doc.querySelector(".news-image")?.textContent.trim() || "";

if (!thumb) {
  thumb = post?.media$thumbnail?.url || "";
}

if (!thumb) {
  thumb = doc.querySelector("img")?.getAttribute("src") || "";
}

if (!thumb) {
  thumb = Helper.placeholder(title, 1600, 900);
}

      return `
        <a href="${Helper.escapeHtml(url)}" class="cc-news-item">
          <div class="cc-news-thumb">
            <img src="${Helper.escapeHtml(thumb)}" alt="${Helper.escapeHtml(title)}" loading="lazy">
          </div>
          <div class="cc-news-info">
            <span class="cc-news-category">${Helper.escapeHtml(category)}</span>
            <h3 class="cc-news-title">${Helper.escapeHtml(title)}</h3>
            <p class="cc-news-desc">${Helper.escapeHtml(description || title)}</p>
            <div class="cc-news-date">
              <i class="fa-regular fa-calendar"></i>
              <span>${Helper.escapeHtml(date)}</span>
            </div>
          </div>
        </a>
      `;
    });

    list.innerHTML = cards.join("");
  }

  function collectRelatedCandidates() {
    const counts = new Map();
    const currentSlug = View.profile.id || Helper.slugify(View.profile.name);

    State.workDataCache.forEach(function (work) {
      (work.members || []).forEach(function (member) {
        const slug = Helper.slugify(member.slug || member.name);
        if (!slug || slug === currentSlug) return;

        if (!counts.has(slug)) {
          counts.set(slug, {
            slug: slug,
            name: member.name,
            count: 0
          });
        }

        counts.get(slug).count += 1;
      });
    });

    return Array.from(counts.values())
      .sort(function (a, b) {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }

  async function findCcProfiles(targets) {
    const pending = new Set(targets.map(function (item) {
      return item.slug;
    }));

    const found = new Map();
    const pageSize = 100;
    const maxPages = 80;

    for (let page = 1; page <= maxPages && pending.size; page++) {
      const startIndex = 1 + (page - 1) * pageSize;
      const posts = await fetchFeedPage(null, startIndex, pageSize);

      if (!posts.length) break;

      for (const post of posts) {
        const profile = parseCcProfileFromPost(post);
        if (!profile) continue;

        if (pending.has(profile.slug)) {
          found.set(profile.slug, profile);
          pending.delete(profile.slug);
        }
      }

      if (posts.length < pageSize) {
        break;
      }
    }

    return found;
  }

  function renderRelatedProfiles(profiles) {
    const section = document.querySelector(".cc-related-card");
    const grid = document.querySelector(".cc-related-list");
    const viewAll = document.querySelector(".cc-related-viewall");

    if (!section || !grid) return;

    if (viewAll) {
      viewAll.href = "/p/cast-crew.html";
    }

    if (!profiles.length) {
      Helper.hide(section);
      return;
    }

    const cards = profiles.map(function (profile) {
      const name = profile.name || Helper.titleFromSlug(profile.slug);
      const href = profile.url || buildProfileUrl(profile.slug);
      const photo = Helper.isValidUrl(profile.photo)
        ? profile.photo
        : Helper.placeholder(name, 700, 700);

      return `
        <a href="${Helper.escapeHtml(href)}" class="cc-related-item">
          <div class="cc-related-thumb">
            <img src="${Helper.escapeHtml(photo)}" alt="${Helper.escapeHtml(name)}" loading="lazy">
          </div>
          <div class="cc-related-info">
            <h3 class="cc-related-name">${Helper.escapeHtml(name)}</h3>
          </div>
        </a>
      `;
    });

    grid.innerHTML = cards.join("");
  }

  async function initRelated() {
    const section = document.querySelector(".cc-related-card");
    if (!section) return;

    await State.workReady;

    const candidates = collectRelatedCandidates();
    if (!candidates.length) {
      Helper.hide(section);
      return;
    }

    const profilesMap = await findCcProfiles(candidates);
    const profiles = candidates.map(function (candidate) {
      return profilesMap.get(candidate.slug) || {
        slug: candidate.slug,
        name: candidate.name,
        url: buildProfileUrl(candidate.slug),
        photo: Helper.placeholder(candidate.name, 700, 700)
      };
    });

    renderRelatedProfiles(profiles);
  }

  async function initWorkSection() {
    const workCard = document.querySelector(".cc-work-card");
    if (!workCard) return;

    const tabs = Helper.all(document, ".cc-tab");
    const loadMoreBtn = document.querySelector(".cc-loadmore-btn");

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        const filter = (tab.dataset.filter || "all").toLowerCase();

        tabs.forEach(function (item) {
          item.classList.remove("is-active");
        });

        tab.classList.add("is-active");
        State.workFilter = filter;
        State.workVisible = 6;
        renderWorkList();
      });
    });

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", function () {
        State.workVisible += 6;
        renderWorkList();
      });
    }

    State.workReady = preloadWorkItems();
    renderWorkList();
    await State.workReady;
  }

  function setupHeroData() {
    renderHero();
    renderSocials();
    renderAbout();
    setMetaDescription(View.profile.about || `${View.profile.name || "Cast & Crew"} profile, works, news and related members.`);
  }

  Module.Init.boot = async function () {
    setupHeroData();
    await Promise.all([
      initWorkSection(),
      initNews()
    ]);
    await initRelated();
  };

  Module.Init.boot().catch(function (error) {
    console.error("CC View init error:", error);
  });
});
