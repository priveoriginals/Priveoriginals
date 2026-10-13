/*=========================================
VIDEO VIEW
v8.0
PART 1/6
FOUNDATION
=========================================*/

document.addEventListener("DOMContentLoaded", function () {
"use strict";

/*=========================================
ROOT
=========================================*/

const View = {
  page: document.getElementById("video-view"),
  meta: document.querySelector(".video-meta"),
  origin: location.origin,
  currentUrl: "",
  video: {},
  feedCache: new Map(),
  parsedCache: new WeakMap()
};

if (!View.page || !View.meta) {
  return;
}

/*=========================================
HELPERS
=========================================*/

const Helper = {
  text(selector) {
    const element = View.meta.querySelector(selector);
    return element ? element.textContent.trim() : "";
  },

  image(selector) {
    const element = View.meta.querySelector(selector);
    return element ? element.getAttribute("src") || "" : "";
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

  safeAttr(value) {
    return Helper.escapeHtml(value).replace(/`/g, "&#96;");
  },

  show(element) {
    if (element) {
      element.style.display = "";
    }
  },

  hide(element) {
    if (element) {
      element.style.display = "none";
    }
  }
};

/*=========================================
CURRENT URL
=========================================*/

View.currentUrl = Helper.normalize(location.href);

/*=========================================
CURRENT VIDEO
=========================================*/

View.video = {
  contentType: Helper.text(".content-type"),
  contentTypeUrl: Helper.text(".content-type-url"),
  contentTitle: Helper.text(".content-title"),
  contentUrl: Helper.text(".content-url"),
  type: Helper.text(".video-type"),
  title: Helper.text(".video-title"),
  cardTitle: Helper.text(".video-card-title"),
  season: Helper.text(".video-season"),
  id: Helper.text(".video-id"),
  description: Helper.text(".video-description"),
  releaseDate: Helper.text(".video-release-date"),
  duration: Helper.text(".video-duration"),
  language: Helper.text(".video-language"),
  rating: Helper.text(".video-rating"),
  youtubeId: Helper.text(".video-youtube-id"),
  labels: Helper.text(".video-labels"),
  navigationLabel: Helper.text(".video-navigation-label"),
  featured: Helper.text(".video-featured"),
  highlight: Helper.text(".video-highlight"),
  thumbnail: Helper.image(".video-thumbnail")
};

/*=========================================
CONFIG
=========================================*/

const CONFIG = {
  LATEST_LABEL: "latestvideo",
  LATEST_LIMIT: 10,
  RELATED_LIMIT: 12,
  NAVIGATION_LIMIT: 500,
  IGNORE_LABELS: ["latest", "latestvideo", "featured"],
  FETCH_TIMEOUT_MS: 10000
};

/*=========================================
MODULES
=========================================*/

const Module = {
  Player: {},
  Breadcrumb: {},
  Meta: {},
  Share: {},
  Feed: {},
  Card: {},
  Navigation: {},
  Related: {},
  Latest: {},
  Init: {}
};

/*=========================================
UTILITIES FOR LATER PARTS
=========================================*/

Module.Utils = {
  isNonEmpty(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  },

  getPostUrl(post) {
    return (
      post?.link?.find(function (item) {
        return item.rel === "alternate";
      })?.href || ""
    );
  },

  getImageFallback(src) {
    return src || "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  }
};

/*=========================================
VIDEO VIEW
v8.0
PART 2/6
PLAYER + BREADCRUMB + META
=========================================*/

/*=========================================
PLAYER
=========================================*/

Module.Player.init = function () {
  const section = document.querySelector(".vp-player-section");
  const player = document.getElementById("vp-youtube-player");

  if (!player) {
    return;
  }

  if (!View.video.youtubeId) {
    Helper.hide(section);
    return;
  }

  const videoId = encodeURIComponent(View.video.youtubeId);
  const title = Helper.safeAttr(View.video.title || "Video");

  player.innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1"
      title="${title}"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen>
    </iframe>
  `;
};

/*=========================================
BREADCRUMB
=========================================*/

Module.Breadcrumb.init = function () {
  const type = document.querySelector(".vp-content-type-link");
  const content = document.querySelector(".vp-content-link");
  const current = document.querySelector(".vp-video-title");

  if (type) {
    type.textContent = View.video.contentType;
    type.href = View.video.contentTypeUrl || "#";
  }

  if (content) {
    content.textContent = View.video.contentTitle;
    content.href = View.video.contentUrl || "#";
  }

  if (current) {
    current.textContent = View.video.title;
  }
};

/*=========================================
DESCRIPTION
=========================================*/

Module.Meta.description = function () {
  const section = document.querySelector(".vp-description-section");
  const text = document.querySelector(".vp-description");

  if (!section || !text) {
    return;
  }

  if (!View.video.description) {
    Helper.hide(section);
    return;
  }

  text.textContent = View.video.description;
  Helper.show(section);
};

/*=========================================
META FIELD
=========================================*/

Module.Meta.field = function (selector, value) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  if (!value) {
    Helper.hide(element);
    return;
  }

  element.textContent = value;
  Helper.show(element);
};

/*=========================================
META INFO
=========================================*/

Module.Meta.info = function () {
  Module.Meta.field(".vp-release-date", View.video.releaseDate);
  Module.Meta.field(".vp-duration", View.video.duration);
  Module.Meta.field(".vp-language", View.video.language);
  Module.Meta.field(".vp-rating", View.video.rating);
};

/*=========================================
VIDEO VIEW
v8.0
PART 3/6
SHARE + FEED ENGINE
=========================================*/

/*=========================================
SHARE
=========================================*/

Module.Share.init = function () {
  const button = document.querySelector(".vp-share-button");

  if (!button) {
    return;
  }

  button.addEventListener("click", Module.Share.share);
};

Module.Share.share = async function () {
  const data = {
    title: `${View.video.contentTitle} - ${View.video.title}`,
    text: View.video.description || "",
    url: location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (error) {
      // User cancelled or share failed; fallback below
    }
  }

  Module.Share.copy();
};

Module.Share.copy = async function () {
  try {
    await navigator.clipboard.writeText(location.href);
    Module.Share.toast("Link copied successfully.");
  } catch (error) {
    const input = document.createElement("input");
    input.value = location.href;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";

    document.body.appendChild(input);
    input.select();

    try {
      document.execCommand("copy");
      Module.Share.toast("Link copied successfully.");
    } catch (copyError) {
      window.prompt("Copy Link", location.href);
    } finally {
      document.body.removeChild(input);
    }
  }
};

Module.Share.toast = function (message) {
  let toast = document.getElementById("vp-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "vp-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
};

/*=========================================
FEED ENGINE
=========================================*/

Module.Feed.load = async function (label, limit = 500) {
  if (!label) {
    return [];
  }

  if (View.feedCache.has(label)) {
    return View.feedCache.get(label);
  }

  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, CONFIG.FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${View.origin}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=${limit}`,
      {
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(`Feed request failed: ${response.status}`);
    }

    const data = await response.json();
    const posts = Array.isArray(data?.feed?.entry) ? data.feed.entry : [];

    View.feedCache.set(label, posts);
    return posts;
  } catch (error) {
    console.error("Feed Error:", label, error);
    return [];
  } finally {
    clearTimeout(timer);
  }
};

Module.Feed.parse = function (post) {
  if (View.parsedCache.has(post)) {
    return View.parsedCache.get(post);
  }

  const html = post?.content?.$t || "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const value = function (selector) {
    return doc.querySelector(selector)?.textContent.trim() || "";
  };

  const image = function (selector) {
    return doc.querySelector(selector)?.getAttribute("src") || "";
  };

  const item = {
    contentType: value(".content-type"),
    contentTypeUrl: value(".content-type-url"),
    contentTitle: value(".content-title"),
    contentUrl: value(".content-url"),
    type: value(".video-type"),
    title: value(".video-title"),
    cardTitle: value(".video-card-title"),
    season: value(".video-season"),
    id: value(".video-id"),
    description: value(".video-description"),
    releaseDate: value(".video-release-date"),
    duration: value(".video-duration"),
    language: value(".video-language"),
    rating: value(".video-rating"),
    youtubeId: value(".video-youtube-id"),
    labels: value(".video-labels"),
    navigationLabel: value(".video-navigation-label"),
    featured: value(".video-featured"),
    highlight: value(".video-highlight"),
    thumbnail: image(".video-thumbnail"),
    url:
      post?.link?.find(function (item) {
        return item.rel === "alternate";
      })?.href || "#"
  };

  View.parsedCache.set(post, item);
  return item;
};

Module.Feed.items = function (posts) {
  return posts.map(function (post) {
    return Module.Feed.parse(post);
  });
};

Module.Feed.current = function (posts) {
  return (
    posts.find(function (post) {
      const url = Helper.normalize(Module.Utils.getPostUrl(post));
      return url === View.currentUrl;
    }) || null
  );
};

Module.Feed.filter = function (posts, type) {
  return posts.filter(function (post) {
    return Module.Feed.parse(post).type === type;
  });
};

Module.Feed.index = function (posts, url) {
  return posts.findIndex(function (post) {
    const link = Helper.normalize(Module.Utils.getPostUrl(post));
    return link === url;
  });
};

/*=========================================
VIDEO VIEW
v8.0
PART 4/6
CARD ENGINE
=========================================*/

/*=========================================
CARD TITLE
=========================================*/

Module.Card.title = function (item) {

  if (item.cardTitle) {
    return item.cardTitle;
  }

  if (item.type === "episode") {

    const season =
      item.season || "1";

    const episode =
      String(item.id || "1")
      .padStart(2,"0");

    return `S${season} EP ${episode}`;

  }

  if(item.type==="movie"){

      return "Movie";

  }

  return item.title || "";

};

/*=========================================
CARD IMAGE
=========================================*/

Module.Card.image = function (item) {
  return item.thumbnail || "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
};

/*=========================================
BUILD CARD
=========================================*/

Module.Card.build = function (item, style, heading = "") {
  const url = Helper.safeAttr(item.url || "#");
  const thumb = Helper.safeAttr(Module.Card.image(item));
  const alt = Helper.safeAttr(Module.Card.title(item));
  const duration = Helper.escapeHtml(item.duration || "");
  const contentTitle = Helper.escapeHtml(item.contentTitle || "");
  const cardTitle = Helper.escapeHtml(Module.Card.title(item));
  const safeHeading = Helper.escapeHtml(heading || "");

  /*=========================================
  NAVIGATION
  =========================================*/

  if (style === "navigation") {
    return `
      <a href="${url}" class="vp-nav-card">
        <div class="vp-nav-thumb">
          <img src="${thumb}" alt="${alt}" loading="lazy">
          <span class="vp-nav-duration">${duration}</span>
        </div>
        <div class="vp-nav-content">
          <span class="vp-nav-heading">${safeHeading}</span>
          <h3 class="vp-nav-series">${contentTitle}</h3>
          <p class="vp-nav-title">${cardTitle}</p>
        </div>
      </a>
    `;
  }

  /*=========================================
  RELATED
  =========================================*/

  if (style === "related") {

  const description =
Helper.escapeHtml(
item.description ||
"No description available."
);

  return `
    <a href="${url}" class="vp-related-card">

      <div class="vp-related-thumb">

        <img
          src="${thumb}"
          alt="${alt}"
          loading="lazy">

        <span>${duration}</span>

      </div>

      <div class="vp-related-info">

        <h3>
          ${contentTitle}
        </h3>

        <h4>
          ${cardTitle}
        </h4>

        <p>
          ${description}
        </p>

      </div>

    </a>
  `;

}

  /*=========================================
  LATEST
  =========================================*/

  return `

<a href="${url}" class="vp-latest-card">

<div class="vp-latest-thumb">

<img
src="${thumb}"
alt="${alt}"
loading="lazy">

<div class="vp-play-icon">

<i class="fa-solid fa-play"></i>

</div>

<span>${duration}</span>

</div>

<div class="vp-latest-info">

<h3>

${contentTitle}

</h3>

<p>

${cardTitle}

</p>

</div>

</a>

`;

/*=========================================
RENDER
=========================================*/

Module.Card.render = function (container, items, style, heading = "") {
  if (!container || !items || !items.length) {
    return;
  }

  container.innerHTML = items
    .map(function (item) {
      return Module.Card.build(item, style, heading);
    })
    .join("");
};

/*=========================================
VIDEO VIEW
v8.0
PART 5/6
NAVIGATION + RELATED + LATEST
=========================================*/

/*=========================================
NAVIGATION
=========================================*/

Module.Navigation.init = async function () {

  const section = document.querySelector(".vp-navigation");
  const previous = document.getElementById("vp-previous");
  const next = document.getElementById("vp-next");

previous.classList.remove("empty");
next.classList.remove("empty");

  if (
    !section ||
    !previous ||
    !next ||
    !View.video.navigationLabel
  ) {
    Helper.hide(section);
    return;
  }

  let posts = await Module.Feed.load(
    View.video.navigationLabel,
    CONFIG.NAVIGATION_LIMIT
  );

  posts = Module.Feed.filter(
    posts,
    View.video.type
  );

  const index = Module.Feed.index(
    posts,
    View.currentUrl
  );

  if (index === -1) {
    Helper.hide(section);
    return;
  }

  previous.innerHTML = "";
  next.innerHTML = "";

previous.classList.add("empty");
next.classList.add("empty");

  /*=========================================
  PREVIOUS
  =========================================*/

  if (index < posts.length - 1) {

    previous.innerHTML = Module.Card.build(
      Module.Feed.parse(posts[index + 1]),
      "navigation",
      "Previous"
    );
previous.classList.remove("empty");
  }

  /*=========================================
  NEXT
  =========================================*/

  if (index > 0) {

    next.innerHTML = Module.Card.build(
      Module.Feed.parse(posts[index - 1]),
      "navigation",
      "Next"
    );

  }

  if (
    !previous.innerHTML &&
    !next.innerHTML
  ) {
    Helper.hide(section);
  }
next.classList.remove("empty");
};

/*=========================================
RELATED
=========================================*/

Module.Related.init = async function () {

  const section =
    document.querySelector(".vp-related");

  const list =
    document.getElementById("vp-related-list");

  if (
    !section ||
    !list
  ) {
    return;
  }

  const label = View.video.labels
    .split(",")
    .map(function (item) {
      return item.trim();
    })
    .find(function (item) {

      return (
        item &&
        !CONFIG.IGNORE_LABELS.includes(
          item.toLowerCase()
        )
      );

    });

  if (!label) {
    Helper.hide(section);
    return;
  }

  const posts = await Module.Feed.load(
    label,
    CONFIG.RELATED_LIMIT
  );

  const items = [];

  posts.forEach(function (post) {

    const item =
      Module.Feed.parse(post);

    if (
      Helper.normalize(item.url) !==
        View.currentUrl &&
      item.type ===
        View.video.type
    ) {
      items.push(item);
    }

  });

  if (!items.length) {
    Helper.hide(section);
    return;
  }

  Module.Card.render(
    list,
    items,
    "related"
  );

};

/*=========================================
LATEST
=========================================*/

Module.Latest.init = async function () {

  const section =
    document.querySelector(".vp-latest");

  const list =
    document.getElementById("vp-latest-list");

  if (
    !section ||
    !list
  ) {
    return;
  }

  const posts = await Module.Feed.load(
    CONFIG.LATEST_LABEL,
    CONFIG.LATEST_LIMIT
  );

  const items = [];

  posts.forEach(function (post) {

    const item =
      Module.Feed.parse(post);

    if (
      Helper.normalize(item.url) !==
      View.currentUrl
    ) {
      items.push(item);
    }

  });
items.splice(8);

  if (!items.length) {
    Helper.hide(section);
    return;
  }

  Module.Card.render(
    list,
    items,
    "latest"
  );

};

/*=========================================
VIDEO VIEW
v8.0
PART 6/6
INIT + CLEANUP
=========================================*/

/*=========================================
INIT
=========================================*/

Module.Init.boot = async function () {
  Module.Player.init();
  Module.Breadcrumb.init();
  Module.Meta.description();
  Module.Meta.info();
  Module.Share.init();

  await Promise.all([
    Module.Navigation.init(),
    Module.Related.init(),
    Module.Latest.init()
  ]);
};

/*=========================================
START
=========================================*/

Module.Init.boot();
});