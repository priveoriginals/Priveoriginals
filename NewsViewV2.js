/*==================================================
NEWS VIEW JS v2.0
PART 1
FOUNDATION + FEED CACHE
==================================================*/
document.addEventListener("DOMContentLoaded", function () {
"use strict";

const NewsView={

feed:[],

current:{},

loaded:false,

feedURL:"/feeds/posts/default/-/news?alt=json&max-results=500"

};

/*==================================
DOCUMENT READY
==================================*/

document.addEventListener("DOMContentLoaded",initNewsView);

async function initNewsView(){

await loadCurrentMetadata();

await loadFeed();

}

/*==================================
LOAD BLOGGER FEED
(Only One Time)
==================================*/

async function loadFeed(){

try{

const res=await fetch(NewsView.feedURL);

const json=await res.json();

NewsView.feed=json.feed.entry||[];

NewsView.loaded=true;

}catch(err){

console.error("News Feed Error :",err);

}

}

/*==================================
READ HIDDEN METADATA
==================================*/

async function loadCurrentMetadata(){

const post=document.querySelector(".post-body");

if(!post) return;

/*----- helper -----*/

const meta=name=>{

const el=post.querySelector("." + name);

return el ? el.textContent.trim() : "";

};

NewsView.current={

title:document.title,

url:location.href.split("?")[0],

image:meta("news-image"),

shortDesc:meta("news-short-desc"),

content:meta("news-content"),

celebrity:meta("news-celebrity"),

category:meta("news-category"),

categoryLink:meta("news-category-link"),

badge:meta("news-badge"),

trending:meta("news-trending"),

published:meta("news-published"),

updated:meta("news-updated")

};

}

/*==================================
EXTRACT META
FROM FEED POST
==================================*/

function getMeta(html,className){

const div=document.createElement("div");

div.innerHTML=html;

const el=div.querySelector("." + className);

return el ? el.textContent.trim() : "";

}

/*==================================
BLOGGER IMAGE
==================================*/

function getImage(post){

if(post.media$thumbnail){

return post.media$thumbnail.url

.replace("/s72-c/","/s1200/");

}

return NewsView.current.image ||

"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi/default.jpg";

}

/*==================================
POST URL
==================================*/

function getLink(post){

const link=post.link.find(

x=>x.rel==="alternate"

);

return link ? link.href : "#";

}

/*==================================
POST DATA
==================================*/

function parsePost(post){

const html=post.content?.$t || "";

return{

title:post.title.$t,

url:getLink(post),

image:getImage(post),

shortDesc:getMeta(html,"news-short-desc"),

content:getMeta(html,"news-content"),

celebrity:getMeta(html,"news-celebrity"),

category:getMeta(html,"news-category"),

categoryLink:getMeta(html,"news-category-link"),

badge:getMeta(html,"news-badge"),

trending:getMeta(html,"news-trending"),

published:getMeta(html,"news-published"),

updated:getMeta(html,"news-updated"),

html

};

}

/*==================================================
NEWS VIEW JS v2.0
PART 2
UTILITY FUNCTIONS
==================================================*/

/*==================================
FORMAT DATE
==================================*/

function formatDate(dateString){

if(!dateString) return "";

const d=new Date(dateString);

return d.toLocaleDateString("en-IN",{

day:"numeric",

month:"long",

year:"numeric"

});

}

/*==================================
IMAGE FALLBACK
==================================*/

function imageFallback(img){

img.onerror=function(){

this.src=NewsView.current.image ||

"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi/default.jpg";

};

}

/*==================================
TEXT CLEANER
==================================*/

function cleanText(text){

if(!text) return "";

return text

.replace(/\s+/g," ")

.trim();

}

/*==================================
ARRAY
==================================*/

function splitTags(text){

if(!text) return [];

return text

.toLowerCase()

.split(",")

.map(x=>x.trim())

.filter(Boolean);

}

/*==================================
MATCH SCORE
==================================*/

function getMatchScore(post){

let score=0;

/*----- Content -----*/

splitTags(NewsView.current.content)

.forEach(tag=>{

if(splitTags(post.content).includes(tag))

score+=5;

});

/*----- Celebrity -----*/

splitTags(NewsView.current.celebrity)

.forEach(tag=>{

if(splitTags(post.celebrity).includes(tag))

score+=3;

});

/*----- Category -----*/

if(

NewsView.current.category &&

NewsView.current.category.toLowerCase()==

post.category.toLowerCase()

){

score+=2;

}

return score;

}

/*==================================
CURRENT POST ?
==================================*/

function isCurrentPost(post){

return post.url.split("?")[0]===

NewsView.current.url;

}

/*==================================
OPEN SHARE
==================================*/

async function shareNews(){

const data={

title:NewsView.current.title,

text:NewsView.current.shortDesc,

url:NewsView.current.url

};

if(navigator.share){

try{

await navigator.share(data);

}catch(e){}

}else{

navigator.clipboard.writeText(data.url);

alert("Link Copied");

}

}

/*==================================
IMAGE ELEMENT
==================================*/

function createImage(src,alt){

const img=document.createElement("img");

img.loading="lazy";

img.decoding="async";

img.src=src;

img.alt=alt;

imageFallback(img);

return img;

}

/*==================================
CLEAR ELEMENT
==================================*/

function clear(el){

if(el) el.innerHTML="";

}

/*==================================
CREATE BADGE
==================================*/

function createBadge(text){

if(!text) return "";

return

`<span class="nv-badge">${text}</span>`;

}

/*==================================
SORT POSTS
==================================*/

function sortByScore(arr){

return arr.sort(

(a,b)=>b.score-a.score

);

}

/*==================================
LIMIT POSTS
==================================*/

function limit(arr,count){

return arr.slice(0,count);

}

/*==================================================
NEWS VIEW JS v2.0
PART 3
MAIN ARTICLE + SHARE
==================================================*/

document.addEventListener("DOMContentLoaded",()=>{

renderMainNews();

initShareButton();

});

/*==================================
MAIN NEWS
==================================*/

function renderMainNews(){

const data=NewsView.current;

/*----- Featured Image -----*/

const image=document.querySelector(".nv-featured-image img");

if(image && data.image){

image.src=data.image;

image.alt=data.title;

imageFallback(image);

}

/*----- Title -----*/

const title=document.querySelector(".nv-title");

if(title){

title.textContent=data.title;

}

/*----- Short Description -----*/

const desc=document.querySelector(".nv-short-description");

if(desc){

desc.textContent=data.shortDesc;

}

/*----- Badge -----*/

const badge=document.querySelector(".nv-badge");

if(badge){

if(data.badge){

badge.textContent=data.badge;

badge.style.display="inline-flex";

}else{

badge.remove();

}

}

/*----- Category -----*/

const category=document.querySelector(".nv-category");

if(category){

category.textContent=data.category;

if(data.categoryLink){

category.href=data.categoryLink;

}

}

/*----- Published -----*/

const publish=document.querySelector(".nv-published-date");

if(publish){

publish.textContent=formatDate(data.published);

}

/*----- Updated -----*/

const updated=document.querySelector(".nv-updated-date");

if(updated){

if(data.updated){

updated.textContent="Updated : "+formatDate(data.updated);

}else{

updated.remove();

}

}

/*----- Document Title -----*/

document.title=data.title;

}

/*==================================
SHARE BUTTON
==================================*/

function initShareButton(){

const btn=document.querySelector(".nv-share-button");

if(!btn) return;

btn.addEventListener("click",shareNews);

}

/*==================================
COPY URL BUTTON
(Optional)
==================================*/

const copyBtn=document.querySelector(".nv-copy-link");

if(copyBtn){

copyBtn.addEventListener("click",async()=>{

try{

await navigator.clipboard.writeText(

NewsView.current.url

);

copyBtn.classList.add("copied");

copyBtn.innerHTML="Copied";

setTimeout(()=>{

copyBtn.classList.remove("copied");

copyBtn.innerHTML="Copy Link";

},2000);

}catch(e){}

});

}

/*==================================
BREADCRUMB
==================================*/

const breadcrumb=document.querySelector(".nv-breadcrumb-category");

if(breadcrumb){

breadcrumb.textContent=NewsView.current.category;

if(NewsView.current.categoryLink){

breadcrumb.href=NewsView.current.categoryLink;

}

}

/*==================================
SCHEMA READY
==================================*/

NewsView.article={

headline:NewsView.current.title,

image:NewsView.current.image,

description:NewsView.current.shortDesc,

category:NewsView.current.category,

published:NewsView.current.published,

updated:NewsView.current.updated,

url:NewsView.current.url

};

/*==================================================
NEWS VIEW JS v2.0
PART 4
RELATED NEWS
==================================================*/

document.addEventListener("DOMContentLoaded",()=>{

renderRelatedNews();

});

/*==================================
RELATED NEWS
==================================*/

function renderRelatedNews(){

const wrap=document.querySelector(".nv-related-list");

if(!wrap) return;

clear(wrap);

let posts=[];

/*==================================
COLLECT MATCHES
==================================*/

NewsView.feed.forEach(item=>{

const post=parsePost(item);

if(isCurrentPost(post)) return;

post.score=getMatchScore(post);

posts.push(post);

});

/*==================================
SORT
==================================*/

posts=sortByScore(posts);

/*==================================
REMOVE ZERO SCORE
==================================*/

posts=posts.filter(post=>post.score>0);

/*==================================
FALLBACK
==================================*/

if(!posts.length){

NewsView.feed.forEach(item=>{

const post=parsePost(item);

if(isCurrentPost(post)) return;

posts.push(post);

});

}

/*==================================
LIMIT
==================================*/

posts=limit(posts,5);

/*==================================
RENDER
==================================*/

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

alt="${post.title}"

onerror="this.src='${NewsView.current.image}'">

${createBadge(post.badge)}

</div>

<div class="nv-related-info">

<h3>${post.category}</h3>

<h4>${post.title}</h4>

<p>${post.shortDesc}</p>

</div>

</a>

`

);

});

/*==================================
VIEW ALL
==================================*/

const viewAll=document.querySelector(".nv-related-viewall");

if(

viewAll &&

NewsView.current.categoryLink

){

viewAll.href=

NewsView.current.categoryLink;

}

}

/*==================================================
NEWS VIEW JS v2.0
PART 5
TRENDING + LATEST NEWS
==================================================*/

document.addEventListener("DOMContentLoaded",()=>{

renderTrendingNews();

renderLatestNews();

});

/*==================================
TRENDING NEWS
==================================*/

function renderTrendingNews(){

const wrap=document.querySelector(".nv-trending-list");

if(!wrap) return;

clear(wrap);

let posts=[];

NewsView.feed.forEach(item=>{

const post=parsePost(item);

if(isCurrentPost(post)) return;

if(post.trending.toLowerCase()!=="yes") return;

posts.push(post);

});

posts=limit(posts,5);

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

alt="${post.title}"

onerror="this.src='${NewsView.current.image}'">

${createBadge(post.badge)}

</div>

<div class="nv-trending-info">

<h3>${post.category}</h3>

<h4>${post.title}</h4>

<p>${post.shortDesc}</p>

</div>

</a>

`

);

});

}

/*==================================
LATEST NEWS
==================================*/

function renderLatestNews(){

const wrap=document.querySelector(".nv-latest-list");

if(!wrap) return;

clear(wrap);

let posts=[];

NewsView.feed.forEach(item=>{

const post=parsePost(item);

if(isCurrentPost(post)) return;

posts.push(post);

});

posts=limit(posts,6);

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

alt="${post.title}"

onerror="this.src='${NewsView.current.image}'">

${createBadge(post.badge)}

</div>

<div class="nv-latest-info">

<h3>${post.category}</h3>

<h4>${post.title}</h4>

<p>${post.shortDesc}</p>

</div>

</a>

`

);

});

}

/*==================================
VIEW ALL LINKS
==================================*/

const latestViewAll=document.querySelector(".nv-latest-viewall");

if(latestViewAll){

latestViewAll.href="/p/news.html";

}

const trendingViewAll=document.querySelector(".nv-trending-viewall");

if(trendingViewAll){

trendingViewAll.href="/p/news.html?trending=yes";

}

/*==================================================
NEWS VIEW JS
PART 6
RENDER + SHARE + RELATED + TRENDING
==================================================*/

/*------------------------------
Render Main Article
------------------------------*/

function renderNews(){

document.getElementById("news-title").textContent = news.title;

document.getElementById("news-image").src =
news.image;

document.getElementById("news-image").alt =
news.title;

document.getElementById("news-short").textContent =
news.short;

document.getElementById("news-author").textContent =
news.author;

document.getElementById("news-date").textContent =
news.date;

document.getElementById("news-category").textContent =
news.category;

document.getElementById("news-content").innerHTML =
articleHTML;

}

/*------------------------------
Share Buttons
------------------------------*/

const shareURL=location.href;

const shareTitle=news.title;

document.querySelectorAll("[data-share]").forEach(btn=>{

btn.onclick=function(){

const type=this.dataset.share;

if(type==="facebook"){

window.open(
"https://www.facebook.com/sharer/sharer.php?u="+
encodeURIComponent(shareURL)
);

}

if(type==="twitter"){

window.open(
"https://twitter.com/intent/tweet?url="+
encodeURIComponent(shareURL)+
"&text="+
encodeURIComponent(shareTitle)
);

}

if(type==="whatsapp"){

window.open(
"https://wa.me/?text="+
encodeURIComponent(shareTitle+" "+shareURL)
);

}

if(type==="telegram"){

window.open(
"https://t.me/share/url?url="+
encodeURIComponent(shareURL)+
"&text="+
encodeURIComponent(shareTitle)
);

}

if(type==="copy"){

navigator.clipboard.writeText(shareURL);

this.innerHTML="Copied";

setTimeout(()=>{

this.innerHTML="Copy Link";

},1500);

}

if(type==="native"){

if(navigator.share){

navigator.share({

title:shareTitle,

url:shareURL

});

}

}

};

});

/*------------------------------
Load Sections
------------------------------*/

loadRelatedNews();

loadTrendingNews();

/*------------------------------
Start
------------------------------*/

renderNews();

});