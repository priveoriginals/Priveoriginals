/*==================================================
NEWS VIEW JS v2.0
PART 1
FOUNDATION + FEED CACHE + METADATA
==================================================*/

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const NewsView = {
    feed: [],
    posts: [],
    current: {},
    article: {},
    loaded: false,
    feedURL: "/feeds/posts/default/-/news?alt=json&max-results=500"
  };

  window.NewsView = NewsView;

  initNewsView();

  async function initNewsView() {
    await Promise.all([
      loadCurrentMetadata(),
      loadFeed()
    ]);

    cacheFeedPosts();

    renderMainHero();
    initShareControls();
    renderRelatedNews();
    renderLatestNews();
    renderTrendingNews();
    initStaticLinks();
    buildArticleData();
  }

  /*==================================
  LOAD BLOGGER FEED
  ==================================*/

  async function loadFeed() {
    try {
      const res = await fetch(NewsView.feedURL, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`Feed request failed: ${res.status}`);
      }

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
  READ HIDDEN METADATA
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
      title: cleanText(document.title || ""),
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
      featured: meta("news-featured")
    };
  }

  function getEmptyCurrentMeta() {
    return {
      title: cleanText(document.title || ""),
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
      featured: ""
    };
  }

  /*==================================
  CACHE FEED POSTS
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

      shortDesc: getMeta(html, "news-short-desc"),
      content: getMeta(html, "news-content"),
      celebrity: getMeta(html, "news-celebrity"),

      category: getMeta(html, "news-category"),
      categoryLink: getMeta(html, "news-category-link"),

      badge: getMeta(html, "news-badge"),
      trending: getMeta(html, "news-trending"),
      featured: getMeta(html, "news-featured"),

      html,
      published: extractPublished(post),
      updated: extractUpdated(post),
      author: extractAuthor(post),
      labels: extractLabels(post)
    };
  }

  /*==================================
  HELPERS
  ==================================*/

  function getMeta(html, className) {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    const el = doc.querySelector("." + className);
    return el ? cleanText(el.textContent) : "";
  }

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

  function extractPublished(post) {
    return post?.published?.$t || post?.published || "";
  }

  function extractUpdated(post) {
    return post?.updated?.$t || post?.updated || "";
  }

  function extractAuthor(post) {
    if (!Array.isArray(post?.author) || !post.author.length) return "";
    return cleanText(post.author[0]?.name?.$t || "");
  }

  function extractLabels(post) {
    return Array.isArray(post?.category)
      ? post.category.map((x) => cleanText(x.term || "")).filter(Boolean)
      : [];
  }

  function cleanText(text) {
    return text ? String(text).replace(/\s+/g, " ").trim() : "";
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

  function splitTags(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
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

  function formatDate(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return cleanText(dateString);

    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function escapeHTML(text) {
    return String(text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
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

  /*==================================
  MATCH SCORE
  ==================================*/

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

  /*==================================
  ARTICLE DATA
  ==================================*/

  function buildArticleData() {
    NewsView.article = {
      headline: NewsView.current.title || "",
      image: NewsView.current.image || "",
      description: NewsView.current.shortDesc || "",
      category: NewsView.current.category || "",
      published: "",
      updated: "",
      url: NewsView.current.url || location.href
    };
  }

  /*==================================
  STUBS FOR NEXT PARTS
  ==================================*/

  function renderMainHero() {}
  function initShareControls() {}
  function renderRelatedNews() {}
  function renderLatestNews() {}
  function renderTrendingNews() {}
  function initStaticLinks() {}
});

/*==================================
HERO RENDER
==================================*/

function getCurrentPost() {
  return NewsView.posts.find((item) => isCurrentPost(item)) || null;
}

function getReadTime() {
  const article = document.querySelector(".nv-article");
  if (!article) return "1 min read";

  const text = cleanText(article.innerText || article.textContent || "");
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const mins = Math.max(1, Math.ceil(words / 200));

  return `${mins} min read`;
}

function renderMainHero() {
  const data = NewsView.current || {};
  const post = getCurrentPost();

  const fallbackImage =
    data.image ||
    post?.image ||
    "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi/default.jpg";

  /*==================================
  IMAGE
  ==================================*/

  const image = document.getElementById("news-image");
  if (image) {
    image.src = data.image || post?.image || fallbackImage;
    image.alt = data.imageAlt || data.title || post?.title || "";
    image.onerror = function () {
      this.onerror = null;
      this.src = fallbackImage;
    };
  }

  /*==================================
  BADGE
  ==================================*/

  const badge = document.querySelector(".nv-badge");
  if (badge) {
    if (data.badge) {
      badge.textContent = data.badge;
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  }

  /*==================================
  TITLE
  ==================================*/

  const title = document.querySelector(".nv-title");
  if (title) {
    title.textContent = data.title || post?.title || document.title || "";
  }

  /*==================================
  BREADCRUMB
  ==================================*/

  const breadcrumb = document.querySelector(".nv-breadcrumb");
  if (breadcrumb) {
    const category = data.category || post?.category || "News";
    const categoryLink = data.categoryLink || post?.categoryLink || "#";

    breadcrumb.innerHTML = `
      <a href="/">Home</a>
      <span class="nv-divider">/</span>
      <a href="/news.html">News &amp; Gossips</a>
      <span class="nv-divider">/</span>
      <a href="${escapeHTML(categoryLink)}" class="nv-breadcrumb-category">${escapeHTML(category)}</a>
    `;
  }

  /*==================================
  META
  ==================================*/

  const meta = document.querySelector(".nv-meta");
  if (meta) {
    const published = formatDate(data.published || post?.published || "");
    const author = cleanText(post?.author || "");
    const readTime = getReadTime();

    const parts = [];

    if (published) {
      parts.push(`<span>📅 ${escapeHTML(published)}</span>`);
    }

    if (author) {
      parts.push(`<span class="nv-dot">•</span><span>✍ ${escapeHTML(author)}</span>`);
    }

    if (readTime) {
      parts.push(`<span class="nv-dot">•</span><span>⏱ ${escapeHTML(readTime)}</span>`);
    }

    meta.innerHTML = parts.join("");
  }

  /*==================================
  ARTICLE DATA
  ==================================*/

  NewsView.article.headline = data.title || post?.title || "";
  NewsView.article.image = image?.src || fallbackImage;
  NewsView.article.description = data.shortDesc || post?.shortDesc || "";
  NewsView.article.category = data.category || post?.category || "";
  NewsView.article.published = data.published || post?.published || "";
  NewsView.article.updated = data.updated || post?.updated || "";
  NewsView.article.url = data.url || location.href;
}

/*==================================
SHARE BUTTONS
==================================*/

function initShareControls() {
  const wrap = document.querySelector(".nv-share");
  if (!wrap) return;

  const data = NewsView.article || {};
  const pageUrl = data.url || location.href;
  const pageTitle = data.headline || document.title || "";
  const pageText = data.description || "";

  wrap.innerHTML = `
    <span class="nv-share-title">Share</span>
    <button type="button" class="nv-share-btn" data-share="native" aria-label="Share">↗</button>
    <button type="button" class="nv-share-btn" data-share="whatsapp" aria-label="Share on WhatsApp">WA</button>
    <button type="button" class="nv-share-btn" data-share="facebook" aria-label="Share on Facebook">F</button>
    <button type="button" class="nv-share-btn" data-share="twitter" aria-label="Share on X">X</button>
    <button type="button" class="nv-share-btn" data-share="telegram" aria-label="Share on Telegram">TG</button>
    <button type="button" class="nv-share-btn" data-share="copy" aria-label="Copy link">⧉</button>
  `;

  wrap.querySelectorAll(".nv-share-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const type = this.dataset.share;
      handleShare(type, pageUrl, pageTitle, pageText, this);
    });
  });
}

async function handleShare(type, url, title, text, button) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text);

  if (type === "facebook") {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
    return;
  }

  if (type === "twitter") {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      "_blank",
      "noopener,noreferrer"
    );
    return;
  }

  if (type === "whatsapp") {
    window.open(
      `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      "_blank",
      "noopener,noreferrer"
    );
    return;
  }

  if (type === "telegram") {
    window.open(
      `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      "_blank",
      "noopener,noreferrer"
    );
    return;
  }

  if (type === "copy") {
    try {
      await copyToClipboard(url);
      const old = button.innerHTML;
      button.innerHTML = "✔";
      setTimeout(() => {
        button.innerHTML = old || "⧉";
      }, 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
    return;
  }

  if (type === "native") {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
      } catch (err) {
        // ignore cancel
      }
      return;
    }

    try {
      await copyToClipboard(url);
      alert("Link Copied");
    } catch (err) {
      console.error("Native share fallback failed:", err);
    }
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
RELATED NEWS RENDER
==================================*/

function renderRelatedNews() {
  const wrap = document.getElementById("related-news");
  const section = document.querySelector(".nv-related");
  if (!wrap) return;

  clear(wrap);

  let posts = [];

  NewsView.posts.forEach((post) => {
    if (isCurrentPost(post)) return;

    const item = { ...post };
    item.score = getMatchScore(post);
    posts.push(item);
  });

  posts = sortByScore(posts);
  posts = posts.filter((post) => (post.score || 0) > 0);

  /* Fallback: if nothing matches, show latest 5 non-current posts */
  if (!posts.length) {
    posts = NewsView.posts.filter((post) => !isCurrentPost(post));
  }

  posts = limit(posts, 5);

  posts.forEach((post) => {
    wrap.appendChild(createRelatedCard(post));
  });

  const viewAll = document.querySelector(".nv-related-viewall");
  if (viewAll) {
    if (NewsView.current.categoryLink) {
      viewAll.href = NewsView.current.categoryLink;
    } else {
      viewAll.href = "/news.html";
    }
  }

  if (section && !posts.length) {
    section.style.display = "none";
  }
}

/*==================================
CREATE RELATED CARD
==================================*/

function createRelatedCard(post) {
  const card = document.createElement("a");
  card.className = "nv-related-card";
  card.href = post.url || "#";

  const thumb = document.createElement("div");
  thumb.className = "nv-related-thumb";

  const img = createImage(
    post.image,
    post.imageAlt || post.title,
    NewsView.current.image || ""
  );
  thumb.appendChild(img);

  const badge = createBadgeElement(post.badge);
  if (badge) thumb.appendChild(badge);

  const info = document.createElement("div");
  info.className = "nv-related-info";

  const category = document.createElement("h3");
  category.textContent = post.category || "";

  const title = document.createElement("h4");
  title.textContent = post.title || "";

  const desc = document.createElement("p");
  desc.textContent = post.shortDesc || "";

  info.appendChild(category);
  info.appendChild(title);
  info.appendChild(desc);

  card.appendChild(thumb);
  card.appendChild(info);

  return card;
}

/*==================================================
NEWS VIEW v2.0
PART 4
PARSE FEED + POST DATA
==================================================*/

/*==================================
CACHE POSTS
==================================*/

function cachePosts() {

NewsView.posts = NewsView.feed.map(parsePost);

}

/*==================================
PARSE SINGLE POST
==================================*/

function parsePost(item){

const html = item.content?.$t || "";

return{

title : clean(item.title?.$t),

url : getPostURL(item),

image : getPostImage(item),

shortDesc : getMeta(html,"news-short-desc"),

content : getMeta(html,"news-content"),

celebrity : getMeta(html,"news-celebrity"),

category : getMeta(html,"news-category"),

categoryLink : getMeta(html,"news-category-link"),

badge : getMeta(html,"news-badge"),

trending : getMeta(html,"news-trending"),

featured : getMeta(html,"news-featured"),

published : item.published?.$t || "",

updated : item.updated?.$t || ""

};

}

/*==================================
POST URL
==================================*/

function getPostURL(post){

const link = post.link.find(x=>x.rel==="alternate");

return link ? normalizeURL(link.href) : "#";

}

/*==================================
POST IMAGE
==================================*/

function getPostImage(post){

if(post.media$thumbnail){

return post.media$thumbnail.url
.replace("/s72-c/","/s1200/");
}

return NewsView.current.image ||
"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi/default.jpg";

}

/*==================================
CURRENT POST ?
==================================*/

function isCurrentPost(post){

return normalizeURL(post.url)===NewsView.current.url;

}

/*==================================
FIND CURRENT
==================================*/

function getCurrentPost(){

return NewsView.posts.find(isCurrentPost);

}

/*==================================================
NEWS VIEW JS v1.0
PART 5
RENDER HERO
==================================================*/

/*==================================
RENDER HERO
==================================*/

function renderHero(){

const heroImage=document.getElementById("news-image");

if(heroImage){

heroImage.src=NewsView.current.image||"";

heroImage.alt=NewsView.current.imageAlt||NewsView.current.title;

}

/*------------------
Badge
------------------*/

const badge=document.querySelector(".nv-badge");

if(badge){

if(NewsView.current.badge){

badge.textContent=NewsView.current.badge;

badge.style.display="inline-flex";

}else{

badge.style.display="none";

}

}

/*------------------
Breadcrumb
------------------*/

const category=document.querySelector(".nv-breadcrumb-category");

if(category){

category.textContent=NewsView.current.category||"News";

category.href=
NewsView.current.categoryLink||"/news.html";

}

/*------------------
Title
------------------*/

const title=document.querySelector(".nv-title");

if(title){

title.textContent=NewsView.current.title;

}

/*------------------
Meta
------------------*/

const meta=document.querySelector(".nv-meta");

if(meta){

meta.innerHTML=`

<div>
<i class="ri-calendar-line"></i>
<span>${formatDate(NewsView.current.date)}</span>
</div>

<div>
<i class="ri-time-line"></i>
<span>${NewsView.current.readTime}</span>
</div>

<div>
<i class="ri-eye-line"></i>
<span>${NewsView.current.views}</span>
</div>

`;

}

/*------------------
Share Buttons
------------------*/

const share=document.querySelector(".nv-share");

if(share){

share.innerHTML=`

<button
class="nv-share-btn"
data-share="facebook"
title="Facebook">

<i class="ri-facebook-fill"></i>

</button>

<button
class="nv-share-btn"
data-share="twitter"
title="Twitter">

<i class="ri-twitter-x-fill"></i>

</button>

<button
class="nv-share-btn"
data-share="telegram"
title="Telegram">

<i class="ri-telegram-fill"></i>

</button>

<button
class="nv-share-btn"
data-share="whatsapp"
title="WhatsApp">

<i class="ri-whatsapp-fill"></i>

</button>

<button
class="nv-share-btn"
data-share="copy"
title="Copy Link">

<i class="ri-link"></i>

</button>

<button
class="nv-share-btn"
data-share="native"
title="Share">

<i class="ri-share-forward-fill"></i>

</button>

`;

}

/*------------------
Document Title
------------------*/

document.title=NewsView.current.title;

}


/*==================================================
NEWS VIEW JS v1.0
PART 6
SHARE + RELATED NEWS
==================================================*/

/*==================================
INIT SHARE
==================================*/

function initShareButtons(){

document.addEventListener("click",function(e){

const btn=e.target.closest("[data-share]");

if(!btn) return;

const type=btn.dataset.share;

const url=encodeURIComponent(NewsView.current.url);

const title=encodeURIComponent(NewsView.current.title);

switch(type){

case "facebook":

window.open(
"https://www.facebook.com/sharer/sharer.php?u="+url,
"_blank"
);

break;

case "twitter":

window.open(
"https://twitter.com/intent/tweet?text="+
title+
"&url="+
url,
"_blank"
);

break;

case "telegram":

window.open(
"https://t.me/share/url?url="+
url+
"&text="+
title,
"_blank"
);

break;

case "whatsapp":

window.open(
"https://wa.me/?text="+
title+
"%20"+
url,
"_blank"
);

break;

case "copy":

navigator.clipboard.writeText(
NewsView.current.url
);

alert("Link Copied");

break;

case "native":

if(navigator.share){

navigator.share({

title:NewsView.current.title,

url:NewsView.current.url

});

}

break;

}

});

}

/*==================================
MATCH SCORE
==================================*/

function getRelatedScore(post){

let score=0;

/* Content */

splitTags(
NewsView.current.content
).forEach(tag=>{

if(
splitTags(post.content).includes(tag)
){

score+=5;

}

});

/* Celebrity */

splitTags(
NewsView.current.celebrity
).forEach(tag=>{

if(
splitTags(post.celebrity).includes(tag)
){

score+=3;

}

});

/* Category */

if(

NewsView.current.category
.toLowerCase()==
post.category.toLowerCase()

){

score+=2;

}

return score;

}

/*==================================
RENDER RELATED NEWS
==================================*/

function renderRelatedNews(){

const wrap=document.getElementById(
"related-news"
);

if(!wrap) return;

wrap.innerHTML="";

let posts=[];

NewsView.posts.forEach(post=>{

if(post.url==NewsView.current.url)
return;

post.score=getRelatedScore(post);

posts.push(post);

});

/* Best Matches */

posts=posts

.filter(x=>x.score>0)

.sort((a,b)=>b.score-a.score);

/* Fallback */

if(posts.length===0){

posts=NewsView.posts.filter(

x=>x.url!=NewsView.current.url

);

}

/* Limit */

posts=posts.slice(0,5);

/* Render */

posts.forEach(post=>{

wrap.insertAdjacentHTML(

"beforeend",

`

<a class="nv-related-card"

href="${post.url}">

<div class="nv-related-thumb">

<img

loading="lazy"

src="${post.image}"

alt="${escapeHTML(post.title)}">

${
post.badge?

`<span class="nv-badge">
${post.badge}
</span>`

:""

}

</div>

<div class="nv-related-info">

<h3>

${escapeHTML(post.category)}

</h3>

<h4>

${escapeHTML(post.title)}

</h4>

<p>

${escapeHTML(post.shortDesc)}

</p>

</div>

</a>

`

);

});

/* View All */

const viewAll=document.querySelector(
".nv-related-viewall"
);

if(

viewAll&&
NewsView.current.categoryLink

){

viewAll.href=
NewsView.current.categoryLink;

}

}


/*==================================================
NEWS VIEW JS v1.0
PART 7
LATEST + TRENDING + INIT
==================================================*/

/*==================================
LATEST NEWS
==================================*/

function renderLatestNews(){

const wrap=document.getElementById(
"latest-news"
);

if(!wrap) return;

wrap.innerHTML="";

const posts=NewsView.posts

.filter(post=>
post.url!==NewsView.current.url
)

.slice(0,6);

posts.forEach(post=>{

wrap.insertAdjacentHTML(

"beforeend",

`

<a class="nv-latest-card"

href="${post.url}">

<div class="nv-latest-thumb">

<img

loading="lazy"

src="${post.image}"

alt="${escapeHTML(post.title)}">

${
post.badge?

`<span class="nv-badge">
${post.badge}
</span>`

:""

}

</div>

<div class="nv-latest-info">

<h3>

${escapeHTML(post.category)}

</h3>

<h4>

${escapeHTML(post.title)}

</h4>

<p>

${escapeHTML(post.shortDesc)}

</p>

</div>

</a>

`

);

});

/* View All */

const viewAll=document.querySelector(
".nv-latest-viewall"
);

if(viewAll){

viewAll.href="/news.html";

}

}

/*==================================
TRENDING NEWS
==================================*/

function renderTrendingNews(){

const wrap=document.getElementById(
"trending-news"
);

if(!wrap) return;

wrap.innerHTML="";

const posts=NewsView.posts

.filter(post=>

post.url!==NewsView.current.url &&

String(post.trending)
.toLowerCase()=="yes"

)

.slice(0,5);

posts.forEach(post=>{

wrap.insertAdjacentHTML(

"beforeend",

`

<a class="nv-trending-card"

href="${post.url}">

<div class="nv-trending-thumb">

<img

loading="lazy"

src="${post.image}"

alt="${escapeHTML(post.title)}">

${
post.badge?

`<span class="nv-badge">
${post.badge}
</span>`

:""

}

</div>

<div class="nv-trending-info">

<h3>

${escapeHTML(post.category)}

</h3>

<h4>

${escapeHTML(post.title)}

</h4>

<p>

${escapeHTML(post.shortDesc)}

</p>

</div>

</a>

`

);

});

}

/*==================================
INIT
==================================*/

async function initNewsView(){

await Promise.all([

loadCurrentMetadata(),

loadFeed()

]);

cachePosts();

/* Hero */

renderHero();

/* Share */

initShareButtons();

/* Related */

renderRelatedNews();

/* Latest */

renderLatestNews();

/* Trending */

renderTrendingNews();

}

/*==================================
START
==================================*/

document.addEventListener(

"DOMContentLoaded",

initNewsView

);

});
