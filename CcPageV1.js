document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const LABEL = "castcrew";
  const PAGE_SIZE = 12;

  const View = {
    page: document.getElementById("cc-list"),
    grid: document.getElementById("cc-grid"),
    empty: document.getElementById("cc-empty"),
    loader: document.getElementById("cc-loader"),
    pagination: document.getElementById("cc-pagination"),
    filterButtons: Array.from(document.querySelectorAll(".cc-filter-btn")),
    origin: location.origin,
    currentUrl: location.href
  };

  if (!View.page || !View.grid || !View.pagination) {
    return;
  }

  const State = {
    allItems: [],
    filteredItems: [],
    currentFilter: "all",
    currentPage: 1,
    totalPages: 1,
    loading: false
  };

  const Helper = {
    text(root, selector) {
      const element = root.querySelector(selector);
      return element ? element.textContent.trim() : "";
    },

    escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    slugify(value) {
      return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    },

    normalizeRole(value) {
      return Helper.slugify(value);
    },

    normalizeUrl(url) {
      return (url || "")
        .replace(View.origin, "")
        .replace("?m=1", "")
        .replace(/\/$/, "")
        .trim();
    },

    show(el) {
      if (el) el.style.display = "";
    },

    hide(el) {
      if (el) el.style.display = "none";
    },

    placeholder(label, width = 900, height = 1200) {
      const safeLabel = String(label || "FLIXYAN");
      const initials = safeLabel
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(function (part) {
          return part.charAt(0);
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
    }
  };

  function setLoading(isLoading) {
    State.loading = isLoading;
    if (View.loader) {
      View.loader.style.display = isLoading ? "flex" : "none";
    }
  }

  function setEmpty(isEmpty) {
    if (View.empty) {
      View.empty.style.display = isEmpty ? "flex" : "none";
    }
  }

  function parseMember(post) {
    const html = post?.content?.$t || "";
    if (!html || !html.includes("cc-meta")) return null;

    const doc = new DOMParser().parseFromString(html, "text/html");
    const q = function (selector) {
      return doc.querySelector(selector)?.textContent.trim() || "";
    };

    const name = q(".cc-name");
    const profession = q(".cc-profession");
    const photo = q(".cc-photo");
    const url =
      post?.link?.find(function (item) {
        return item.rel === "alternate";
      })?.href || "#";

    if (!name) return null;

    return {
      name: name,
      profession: profession || "Unknown",
      professionKey: Helper.normalizeRole(profession || ""),
      photo: photo || "",
      url: url,
      date:
        post?.published?.$t ||
        post?.updated?.$t ||
        ""
    };
  }

  async function fetchFeedPage(label, startIndex = 1, maxResults = 100) {
    const endpoint = label
      ? `${View.origin}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=${maxResults}&start-index=${startIndex}`
      : `${View.origin}/feeds/posts/default?alt=json&max-results=${maxResults}&start-index=${startIndex}`;

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Feed request failed: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data?.feed?.entry) ? data.feed.entry : [];
  }

  async function loadAllMembers() {
    setLoading(true);
    setEmpty(false);

    const pageSize = 100;
    const maxPages = 80;
    const items = [];

    try {
      for (let page = 1; page <= maxPages; page++) {
        const startIndex = 1 + (page - 1) * pageSize;
        const posts = await fetchFeedPage(LABEL, startIndex, pageSize);

        if (!posts.length) break;

        posts.forEach(function (post) {
          const member = parseMember(post);
          if (member) {
            items.push(member);
          }
        });

        if (posts.length < pageSize) {
          break;
        }
      }

      items.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

      State.allItems = items;
    } catch (error) {
      console.error("Cast/Crew feed error:", error);
      State.allItems = [];
    } finally {
      setLoading(false);
    }
  }

  function getFilteredItems() {
    if (State.currentFilter === "all") {
      return State.allItems;
    }

    return State.allItems.filter(function (item) {
      return item.professionKey === State.currentFilter;
    });
  }

  function getTotalPages(items) {
    return Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  }

  function clampPage(page, totalPages) {
    const next = Number(page) || 1;
    return Math.min(Math.max(next, 1), totalPages);
  }

  function getPageItems(items, page) {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }

  function buildCard(item) {
    const name = item.name || "Untitled";
    const role = item.profession || "";
    const photo = item.photo || Helper.placeholder(name, 900, 1200);

    return `
      <a href="${Helper.escapeHtml(item.url || "#")}" class="cc-card">
        <div class="cc-thumb">
          <img src="${Helper.escapeHtml(photo)}" alt="${Helper.escapeHtml(name)}" loading="lazy">
        </div>
        <div class="cc-info">
          <h3 class="cc-name">${Helper.escapeHtml(name)}</h3>
          <p class="cc-role">${Helper.escapeHtml(role)}</p>
        </div>
      </a>
    `;
  }

  function renderGrid() {
    const filtered = getFilteredItems();
    State.totalPages = getTotalPages(filtered);
    State.currentPage = clampPage(State.currentPage, State.totalPages);

    const pageItems = getPageItems(filtered, State.currentPage);

    if (!pageItems.length) {
      View.grid.innerHTML = "";
      setEmpty(true);
      renderPagination();
      return;
    }

    setEmpty(false);
    View.grid.innerHTML = pageItems.map(buildCard).join("");
    renderPagination();
  }

  function createUrl(page, filter) {
    const url = new URL(location.href);

    if (filter && filter !== "all") {
      url.searchParams.set("profession", filter);
    } else {
      url.searchParams.delete("profession");
    }

    if (page && page > 1) {
      url.searchParams.set("page", String(page));
    } else {
      url.searchParams.delete("page");
    }

    return url.toString();
  }

  function buildPageRange(current, total) {
    if (total <= 9) {
      return Array.from({ length: total }, function (_, index) {
        return index + 1;
      });
    }

    if (current <= 5) {
      return [1, 2, 3, 4, 5, 6, 7, 8, "...", total];
    }

    if (current >= total - 4) {
      return [1, "...", total - 5, total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, "...", current - 2, current - 1, current, current + 1, current + 2, "...", total];
  }

  function renderPagination() {
    const filtered = getFilteredItems();
    const totalPages = getTotalPages(filtered);
    State.totalPages = totalPages;
    State.currentPage = clampPage(State.currentPage, totalPages);

    if (totalPages <= 1) {
      View.pagination.innerHTML = "";
      return;
    }

    const current = State.currentPage;
    const range = buildPageRange(current, totalPages);
    const filter = State.currentFilter;

    let html = "";

    if (current > 1) {
      html += `
        <a class="cc-page-btn" href="${Helper.escapeHtml(createUrl(current - 1, filter))}" aria-label="Previous page">
          Previous
        </a>
      `;
    } else {
      html += `
        <span class="cc-page-btn is-disabled" aria-disabled="true">Previous</span>
      `;
    }

    range.forEach(function (page) {
      if (page === "...") {
        html += `<span class="cc-page-ellipsis">...</span>`;
        return;
      }

      if (page === current) {
        html += `
          <span class="cc-page-btn is-active" aria-current="page">
            ${page}
          </span>
        `;
        return;
      }

      html += `
        <a class="cc-page-btn" href="${Helper.escapeHtml(createUrl(page, filter))}">
          ${page}
        </a>
      `;
    });

    if (current < totalPages) {
      html += `
        <a class="cc-page-btn" href="${Helper.escapeHtml(createUrl(current + 1, filter))}" aria-label="Next page">
          Next
        </a>
      `;
    } else {
      html += `
        <span class="cc-page-btn is-disabled" aria-disabled="true">Next</span>
      `;
    }

    View.pagination.innerHTML = html;
  }

  function setActiveFilterButtons() {
    View.filterButtons.forEach(function (button) {
      const filter = (button.dataset.filter || "all").toLowerCase();
      const active = filter === State.currentFilter;

      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function bindFilterButtons() {
    View.filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const filter = (button.dataset.filter || "all").toLowerCase();
        const url = new URL(location.href);

        if (filter === "all") {
          url.searchParams.delete("profession");
        } else {
          url.searchParams.set("profession", filter);
        }

        url.searchParams.delete("page");
        location.href = url.toString();
      });
    });
  }

  function readInitialState() {
    const params = new URLSearchParams(location.search);
    const requestedFilter = Helper.normalizeRole(params.get("profession") || "all");
    const requestedPage = parseInt(params.get("page") || "1", 10);

    const allowedFilters = new Set([
      "all",
      "director",
      "writer",
      "actor",
      "actress",
      "lyricist"
    ]);

    State.currentFilter = allowedFilters.has(requestedFilter) ? requestedFilter : "all";
    State.currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  }

  async function boot() {
    readInitialState();
    setActiveFilterButtons();
    bindFilterButtons();

    await loadAllMembers();
    renderGrid();
  }

  boot().catch(function (error) {
    console.error("Cast/Crew list page error:", error);
    setLoading(false);
    setEmpty(true);
    View.grid.innerHTML = "";
    View.empty.textContent = "Unable to load cast and crew members.";
    View.empty.style.display = "flex";
  });
});
