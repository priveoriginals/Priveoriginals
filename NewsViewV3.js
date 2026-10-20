/*==================================================
NEWS VIEW JS v2.0
FULL FIXED VERSION
==================================================*/

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const NewsView = {
    feed: [],
    posts: [],
    current: {},
    article: {},
    loaded: false,
    feedURL: "/feeds/posts/default/-/news?alt=json&max-results=500",
  };

  initNewsView();

  async function initNewsView() {
    await Promise.all([loadCurrentMetadata(), loadFeed()]);
    cacheFeedPosts();

    renderMainNews();
    initShareControls();
    renderRelatedNews();
    renderTrendingNews();
    renderLatestNews();
    initStaticLinks();
    buildArticleData();
  }

  /*==================================
  LOAD BLOGGER FEED
  ==================================*/

  async function loadFeed() {
    try {
      const res = await fetch(NewsView.feedURL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Feed request failed: ${res.status}`);
      const json = await res.json();
      NewsView.feed = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];
    } catch (err) {
      console.error("News Feed Error:", err);
      NewsView.feed = [];
    } finally {
      NewsView.loaded = true;
    }
  }

  /*==================================
  READ CURRENT PAGE METADATA
  ==================================*/

  async function loadCurrentMetadata() {
    const metaRoot = document.getElementById("news-metadata");

    if (!metaRoot) {
      NewsView.current = getEmptyCurrentMeta();
      return;
    }

    const meta = (name) => {
      const el = metaRoot.querySelector("." + name);
      return el ? cleanText(el.textContent) : "";
    };

    NewsView.current = {
      title: document.title || "",
      url: normalizeUrl(location.href),
      image: meta("news-image"),
      imageAlt: meta("news-image-alt"),
      shortDesc: meta("news-short-desc"),
      content: meta("news-content"),
      celebrity: meta("news-celebrity"),
      category: meta("news-category"),
      categoryLink: meta("news-category-link"),
      badge: meta("news-badge"),
      trending: meta("news-trending"),
      featured: meta("news-featured"),
      summary: meta("news-summary"),
      published: meta("news-published"),
      updated: meta("news-updated"),
    };
  }

  function getEmptyCurrentMeta() {
    return {
      title: document.title || "",
      url: normalizeUrl(location.href),
      image: "",
      imageAlt: "",
      shortDesc: "",
      content: "",
      celebrity: "",
      category: "",
      categoryLink: "",
      badge: "",
      trending: "",
      featured: "",
      summary: "",
      published: "",
      updated: "",
    };
  }

  /*==================================
  FEED PARSING
  ==================================*/

  function cacheFeedPosts() {
    NewsView.posts = NewsView.feed.map(parsePost);
  }

  function parsePost(post) {
    const html = post?.content?.$t || "";
    return {
      title: cleanText(post?.title?.$t || ""),
      url: normalizeUrl(getLink(post)),
      image: getImage(post),
      imageAlt: cleanText(post?.title?.$t || ""),
      shortDesc: getMeta(html, "news-short-desc") || getMeta(html, "news-summary"),
      content: getMeta(html, "news-content"),
      celebrity: getMeta(html, "news-celebrity"),
      category: getMeta(html, "news-category"),
      categoryLink: getMeta(html, "news-category-link"),
      badge: getMeta(html, "news-badge"),
      trending: getMeta(html, "news-trending"),
      featured: getMeta(html, "news-featured"),
      summary: getMeta(html, "news-summary"),
      published: getMeta(html, "news-published") || extractPublished(post),
      updated: getMeta(html, "news-updated") || extractUpdated(post),
      author: extractAuthor(post),
      html,
    };
  }

  function getMeta(html, className) {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    const el = doc.querySelector("." + className);
    return el ? cleanText(el.textContent) : "";
  }

  function extractAuthor(post) {
    const author =
      Array.isArray(post?.author) && post.author.length
        ? post.author[0]?.name?.$t || ""
        : "";
    return cleanText(author);
  }

  function extractPublished(post) {
    return post?.published?.$t || post?.published || "";
  }

  function extractUpdated(post) {
    return post?.updated?.$t || post?.updated || "";
  }

  /*==================================
  HELPERS
  ==================================*/

  function getImage(post) {
    if (post?.media$thumbnail?.url) {
      return post.media$thumbnail.url.replace("/s72-c/", "/s1200/");
    }

    return (
      NewsView.current.image ||
      "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi/default.jpg"
    );
  }

  function getLink(post) {
    const link = Array.isArray(post?.link)
      ? post.link.find((x) => x.rel === "alternate")
      : null;

    return link ? link.href : "#";
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return cleanText(dateString);

    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function cleanText(text) {
    return text ? String(text).replace(/\s+/g, " ").trim() : "";
  }

  function splitTags(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function normalizeUrl(url) {
    if (!url) return "";
    try {
      return new URL(url, location.origin).href.split("?")[0];
    } catch {
      return String(url).split("?")[0];
    }
  }

  function isCurrentPost(post) {
    return normalizeUrl(post?.url) === normalizeUrl(NewsView.current.url);
  }

  function createBadgeElement(text) {
    const value = cleanText(text);
    if (!value) return null;

    const span = document.createElement("span");
    span.className = "nv-badge";
    span.textContent = value;
    return span;
  }

  function createImage(src, alt, fallbackSrc) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = src || fallbackSrc;
    img.alt = alt || "";
    img.onerror = function () {
      this.onerror = null;
      this.src = fallbackSrc;
    };
    return img;
  }

  function clear(el) {
    if (el) el.innerHTML = "";
  }

  function limit(arr, count) {
    return arr.slice(0, count);
  }

  function sortByScore(arr) {
    return arr.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  function isTruthyTag(value) {
    const v = String(value || "").trim().toLowerCase();
    return ["yes", "true", "1", "on"].includes(v);
  }

  function escapeHTML(text) {
    return String(text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getMatchScore(post) {
    let score = 0;

    const currentContentTags = splitTags(NewsView.current.content);
    const currentCelebrityTags = splitTags(NewsView.current.celebrity);
    const currentCategory = cleanText(NewsView.current.category).toLowerCase();

    const postContentTags = splitTags(post.content);
    const postCelebrityTags = splitTags(post.celebrity);
    const postCategory = cleanText(post.category).toLowerCase();

    currentContentTags.forEach((tag) => {
      if (postContentTags.includes(tag)) score += 5;
    });

    currentCelebrityTags.forEach((tag) => {
      if (postCelebrityTags.includes(tag)) score += 3;
    });

    if (currentCategory && currentCategory === postCategory) {
      score += 2;
    }

    return score;
  }

  function getReadTime() {
    const article = document.querySelector(".nv-article");
    if (!article) return "";

    const text = cleanText(article.innerText || article.textContent || "");
    const words = text ? text.split(" ").filter(Boolean).length : 0;
    const mins = Math.max(1, Math.ceil(words / 200));
    return `${mins} min read`;
  }

  /*==================================
  MAIN ARTICLE
  ==================================*/

  function renderMainNews() {
    const data = NewsView.current || {};
    const fallbackImage =
      data.image ||
      "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi/default.jpg";

    const image = document.getElementById("news-image");
    if (image) {
      image.src = data.image || fallbackImage;
      image.alt = data.imageAlt || data.title || "";
      image.onerror = function () {
        this.onerror = null;
        this.src = fallbackImage;
      };
    }

    const title = document.querySelector(".nv-title");
    if (title) title.textContent = data.title || "";

    const badge = document.querySelector(".nv-badge");
    if (badge) {
      if (data.badge) {
        badge.textContent = data.badge;
        badge.style.display = "inline-flex";
      } else {
        badge.remove();
      }
    }

    const breadcrumb = document.querySelector(".nv-breadcrumb");
    if (breadcrumb) {
      const categoryText = data.category || "News";
      breadcrumb.innerHTML = `
        <a href="/">Home</a>
        <span class="nv-divider">/</span>
        <a class="nv-breadcrumb-category" href="${data.categoryLink || "#"}">${escapeHTML(categoryText)}</a>
        <span class="nv-divider">/</span>
        <span>${escapeHTML(data.title || "")}</span>
      `;
    }

    const meta = document.querySelector(".nv-meta");
    if (meta) {
      const publishedText = formatDate(data.published);
      const authorText = getCurrentAuthor();
      const readTimeText = getReadTime();
      const pieces = [];

      if (publishedText) pieces.push(`<span>${escapeHTML(publishedText)}</span>`);
      if (authorText) pieces.push(`<span>${escapeHTML(authorText)}</span>`);
      if (readTimeText) pieces.push(`<span>${escapeHTML(readTimeText)}</span>`);

      meta.innerHTML = pieces.join('<span class="nv-divider">•</span>');
    }

    const share = document.querySelector(".nv-share");
    if (share) {
      share.innerHTML = `
        <span class="nv-share-title">Share</span>
        <button type="button" class="nv-share-btn" data-share="native" aria-label="Share">↗</button>
        <button type="button" class="nv-share-btn" data-share="whatsapp" aria-label="Share on WhatsApp">WA</button>
        <button type="button" class="nv-share-btn" data-share="facebook" aria-label="Share on Facebook">F</button>
        <button type="button" class="nv-share-btn" data-share="twitter" aria-label="Share on X">X</button>
        <button type="button" class="nv-share-btn" data-share="telegram" aria-label="Share on Telegram">TG</button>
        <button type="button" class="nv-share-btn" data-share="copy" aria-label="Copy link">⧉</button>
      `;
    }

    document.title = data.title ? `${data.title}` : document.title;
  }

  function getCurrentAuthor() {
    const currentPost = NewsView.posts.find((item) => isCurrentPost(item));
    return currentPost?.author || "";
  }

  /*==================================
  SHARE + COPY
  ==================================*/

  function initShareControls() {
    const nativeBtn = document.querySelector(".nv-share-button");
    if (nativeBtn) nativeBtn.addEventListener("click", shareNews);

    const copyBtn = document.querySelector(".nv-copy-link");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await copyToClipboard(NewsView.current.url);
          copyBtn.classList.add("copied");
          const oldText = copyBtn.innerHTML;
          copyBtn.innerHTML = "Copied";

          setTimeout(() => {
            copyBtn.classList.remove("copied");
            copyBtn.innerHTML = oldText || "Copy Link";
          }, 2000);
        } catch (e) {
          console.error("Copy failed:", e);
        }
      });
    }

    document.querySelectorAll("[data-share]").forEach((btn) => {
      btn.addEventListener("click", function () {
        handleShareAction(this.dataset.share);
      });
    });
  }

  async function shareNews() {
    const data = {
      title: NewsView.current.title || document.title || "",
      text: NewsView.current.shortDesc || "",
      url: NewsView.current.url || location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        // ignore
      }
    }

    try {
      await copyToClipboard(data.url);
      alert("Link Copied");
    } catch (e) {
      console.error("Share fallback failed:", e);
    }
  }

  function handleShareAction(type) {
    const shareURL = NewsView.current.url || location.href;
    const shareTitle = NewsView.current.title || document.title || "";

    if (type === "facebook") {
      window.open(
        "https://www.facebook.com/sharer/sharer.php?u=" +
          encodeURIComponent(shareURL),
        "_blank",
        "noopener,noreferrer"
      );
    }

    if (type === "twitter") {
      window.open(
        "https://twitter.com/intent/tweet?url=" +
          encodeURIComponent(shareURL) +
          "&text=" +
          encodeURIComponent(shareTitle),
        "_blank",
        "noopener,noreferrer"
      );
    }

    if (type === "whatsapp") {
      window.open(
        "https://wa.me/?text=" +
          encodeURIComponent(shareTitle + " " + shareURL),
        "_blank",
        "noopener,noreferrer"
      );
    }

    if (type === "telegram") {
      window.open(
        "https://t.me/share/url?url=" +
          encodeURIComponent(shareURL) +
          "&text=" +
          encodeURIComponent(shareTitle),
        "_blank",
        "noopener,noreferrer"
      );
    }

    if (type === "copy") {
      copyToClipboard(shareURL)
        .then(() => {
          const btn = document.querySelector('[data-share="copy"]');
          if (!btn) return;
          const oldText = btn.innerHTML;
          btn.innerHTML = "Copied";
          setTimeout(() => {
            btn.innerHTML = oldText || "Copy Link";
          }, 1500);
        })
        .catch((e) => console.error("Copy failed:", e));
    }

    if (type === "native") {
      shareNews();
    }
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  /*==================================
  CARD CREATION
  ==================================*/

  function createPostCard(post, prefix, fallbackImage) {
    const a = document.createElement("a");
    a.className = `${prefix}-card`;
    a.href = post.url || "#";

    const thumb = document.createElement("div");
    thumb.className = `${prefix}-thumb`;

    const img = createImage(post.image, post.title, fallbackImage);
    thumb.appendChild(img);

    const badge = createBadgeElement(post.badge);
    if (badge) thumb.appendChild(badge);

    const info = document.createElement("div");
    info.className = `${prefix}-info`;

    const h3 = document.createElement("h3");
    h3.textContent = post.category || "";

    const h4 = document.createElement("h4");
    h4.textContent = post.title || "";

    const p = document.createElement("p");
    p.textContent = post.shortDesc || "";

    info.appendChild(h3);
    info.appendChild(h4);
    info.appendChild(p);

    a.appendChild(thumb);
    a.appendChild(info);

    return a;
  }

  function renderCardList(wrap, posts, prefix) {
    if (!wrap) return;
    clear(wrap);

    const fallbackImage =
      NewsView.current.image ||
      "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi/default.jpg";

    posts.forEach((post) => {
      wrap.appendChild(createPostCard(post, prefix, fallbackImage));
    });
  }

  /*==================================
  RELATED NEWS
  ==================================*/

  function renderRelatedNews() {
    const wrap = document.getElementById("related-news");
    if (!wrap) return;

    let posts = [];

    NewsView.posts.forEach((item) => {
      if (isCurrentPost(item)) return;
      const post = { ...item, score: getMatchScore(item) };
      posts.push(post);
    });

    posts = sortByScore(posts).filter((post) => (post.score || 0) > 0);

    if (!posts.length) {
      posts = NewsView.posts.filter((item) => !isCurrentPost(item));
    }

    posts = limit(posts, 5);
    renderCardList(wrap, posts, "nv-related");

    const viewAll = document.querySelector(".nv-related-viewall");
    if (viewAll && NewsView.current.categoryLink) {
      viewAll.href = NewsView.current.categoryLink;
    }
  }

  /*==================================
  TRENDING NEWS
  ==================================*/

  function renderTrendingNews() {
    const wrap = document.getElementById("trending-news");
    if (!wrap) return;

    let posts = NewsView.posts.filter((item) => {
      if (isCurrentPost(item)) return false;
      return isTruthyTag(item.trending);
    });

    posts = limit(posts, 5);
    renderCardList(wrap, posts, "nv-side");

    const viewAll = document.querySelector(".nv-trending-viewall");
    if (viewAll) {
      viewAll.href = "/p/news.html?trending=yes";
    }
  }

  /*==================================
  LATEST NEWS
  ==================================*/

  function renderLatestNews() {
    const wrap = document.getElementById("latest-news");
    if (!wrap) return;

    const posts = limit(
      NewsView.posts.filter((item) => !isCurrentPost(item)),
      6
    );

    renderCardList(wrap, posts, "nv-side");

    const viewAll = document.querySelector(".nv-latest-viewall");
    if (viewAll) {
      viewAll.href = "/p/news.html";
    }
  }

  /*==================================
  SCHEMA / DATA OBJECT
  ==================================*/

  function buildArticleData() {
    NewsView.article = {
      headline: NewsView.current.title || "",
      image: NewsView.current.image || "",
      description: NewsView.current.shortDesc || "",
      category: NewsView.current.category || "",
      published: NewsView.current.published || "",
      updated: NewsView.current.updated || "",
      url: NewsView.current.url || location.href,
    };
  }

  function initStaticLinks() {
    const latestViewAll = document.querySelector(".nv-latest-viewall");
    if (latestViewAll) latestViewAll.href = "/p/news.html";

    const trendingViewAll = document.querySelector(".nv-trending-viewall");
    if (trendingViewAll) trendingViewAll.href = "/p/news.html?trending=yes";
  }
});
