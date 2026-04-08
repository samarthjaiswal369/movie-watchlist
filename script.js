const apiKey = "83d0705a";

const searchInput      = document.getElementById("searchinput");
const searchBtn        = document.getElementById("searchbtn");
const typeFilter       = document.getElementById("type-filter");
const moviesContainer  = document.getElementById("moviescontainer");
const loading          = document.getElementById("loading");
const message          = document.getElementById("message");
const modalOverlay     = document.getElementById("modal-overlay");
const modalContent     = document.getElementById("modal-content");
const watchlistBadge   = document.getElementById("watchlist-count");
const watchlistContainer = document.getElementById("watchlistcontainer");
const watchlistEmpty   = document.getElementById("watchlist-empty");

let watchlist = JSON.parse(localStorage.getItem("mw_watchlist")) || [];

function saveWatchlist() {
  localStorage.setItem("mw_watchlist", JSON.stringify(watchlist));
  updateWatchlistBadge();
}

function isInWatchlist(imdbID) {
  return watchlist.some(m => m.imdbID === imdbID);
}

function toggleWatchlist(movie) {
  if (isInWatchlist(movie.imdbID)) {
    watchlist = watchlist.filter(m => m.imdbID !== movie.imdbID);
  } else {
    watchlist.push(movie);
  }
  saveWatchlist();
}

function updateWatchlistBadge() {
  watchlistBadge.textContent = watchlist.length;
}

function switchTab(tab) {
  const searchTab    = document.getElementById("search-tab");
  const watchlistTab = document.getElementById("watchlist-tab");
  const tabSearch    = document.getElementById("tab-search");
  const tabWatchlist = document.getElementById("tab-watchlist");

  if (tab === "search") {
    searchTab.classList.remove("hidden");
    watchlistTab.classList.add("hidden");
    tabSearch.classList.add("active");
    tabWatchlist.classList.remove("active");
  } else {
    searchTab.classList.add("hidden");
    watchlistTab.classList.remove("hidden");
    tabSearch.classList.remove("active");
    tabWatchlist.classList.add("active");
    renderWatchlist();
  }
}

function renderWatchlist() {
  watchlistContainer.innerHTML = "";
  if (watchlist.length === 0) {
    watchlistEmpty.classList.remove("hidden");
    return;
  }
  watchlistEmpty.classList.add("hidden");
  watchlist.forEach(movie => {
    const card = buildCard(movie, true);
    watchlistContainer.appendChild(card);
  });
}

async function fetchMovies(query) {
  if (!query) return;

  loading.classList.remove("hidden");
  message.textContent = "";
  moviesContainer.innerHTML = "";

  const type = typeFilter.value;
  const typeParam = type ? `&type=${type}` : "";
  const url = `https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(query)}${typeParam}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();
    loading.classList.add("hidden");

    if (data.Response === "True") {
      displayMovies(data.Search);
    } else {
      showMessage(data.Error || "No results found.");
    }
  } catch (err) {
    loading.classList.add("hidden");
    showMessage("Something went wrong. Check your connection.");
    console.error(err);
  }
}

function displayMovies(list) {
  moviesContainer.innerHTML = "";
  list.forEach(movie => {
    const card = buildCard(movie, false);
    moviesContainer.appendChild(card);
  });
}

function buildCard(movie, isWatchlistView) {
  let poster = movie.Poster;
  if (!poster || poster === "N/A") {
    poster = "https://placehold.co/300x450/141420/888?text=No+Poster";
  }

  const saved = isInWatchlist(movie.imdbID);

  const typeClass = {
    movie: "tag-movie",
    series: "tag-series",
    game: "tag-game"
  }[movie.Type] || "tag-default";
  const typeLabel = movie.Type
    ? movie.Type.charAt(0).toUpperCase() + movie.Type.slice(1)
    : "Unknown";

  const card = document.createElement("div");
  card.classList.add("movie-card");
  card.innerHTML = `
    <img src="${poster}" alt="${movie.Title}" loading="lazy">
    <button
      class="btn-watchlist ${saved ? "saved" : ""}"
      id="wl-btn-${movie.imdbID}"
      title="${saved ? "Remove from Watchlist" : "Add to Watchlist"}"
      aria-label="${saved ? "Remove from Watchlist" : "Add to Watchlist"}"
    >${saved ? "🔖" : "＋"}</button>
    <div class="card-body">
      <h3 title="${movie.Title}">${movie.Title}</h3>
      <p class="year">${movie.Year}</p>
      <span class="type-tag ${typeClass}">${typeLabel}</span>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (e.target.closest(".btn-watchlist")) return;
    openModal(movie.imdbID);
  });

  card.querySelector(".btn-watchlist").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleWatchlist(movie);

    document.querySelectorAll(`#wl-btn-${movie.imdbID}`).forEach(btn => {
      const nowSaved = isInWatchlist(movie.imdbID);
      btn.textContent = nowSaved ? "🔖" : "＋";
      btn.title       = nowSaved ? "Remove from Watchlist" : "Add to Watchlist";
      btn.classList.toggle("saved", nowSaved);
    });

    if (!document.getElementById("watchlist-tab").classList.contains("hidden")) {
      renderWatchlist();
    }
  });

  return card;
}

async function openModal(imdbID) {
  modalOverlay.classList.remove("hidden");
  modalContent.innerHTML = `<p style="color:#888;text-align:center;padding:40px 0;">⏳ Loading details...</p>`;

  try {
    const res  = await fetch(`https://www.omdbapi.com/?apikey=${apiKey}&i=${imdbID}&plot=full`);
    const d    = await res.json();

    if (d.Response !== "True") {
      modalContent.innerHTML = `<p style="color:#e50914;text-align:center;">Failed to load details.</p>`;
      return;
    }

    const poster = (d.Poster && d.Poster !== "N/A")
      ? d.Poster
      : "https://placehold.co/200x300/141420/888?text=No+Poster";

    const saved = isInWatchlist(imdbID);
    const simpleMovie = {
      imdbID: d.imdbID, Title: d.Title, Year: d.Year, Poster: d.Poster, Type: d.Type
    };

    modalContent.innerHTML = `
      <div class="modal-inner">
        <img src="${poster}" alt="${d.Title}">
        <div class="modal-info">
          <h2>${d.Title}</h2>
          <div class="modal-meta">
            <span class="meta-chip">${d.Year}</span>
            ${d.Runtime && d.Runtime !== "N/A" ? `<span class="meta-chip">${d.Runtime}</span>` : ""}
            ${d.imdbRating && d.imdbRating !== "N/A" ? `<span class="meta-chip rating-chip">⭐ ${d.imdbRating}/10</span>` : ""}
            ${d.Rated && d.Rated !== "N/A" ? `<span class="meta-chip">${d.Rated}</span>` : ""}
          </div>
          ${d.Genre    !== "N/A" ? `<p class="modal-row"><strong>Genre:</strong> ${d.Genre}</p>` : ""}
          ${d.Director !== "N/A" ? `<p class="modal-row"><strong>Director:</strong> ${d.Director}</p>` : ""}
          ${d.Actors   !== "N/A" ? `<p class="modal-row"><strong>Cast:</strong> ${d.Actors}</p>` : ""}
          <p class="modal-plot">${d.Plot && d.Plot !== "N/A" ? d.Plot : "No plot available."}</p>
          <button
            class="btn-modal-watchlist ${saved ? "remove-btn" : ""}"
            id="modal-wl-btn"
            onclick="modalToggleWatchlist(${JSON.stringify(simpleMovie).replace(/"/g, "&quot;")})"
          >
            ${saved ? "🔖 Remove from Watchlist" : "＋ Add to Watchlist"}
          </button>
        </div>
      </div>
    `;
  } catch (err) {
    modalContent.innerHTML = `<p style="color:#e50914;text-align:center;">Error loading details.</p>`;
    console.error(err);
  }
}

function modalToggleWatchlist(movie) {
  toggleWatchlist(movie);
  const btn   = document.getElementById("modal-wl-btn");
  const saved = isInWatchlist(movie.imdbID);
  btn.textContent = saved ? "🔖 Remove from Watchlist" : "＋ Add to Watchlist";
  btn.classList.toggle("remove-btn", saved);

  document.querySelectorAll(`#wl-btn-${movie.imdbID}`).forEach(b => {
    b.textContent = saved ? "🔖" : "＋";
    b.title       = saved ? "Remove from Watchlist" : "Add to Watchlist";
    b.classList.toggle("saved", saved);
  });
}

function closeModal(e) {
  if (e.target === modalOverlay) modalOverlay.classList.add("hidden");
}

function closeModalBtn() {
  modalOverlay.classList.add("hidden");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") modalOverlay.classList.add("hidden");
});

function showMessage(msg) {
  message.textContent = msg;
}

searchBtn.addEventListener("click", () => {
  fetchMovies(searchInput.value.trim());
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchMovies(searchInput.value.trim());
});

updateWatchlistBadge();
