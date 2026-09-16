
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";
const LOGO_URL = "https://image.tmdb.org/t/p/w92";
const WATCH_REGION = "QA";

const $ = id => document.getElementById(id);
const movieGrid = $("movieGrid");
const searchForm = $("searchForm");
const searchInput = $("searchInput");
const searchSuggestion = $("searchSuggestion");
const sectionTitle = $("sectionTitle");
const resultCount = $("resultCount");
const loader = $("loader");
const messageBox = $("messageBox");
const genreFilter = $("genreFilter");
const yearFilter = $("yearFilter");
const ratingFilter = $("ratingFilter");
const sortFilter = $("sortFilter");
const clearFilters = $("clearFilters");
const loadMoreBtn = $("loadMoreBtn");
const randomBtn = $("randomBtn");
const watchlistBtn = $("watchlistBtn");
const watchlistCount = $("watchlistCount");
const movieModal = $("movieModal");
const modalContent = $("modalContent");
const closeModal = $("closeModal");
const modalWindowTitle = $("modalWindowTitle");

let genres = [];
let currentMovies = [];
let currentPage = 1;
let searchIndex = [];
let showingWatchlist = false;
let watchlist = [];

try {
  const saved = JSON.parse(localStorage.getItem("movieExeWatchlist"));
  watchlist = Array.isArray(saved) ? saved : [];
} catch (error) {
  console.warn("Saved watchlist could not be loaded:", error);
}

async function apiFetch(endpoint) {
  const response = await fetch(`/api/movies?endpoint=${encodeURIComponent(endpoint)}`);
  if (!response.ok) {
    throw new Error(`Movie API request failed: ${response.status}`);
  }
  return response.json();
}

// Load filters first, then show the initial movie list.
async function init() {
  updateWatchlistCount();
  try {
    await loadGenres();
    await discoverMovies();
    buildSearchIndex();
  } catch (error) {
    console.error(error);
    showMessage("SYSTEM ERROR", "Check your API key and internet connection.");
  }
}

async function loadGenres() {
  const data = await apiFetch("/genre/movie/list?language=en-US");
  genres = data.genres || [];
  genres.forEach(genre => {
    const option = document.createElement("option");
    option.value = genre.id;
    option.textContent = genre.name;
    genreFilter.appendChild(option);
  });
}

async function discoverMovies(append = false) {
  showingWatchlist = false;
  showLoader();
  const params = new URLSearchParams({ language: "en-US", include_adult: "false", page: currentPage, sort_by: sortFilter.value, "vote_count.gte": "100", "vote_average.gte": ratingFilter.value });
  if (genreFilter.value) params.set("with_genres", genreFilter.value);
  if (yearFilter.value) {
    params.set("primary_release_date.gte", `${yearFilter.value}-01-01`);
    params.set("primary_release_date.lte", `${Number(yearFilter.value) + 9}-12-31`);
  }
  try {
    const data = await apiFetch(`/discover/movie?${params}`);
    currentMovies = append ? [...currentMovies, ...(data.results || [])] : data.results || [];
    displayMovies(currentMovies);
    const selectedGenre = genres.find(genre => String(genre.id) === genreFilter.value);
    sectionTitle.textContent = selectedGenre ? selectedGenre.name.toUpperCase() : "POPULAR MOVIES";
    resultCount.textContent = `${(data.total_results || 0).toLocaleString()} MOVIES`;
    loadMoreBtn.classList.toggle("hidden", currentPage >= data.total_pages || currentPage >= 500);
  } catch (error) {
    console.error(error);
    showMessage("DATABASE ERROR", "Could not load movies.");
  }
}

async function searchMovies(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return;
  showingWatchlist = false;
  currentPage = 1;
  searchSuggestion.classList.add("hidden");
  showLoader();
  try {
    const data = await apiFetch(`/search/movie?language=en-US&include_adult=false&query=${encodeURIComponent(cleanQuery)}`);
    let results = data.results || [];
    if (!results.length) {
      results = fuzzySearch(cleanQuery);
      if (results.length) {
        searchSuggestion.innerHTML = `No exact title found. Did you mean <strong>${escapeHTML(results[0].title)}</strong>?`;
        searchSuggestion.classList.remove("hidden");
      }
    }
    currentMovies = results;
    sectionTitle.textContent = `SEARCH: ${cleanQuery.toUpperCase()}`;
    resultCount.textContent = `${results.length} RESULTS`;
    displayMovies(results);
    loadMoreBtn.classList.add("hidden");
  } catch (error) {
    console.error(error);
    showMessage("SEARCH ERROR", "Could not complete the search.");
  }
}

// Keep a small local index so misspelled searches can get useful suggestions.
async function buildSearchIndex() {
  try {
    const requests = Array.from({ length: 10 }, (_, index) => apiFetch(`/movie/popular?language=en-US&page=${index + 1}`));
    const responses = await Promise.all(requests);
    const movies = new Map();
    responses.forEach(response => (response.results || []).forEach(movie => movies.set(movie.id, movie)));
    searchIndex = [...movies.values()];
  } catch (error) {
    console.warn("Fuzzy index failed:", error);
  }
}

function fuzzySearch(query) {
  const clean = normalizeText(query);
  return searchIndex.map(movie => {
    const title = normalizeText(movie.title || "");
    const original = normalizeText(movie.original_title || "");
    return { movie, score: Math.max(similarity(clean, title), similarity(clean, original)) };
  }).filter(item => item.score >= 0.5).sort((a, b) => b.score - a.score).slice(0, 20).map(item => item.movie);
}

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function similarity(a, b) {
  if (!a && !b) return 1;
  const maxLength = Math.max(a.length, b.length);
  return maxLength ? 1 - levenshtein(a, b) / maxLength : 1;
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, index) => [index]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1] ? matrix[i - 1][j - 1] : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// Render cards and connect their poster and watchlist actions.
function displayMovies(movies) {
  hideLoader();
  messageBox.classList.add("hidden");
  movieGrid.innerHTML = "";
  if (!movies.length) return showMessage("NO RESULTS", "Try another movie or filter.");
  movies.forEach((movie, index) => {
    const saved = isSaved(movie.id);
    const card = document.createElement("article");
    const poster = movie.poster_path ? `${IMAGE_URL}${movie.poster_path}` : makePlaceholder();
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
    const year = movie.release_date ? movie.release_date.split("-")[0] : "----";
    card.className = "movie-card";
    card.style.animationDelay = `${Math.min(index * 0.035, 0.4)}s`;
    card.innerHTML = `<div class="poster-box"><img src="${poster}" alt="${escapeHTML(movie.title)}" loading="lazy"><div class="rating">★ ${rating}</div><button class="watch-button ${saved ? "saved" : ""}" aria-label="Toggle watchlist">${saved ? "♥" : "♡"}</button></div><div class="movie-info"><div class="file-number">FILE_${String(index + 1).padStart(3, "0")}</div><h3>${escapeHTML(movie.title)}</h3><div class="meta"><span>${year}</span><span>${getGenreName(movie)}</span></div></div>`;
    card.querySelector(".poster-box").addEventListener("click", () => openMovie(movie.id));
    card.querySelector(".watch-button").addEventListener("click", event => {
      event.stopPropagation();
      toggleWatchlist(movie);
      showingWatchlist ? showWatchlist() : displayMovies(currentMovies);
    });
    movieGrid.appendChild(card);
  });
}

// Load the details, trailer, and streaming providers for one movie.
async function openMovie(movieID) {
  movieModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  modalContent.innerHTML = `<div class="loader"><div class="disc">💿</div>LOADING MOVIE...</div>`;
  try {
    const [movie, videos, providers] = await Promise.all([apiFetch(`/movie/${movieID}?language=en-US`), apiFetch(`/movie/${movieID}/videos?language=en-US`), apiFetch(`/movie/${movieID}/watch/providers`)]);
    renderMovieModal(movie, videos, providers);
  } catch (error) {
    console.error(error);
    modalContent.innerHTML = `<div class="message-box"><h3>ERROR</h3><p>Movie details could not be loaded.</p></div>`;
  }
}

function renderMovieModal(movie, videos, providers) {
  modalWindowTitle.textContent = `${movie.title}.exe`;
  const poster = movie.poster_path ? `${IMAGE_URL}${movie.poster_path}` : makePlaceholder();
  const year = movie.release_date ? movie.release_date.split("-")[0] : "Unknown";
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "Unknown";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
  const genresHTML = (movie.genres || []).map(genre => `<span class="genre-pill">${escapeHTML(genre.name)}</span>`).join("");
  const trailer = chooseTrailer(videos.results || []);
  const trailerHTML = trailer && location.protocol === "file:" ? `<section class="trailer-section"><div class="mini-title">▶ TRAILER.MP4</div><p>Embedded playback is unavailable from a local file.</p><a class="action-button" href="https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}" target="_blank" rel="noopener noreferrer">WATCH ON YOUTUBE ↗</a></section>` : trailer ? `<section class="trailer-section"><div class="mini-title">▶ TRAILER.MP4</div><div class="trailer-frame"><iframe src="https://www.youtube.com/embed/${trailer.key}" title="${escapeHTML(movie.title)} trailer" loading="lazy" allowfullscreen></iframe></div></section>` : `<section class="trailer-section"><div class="mini-title">▶ TRAILER.MP4</div><p>Trailer unavailable.</p></section>`;
  modalContent.innerHTML = `<div class="modal-layout"><div class="modal-poster-side"><img class="modal-poster" src="${poster}" alt="${escapeHTML(movie.title)}"></div><div class="modal-details"><h2>${escapeHTML(movie.title)}</h2>${movie.tagline ? `<div class="tagline">"${escapeHTML(movie.tagline)}"</div>` : ""}<div class="stats"><span class="stat">★ ${rating}</span><span class="stat">${year}</span><span class="stat">${runtime}</span></div><div class="genres">${genresHTML}</div><p class="overview">${movie.overview ? escapeHTML(movie.overview) : "No description available."}</p><button id="modalWatchlistButton" class="action-button">${isSaved(movie.id) ? "♥ SAVED" : "♡ WATCHLIST"}</button>${trailerHTML}${buildProviderHTML(providers)}</div></div>`;
  $("modalWatchlistButton").addEventListener("click", event => {
    toggleWatchlist(movie);
    event.currentTarget.textContent = isSaved(movie.id) ? "♥ SAVED" : "♡ WATCHLIST";
  });
}

function chooseTrailer(videos) {
  return videos.find(video => video.site === "YouTube" && video.type === "Trailer" && video.official) || videos.find(video => video.site === "YouTube" && video.type === "Trailer") || videos.find(video => video.site === "YouTube");
}

function buildProviderHTML(providerData) {
  const region = providerData.results?.[WATCH_REGION];
  const manualLinks = `<div class="manual-title">OTHER PLATFORMS</div><div class="manual-platforms"><a href="https://www.1flex.org/" target="_blank" rel="noopener noreferrer" class="manual-platform flex-platform"><div class="platform-icon flex-icon">1F</div><div class="platform-text"><strong>1Flex</strong><span>Open 1Flex</span></div><span class="external-arrow">↗</span></a><a href="https://www.netflix.com/" target="_blank" rel="noopener noreferrer" class="manual-platform netflix-platform"><div class="platform-icon netflix-icon">N</div><div class="platform-text"><strong>Netflix</strong><span>Check Netflix</span></div><span class="external-arrow">↗</span></a></div>`;
  const note = `<p class="attribution">Verified streaming availability powered by JustWatch via TMDB. External links do not guarantee that this movie is available.</p>`;
  if (!region) return `<section class="providers-section"><div class="mini-title">📺 WHERE TO WATCH</div><p class="provider-copy">No verified streaming options are currently listed for this region.</p>${manualLinks}${note}</section>`;
  return `<section class="providers-section"><div class="mini-title">📺 WHERE TO WATCH</div>${providerRow("STREAM", region.flatrate)}${providerRow("FREE / ADS", [...(region.free || []), ...(region.ads || [])])}${providerRow("RENT", region.rent)}${providerRow("BUY", region.buy)}${region.link ? `<a href="${region.link}" target="_blank" rel="noopener noreferrer" class="action-button secondary">VIEW VERIFIED OPTIONS ↗</a>` : ""}${manualLinks}${note}</section>`;
}

function providerRow(title, providers = []) {
  const unique = [...new Map(providers.map(provider => [provider.provider_id, provider])).values()];
  if (!unique.length) return "";
  return `<div class="provider-title">${title}</div><div class="provider-list">${unique.map(provider => `<div class="provider">${provider.logo_path ? `<img src="${LOGO_URL}${provider.logo_path}" alt="${escapeHTML(provider.provider_name)}">` : ""}<span>${escapeHTML(provider.provider_name)}</span></div>`).join("")}</div>`;
}

function isSaved(id) {
  return watchlist.some(movie => movie.id === id);
}

function toggleWatchlist(movie) {
  watchlist = isSaved(movie.id) ? watchlist.filter(saved => saved.id !== movie.id) : [...watchlist, { id: movie.id, title: movie.title, poster_path: movie.poster_path, release_date: movie.release_date, vote_average: movie.vote_average, genre_ids: movie.genre_ids || movie.genres?.map(genre => genre.id) || [] }];
  localStorage.setItem("movieExeWatchlist", JSON.stringify(watchlist));
  updateWatchlistCount();
}

function updateWatchlistCount() {
  watchlistCount.textContent = watchlist.length;
}

function showWatchlist() {
  showingWatchlist = true;
  sectionTitle.textContent = "MY WATCHLIST";
  resultCount.textContent = `${watchlist.length} SAVED`;
  loadMoreBtn.classList.add("hidden");
  displayMovies(watchlist);
}

async function openRandomMovie() {
  try {
    const page = Math.floor(Math.random() * 20) + 1;
    const data = await apiFetch(`/discover/movie?include_adult=false&vote_count.gte=300&sort_by=popularity.desc&page=${page}`);
    if (data.results?.length) openMovie(data.results[Math.floor(Math.random() * data.results.length)].id);
  } catch (error) {
    console.error(error);
  }
}

function getGenreName(movie) {
  const genreID = movie.genre_ids?.[0] || movie.genres?.[0]?.id;
  return genres.find(genre => genre.id === genreID)?.name || "Movie";
}

function makePlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750"><rect width="100%" height="100%" fill="#ffc5df"/><text x="50%" y="50%" text-anchor="middle" font-family="monospace" font-size="30" fill="#151515">NO POSTER</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function showLoader() {
  loader.classList.remove("hidden");
  messageBox.classList.add("hidden");
  movieGrid.innerHTML = "";
}

function hideLoader() {
  loader.classList.add("hidden");
}

function showMessage(title, text) {
  hideLoader();
  movieGrid.innerHTML = "";
  messageBox.innerHTML = `<h3>${escapeHTML(title)}</h3><p>${escapeHTML(text)}</p>`;
  messageBox.classList.remove("hidden");
}

function escapeHTML(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchMovies(searchInput.value);
});
genreFilter.addEventListener("change", resetDiscover);
yearFilter.addEventListener("change", resetDiscover);
ratingFilter.addEventListener("change", resetDiscover);
sortFilter.addEventListener("change", resetDiscover);
clearFilters.addEventListener("click", () => {
  genreFilter.value = "";
  yearFilter.value = "";
  ratingFilter.value = "0";
  sortFilter.value = "popularity.desc";
  resetDiscover();
});
loadMoreBtn.addEventListener("click", () => {
  currentPage++;
  discoverMovies(true);
});
watchlistBtn.addEventListener("click", showWatchlist);
randomBtn.addEventListener("click", openRandomMovie);
closeModal.addEventListener("click", closeMovieModal);
document.querySelector(".modal-overlay").addEventListener("click", closeMovieModal);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeMovieModal();
});

function closeMovieModal() {
  movieModal.classList.add("hidden");
  document.body.style.overflow = "";
  modalContent.innerHTML = "";
}

function resetDiscover() {
  currentPage = 1;
  searchInput.value = "";
  searchSuggestion.classList.add("hidden");
  discoverMovies();
}

// Add enough repeated labels to keep the ticker filled on every screen size.
function setupTicker() {
  const ticker = document.querySelector(".ticker");
  const track = document.querySelector(".ticker-track");
  const source = track?.querySelector("span");
  if (!ticker || !track || !source) return;

  track.innerHTML = "";
  track.appendChild(source);
  while (track.scrollWidth < ticker.clientWidth * 2) {
    track.appendChild(source.cloneNode(true));
  }
  if (track.children.length % 2) track.appendChild(source.cloneNode(true));
}

setupTicker();
window.addEventListener("resize", setupTicker);
init();
