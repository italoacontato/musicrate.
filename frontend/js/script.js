
/* ========================================
   MUSICRATE - JAVASCRIPT
======================================== */
import {
   searchArtists,
   searchAlbums,
   searchSongs
} from "./music-api.js";

import { supabase } from "./supabase.js";

console.log("MusicRate iniciado com sucesso!");


// ========================================
// ELEMENTOS DA PÁGINA EXPLORAR
// ========================================

const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const filterButtons = document.querySelectorAll(".filter-button");
const exploreCards = document.querySelectorAll(".explore-card");
const resultsCount = document.getElementById("results-count");
const noResults = document.getElementById("no-results");
const sortSelect = document.getElementById("sort-select");

const artistResults = document.getElementById("artist-results");
const searchMessage = document.getElementById("search-message");

let activeFilter = "todos";
let currentSearchId = 0;



// ========================================
// CRIAR IMAGEM DOS RESULTADOS
// ========================================

function createCover(imageUrl, altText) {

   const cover = document.createElement("img");

   cover.src = imageUrl
      ? imageUrl.replace(/\/\d+x\d+bb\./, "/600x600bb.")
      : "./img/placeholder.png";
   cover.alt = altText;
   cover.loading = "lazy";

   cover.onerror = () => {
      cover.onerror = null;
      cover.src = "./img/placeholder.png";
   };

   return cover;

}

// ========================================
// BUSCAR FOTO DO ARTISTA NA WIKIPÉDIA
// ========================================

async function getArtistImage(artistName) {

   try {

      const url = `https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(artistName)}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=300&format=json&origin=*`;

      const response = await fetch(url);

      if (!response.ok) {
         return null;
      }

      const data = await response.json();

      const pages = data.query?.pages;

      if (!pages) {
         return null;
      }

      const page = Object.values(pages)[0];

      return page.thumbnail?.source || null;

   } catch (error) {

      console.error("Erro ao buscar foto do artista:", error);
      return null;

   }

}

// ========================================
// SALVAR ARTISTA NO SUPABASE
// ========================================

async function saveArtist(artist) {

   try {

      const { data: sessionData, error: sessionError } =
         await supabase.auth.getSession();

      if (sessionError) {
         throw sessionError;
      }

      if (!sessionData.session) {
         console.log("Usuário não autenticado. Artista não salvo.");
         return;
      }

      // Verificar se o artista já está cadastrado
      const { data: existingArtist, error: searchError } = await supabase
         .from("artists")
         .select("id")
         .eq("external_id", artist.artistId)
         .maybeSingle();

      if (searchError) {
         throw searchError;
      }

      // Não cadastrar artistas duplicados
      if (existingArtist) {
         console.log("Artista já cadastrado:", artist.artistName);
         return;
      }

      // Buscar foto do artista
      const imageUrl = await getArtistImage(artist.artistName);

      // Salvar artista
      const { error: insertError } = await supabase
         .from("artists")
         .insert({
            external_id: artist.artistId,
            name: artist.artistName,
            image_url: imageUrl,
            genre: artist.primaryGenreName || null
         });

      if (insertError) {
         throw insertError;
      }

      console.log("Artista cadastrado:", artist.artistName);

   } catch (error) {

      console.error("Erro ao salvar artista:", error);

   }

}

// ========================================
// SALVAR ÁLBUM NO SUPABASE
// ========================================

async function saveAlbum(album) {

   try {

      const { data: sessionData, error: sessionError } =
         await supabase.auth.getSession();

      if (sessionError) {
         throw sessionError;
      }

      if (!sessionData.session) {
         console.log("Usuário não autenticado. Álbum não salvo.");
         return;
      }

      // Verificar se o álbum já existe
      const { data: existingAlbum, error: searchError } = await supabase
         .from("albums")
         .select("id")
         .eq("external_id", album.collectionId)
         .maybeSingle();

      if (searchError) {
         throw searchError;
      }

      if (existingAlbum) {
         console.log("Álbum já cadastrado:", album.collectionName);
         return;
      }

      // Localizar o artista no Supabase
      let { data: artistData, error: artistError } = await supabase
         .from("artists")
         .select("id")
         .eq("external_id", album.artistId)
         .maybeSingle();

      if (artistError) {
         throw artistError;
      }

      // Cadastrar o artista caso ainda não exista
      if (!artistData) {

         await saveArtist({
            artistId: album.artistId,
            artistName: album.artistName,
            primaryGenreName: album.primaryGenreName
         });

         const result = await supabase
            .from("artists")
            .select("id")
            .eq("external_id", album.artistId)
            .maybeSingle();

         artistData = result.data;

         if (result.error) {
            throw result.error;
         }

      }

      if (!artistData) {
         console.error("Artista não encontrado:", album.artistName);
         return;
      }

      // Inserir álbum
      const { error: insertError } = await supabase
         .from("albums")
         .insert({
            external_id: album.collectionId,
            artist_id: artistData.id,
            title: album.collectionName,
            cover_url: album.artworkUrl100 || null,
            release_date: album.releaseDate
               ? album.releaseDate.split("T")[0]
               : null,
            genre: album.primaryGenreName || null
         });

      if (insertError) {
         throw insertError;
      }

      console.log("Álbum cadastrado:", album.collectionName);

   } catch (error) {

      console.error("Erro ao salvar álbum:", error);

   }

}

// ========================================
// SALVAR ÁLBUNS ENCONTRADOS
// ========================================

async function saveAlbums(albums) {

   if (!Array.isArray(albums) || albums.length === 0) {
      return;
   }

   for (const album of albums) {

      await saveAlbum(album);

   }

}


// ========================================
// SALVAR MÚSICA NO SUPABASE
// ========================================

async function saveSong(song) {

   try {

      const { data: sessionData, error: sessionError } =
         await supabase.auth.getSession();

      if (sessionError) {
         throw sessionError;
      }

      if (!sessionData.session) {
         console.log("Usuário não autenticado. Música não salva.");
         return;
      }

      // Verificar se a música já existe
      const { data: existingSong, error: searchError } = await supabase
         .from("songs")
         .select("id")
         .eq("external_id", song.trackId)
         .maybeSingle();

      if (searchError) {
         throw searchError;
      }

      if (existingSong) {
         console.log("Música já cadastrada:", song.trackName);
         return;
      }

      // Procurar o álbum no Supabase
      let { data: albumData, error: albumError } = await supabase
         .from("albums")
         .select("id, artist_id")
         .eq("external_id", song.collectionId)
         .maybeSingle();

      if (albumError) {
         throw albumError;
      }

      // Cadastrar o álbum caso ainda não exista
      if (!albumData) {

         await saveAlbum({
            collectionId: song.collectionId,
            artistId: song.artistId,
            artistName: song.artistName,
            collectionName: song.collectionName,
            artworkUrl100: song.artworkUrl100,
            releaseDate: song.releaseDate,
            primaryGenreName: song.primaryGenreName
         });

         const result = await supabase
            .from("albums")
            .select("id, artist_id")
            .eq("external_id", song.collectionId)
            .maybeSingle();

         if (result.error) {
            throw result.error;
         }

         albumData = result.data;
      }

      if (!albumData) {
         console.error("Álbum não encontrado:", song.collectionName);
         return;
      }


      // Cadastrar a música sem gerar erro de duplicidade
      const { error: insertError } = await supabase
         .from("songs")
         .upsert({
            external_id: song.trackId,
            artist_id: albumData.artist_id,
            album_id: albumData.id,
            title: song.trackName,
            track_number: song.trackNumber || null,
            duration_ms: song.trackTimeMillis || null,
            preview_url: song.previewUrl || null
         }, {
            onConflict: "external_id",
            ignoreDuplicates: true
         });


      if (insertError) {
         throw insertError;
      }

      console.log("Música cadastrada:", song.trackName);

   } catch (error) {

      console.error("Erro ao salvar música:", error);

   }

}


// ========================================
// SALVAR MÚSICAS ENCONTRADAS
// ========================================

async function saveSongs(songs) {

   if (!Array.isArray(songs) || songs.length === 0) {
      return;
   }

   for (const song of songs) {

      await saveSong(song);

   }

}


// ========================================
// SALVAR ARTISTAS ENCONTRADOS
// ========================================

async function saveArtists(artists) {

   if (!Array.isArray(artists) || artists.length === 0) {
      return;
   }

   for (const artist of artists) {

      await saveArtist(artist);

   }

}


// ========================================
// FILTRAR E ORDENAR ÁLBUNS
// ========================================

function filterAlbums() {

   const searchTerm = searchInput
      ? searchInput.value.toLowerCase().trim()
      : "";

   // Não executar filtros em páginas sem elementos de exploração
   if (!searchInput && exploreCards.length === 0 && !artistResults) {
      return;
   }

   let visibleCount = 0;

   // Filtrar álbuns fictícios, caso existam
   exploreCards.forEach(card => {

      const albumName =
         card.querySelector("h3")?.textContent.toLowerCase() || "";

      const artistName =
         card.querySelector(".album-details p")?.textContent.toLowerCase() || "";

      const category = card.dataset.category || "";

      // Verificar pesquisas no formato: Artista - Álbum
      const searchParts = searchTerm.split(/\s[-–—]\s/, 2);

      const hasArtistAndAlbum = searchParts.length === 2;

      const matchesSearch = hasArtistAndAlbum
         ? artistName === searchParts[0].trim() &&
         albumName.includes(searchParts[1].trim())
         : albumName.includes(searchTerm) ||
         artistName.includes(searchTerm);

      const matchesCategory =
         activeFilter === "todos" ||
         category === activeFilter;

      const shouldShow = matchesSearch && matchesCategory;

      card.classList.toggle("hidden", !shouldShow);

      if (shouldShow) {
         visibleCount++;
      }

   });

   // Filtrar álbuns encontrados pela iTunes API
   const apiAlbumCards = artistResults
      ? artistResults.querySelectorAll(".album-api-card")
      : [];

   apiAlbumCards.forEach(card => {

      const albumName = card.dataset.title || "";
      const artistName = card.dataset.artist || "";
      const genre = card.dataset.genre || "";

      const searchParts = searchTerm.split(/\s[-–—]\s/, 2);

      const hasArtistAndAlbum = searchParts.length === 2;

      const matchesSearch = hasArtistAndAlbum
         ? artistName.includes(searchParts[0].trim()) &&
         albumName.includes(searchParts[1].trim())
         : albumName.includes(searchTerm) ||
         artistName.includes(searchTerm);

      let matchesCategory = activeFilter === "todos";

      if (activeFilter === "pop") {
         matchesCategory = genre.includes("pop");
      }

      if (activeFilter === "rock") {
         matchesCategory =
            genre.includes("rock") ||
            genre.includes("alternative rock");
      }

      if (activeFilter === "rap") {
         matchesCategory =
            genre.includes("rap") ||
            genre.includes("hip-hop") ||
            genre.includes("hip hop");
      }

      if (activeFilter === "indie") {
         matchesCategory =
            genre.includes("indie") ||
            genre.includes("alternative");
      }

      if (activeFilter === "mpb") {
         matchesCategory = genre.includes("mpb");
      }

      if (activeFilter === "sertanejo") {
         matchesCategory = genre.includes("sertanejo");
      }

      if (activeFilter === "funk") {
         matchesCategory = genre.includes("funk");
      }

      if (activeFilter === "eletronica") {
         matchesCategory =
            genre.includes("electronic") ||
            genre.includes("eletrônica");
      }

      if (activeFilter === "jazz") {
         matchesCategory = genre.includes("jazz");
      }

      if (activeFilter === "blues") {
         matchesCategory = genre.includes("blues");
      }

      if (activeFilter === "rnb") {
         matchesCategory =
            genre.includes("r&b") ||
            genre.includes("rhythm and blues");
      }

      if (activeFilter === "soul") {
         matchesCategory = genre.includes("soul");
      }

      if (activeFilter === "reggae") {
         matchesCategory = genre.includes("reggae");
      }

      if (activeFilter === "metal") {
         matchesCategory = genre.includes("metal");
      }

      if (activeFilter === "punk") {
         matchesCategory = genre.includes("punk");
      }

      if (activeFilter === "classica") {
         matchesCategory =
            genre.includes("classical") ||
            genre.includes("clássica");
      }

      if (activeFilter === "gospel") {
         matchesCategory = genre.includes("gospel");
      }

      if (activeFilter === "kpop") {
         matchesCategory =
            genre.includes("k-pop") ||
            genre.includes("kpop");
      }

      if (activeFilter === "country") {
         matchesCategory = genre.includes("country");
      }

      if (activeFilter === "forro") {
         matchesCategory = genre.includes("forró") || genre.includes("forro");
      }

      if (activeFilter === "samba") {
         matchesCategory = genre.includes("samba");
      }

      const shouldShow = matchesSearch && matchesCategory;

      card.classList.toggle("hidden", !shouldShow);

      if (shouldShow) {
         visibleCount++;
      }

   });


   // Filtrar músicas encontradas pela iTunes API
   const apiSongCards = artistResults
      ? artistResults.querySelectorAll(".song-api-card")
      : [];

   apiSongCards.forEach(card => {

      const songName = card.dataset.title || "";
      const artistName = card.dataset.artist || "";
      const genre = card.dataset.genre || "";

      const matchesSearch =
         songName.includes(searchTerm) ||
         artistName.includes(searchTerm);

      let matchesCategory = activeFilter === "todos";

      if (activeFilter === "pop") {
         matchesCategory = genre.includes("pop");
      }

      if (activeFilter === "rock") {
         matchesCategory = genre.includes("rock");
      }

      if (activeFilter === "rap") {
         matchesCategory =
            genre.includes("rap") ||
            genre.includes("hip-hop");
      }

      if (activeFilter === "indie") {
         matchesCategory = genre.includes("indie");
      }

      if (activeFilter === "mpb") {
         matchesCategory = genre.includes("mpb");
      }

      if (activeFilter === "sertanejo") {
         matchesCategory = genre.includes("sertanejo");
      }

      if (activeFilter === "funk") {
         matchesCategory = genre.includes("funk");
      }

      if (activeFilter === "eletronica") {
         matchesCategory =
            genre.includes("electronic") ||
            genre.includes("eletrônica");
      }

      if (activeFilter === "jazz") {
         matchesCategory = genre.includes("jazz");
      }

      if (activeFilter === "blues") {
         matchesCategory = genre.includes("blues");
      }

      if (activeFilter === "rnb") {
         matchesCategory =
            genre.includes("r&b") ||
            genre.includes("rhythm and blues");
      }

      if (activeFilter === "soul") {
         matchesCategory = genre.includes("soul");
      }

      if (activeFilter === "reggae") {
         matchesCategory = genre.includes("reggae");
      }

      if (activeFilter === "metal") {
         matchesCategory = genre.includes("metal");
      }

      if (activeFilter === "punk") {
         matchesCategory = genre.includes("punk");
      }

      if (activeFilter === "classica") {
         matchesCategory =
            genre.includes("classical") ||
            genre.includes("clássica");
      }

      if (activeFilter === "gospel") {
         matchesCategory = genre.includes("gospel");
      }

      if (activeFilter === "kpop") {
         matchesCategory =
            genre.includes("k-pop") ||
            genre.includes("kpop");
      }

      if (activeFilter === "country") {
         matchesCategory = genre.includes("country");
      }

      if (activeFilter === "forro") {
         matchesCategory =
            genre.includes("forró") ||
            genre.includes("forro");
      }

      if (activeFilter === "samba") {
         matchesCategory = genre.includes("samba");
      }

      const shouldShow = matchesSearch && matchesCategory;

      card.classList.toggle("hidden", !shouldShow);

      if (shouldShow) {
         visibleCount++;
      }

   });


   // Atualizar a quantidade de resultados
   if (resultsCount) {

      resultsCount.textContent =
         `${visibleCount} ${visibleCount === 1 ? "resultado" : "resultados"}`;

   }

   // Exibir mensagem somente quando uma pesquisa ou filtro
   // não encontrar nenhum álbum
   if (noResults) {

      const shouldShowMessage =
         visibleCount === 0 &&
         (searchTerm !== "" || activeFilter !== "todos");

      noResults.classList.toggle("visible", shouldShowMessage);

   }

   // Aplicar ordenação
   sortAlbumCards();

}


// ========================================
// ORDENAR ÁLBUNS
// ========================================

function sortAlbumCards() {

   if (!artistResults) return;

   const sortType = sortSelect?.value || "recent";

   const albumGrids = artistResults.querySelectorAll(".album-api-grid");

   albumGrids.forEach(grid => {

      const cards = Array.from(
         grid.querySelectorAll(".album-api-card")
      );

      cards.sort((a, b) => {

         const titleA = a.dataset.title || "";
         const titleB = b.dataset.title || "";

         const dateA = Date.parse(a.dataset.releaseDate || "") || 0;
         const dateB = Date.parse(b.dataset.releaseDate || "") || 0;

         const ratingA = Number(a.dataset.rating) || 0;
         const ratingB = Number(b.dataset.rating) || 0;

         if (sortType === "recent") {
            return dateB - dateA;
         }

         if (sortType === "oldest") {
            return dateA - dateB;
         }

         if (sortType === "alphabetical") {
            return titleA.localeCompare(titleB, "pt-BR");
         }

         if (sortType === "rating") {
            return ratingB - ratingA;
         }

         return 0;

      });

      cards.forEach(card => {
         grid.appendChild(card);
      });

   });

}

// ========================================
// EXIBIR ARTISTAS ENCONTRADOS
// ========================================

function displayArtists(artists) {

   if (!artists || artists.length === 0 || !artistResults) {
      return;
   }

   const title = document.createElement("h2");
   title.textContent = "Artistas encontrados";

   artistResults.appendChild(title);

   artists.forEach(artist => {

      const card = document.createElement("div");
      card.classList.add("artist-api-card");

      const cover = createCover(
         null,
         `Imagem do artista ${artist.artistName || "desconhecido"}`
      );

      getArtistImage(artist.artistName).then(imageUrl => {

         if (imageUrl) {
            cover.src = imageUrl;
         }

      });

      const name = document.createElement("h3");
      name.textContent = artist.artistName || "Artista desconhecido";

      card.appendChild(cover);
      card.appendChild(name);

      artistResults.appendChild(card);

   });

}

// ========================================
// EXIBIR ÁLBUNS COM MÉDIAS DAS AVALIAÇÕES
// ========================================

async function displayAlbums(albums, searchId) {

   if (!albums || albums.length === 0) {
      return;
   }

   const container = document.getElementById("album-api-results");

   if (!container) {
      console.warn("Contêiner de álbuns não encontrado.");
      return;
   }

   // Identificar os álbuns encontrados pela API
   const externalIds = albums
      .map(album => album.collectionId)
      .filter(Boolean);

   let albumRecords = [];
   let ratingsData = [];

   try {

      // Buscar os álbuns cadastrados no Supabase
      const { data: albumsData, error: albumsError } = await supabase
         .from("albums")
         .select("id, external_id")
         .in("external_id", externalIds);

      if (albumsError) {
         throw albumsError;
      }

      albumRecords = albumsData || [];

      const albumIds = albumRecords.map(album => album.id);

      // Buscar avaliações dos álbuns encontrados
      if (albumIds.length > 0) {

         const { data: ratings, error: ratingsError } = await supabase
            .from("ratings")
            .select("album_id, rating")
            .in("album_id", albumIds);

         if (ratingsError) {
            throw ratingsError;
         }

         ratingsData = ratings || [];

      }

   } catch (error) {

      console.error("Erro ao buscar médias dos álbuns:", error);

   }

   // Ignorar resultados de pesquisas antigas
   if (searchId !== currentSearchId) {
      return;
   }

   // Relacionar os IDs externos aos IDs internos
   const albumIdMap = new Map(
      albumRecords.map(album => [
         String(album.external_id),
         album.id
      ])
   );

   // Calcular médias e quantidades
   const ratingStats = new Map();

   ratingsData.forEach(item => {

      const current = ratingStats.get(item.album_id) || {
         total: 0,
         count: 0
      };

      current.total += Number(item.rating);
      current.count++;

      ratingStats.set(item.album_id, current);

   });


   // Criar os cards
   albums.forEach(album => {


      const card = document.createElement("div");
      card.classList.add("album-api-card");

      const cover = createCover(
         album.artworkUrl100,
         `Capa do álbum ${album.collectionName || "desconhecido"}`
      );

      const name = document.createElement("h3");
      name.textContent = album.collectionName || "Álbum desconhecido";

      const artist = document.createElement("p");

      artist.textContent = album.artistName || "Artista desconhecido";

      const year = document.createElement("span");

      year.textContent = album.releaseDate
         ? new Date(album.releaseDate).getFullYear()
         : "Ano desconhecido";

      // Localizar as avaliações deste álbum
      const albumId = albumIdMap.get(String(album.collectionId));

      const stats = albumId
         ? ratingStats.get(albumId)
         : null;

      const average = stats && stats.count > 0
         ? stats.total / stats.count
         : 0;

      const ratingCount = stats ? stats.count : 0;

      // Guardar informações para filtros e ordenação
      card.dataset.title =
         (album.collectionName || "").toLowerCase();

      card.dataset.artist =
         (album.artistName || "").toLowerCase();

      card.dataset.genre =
         (album.primaryGenreName || "").toLowerCase();

      card.dataset.releaseDate =
         album.releaseDate || "";

      card.dataset.rating = average;

      // Criar informações das avaliações
      const ratingInfo = document.createElement("div");
      ratingInfo.classList.add("album-rating-info");

      const averageText = document.createElement("span");
      averageText.classList.add("album-average");
      averageText.textContent = `★ ${average.toFixed(1)}`;

      const countText = document.createElement("span");
      countText.classList.add("album-rating-count");
      countText.textContent =
         `${ratingCount} ${ratingCount === 1 ? "avaliação" : "avaliações"}`;

      ratingInfo.appendChild(averageText);
      ratingInfo.appendChild(countText);

      card.appendChild(cover);
      card.appendChild(name);
      card.appendChild(artist);
      card.appendChild(year);
      card.appendChild(ratingInfo);

      // Abrir página de detalhes do álbum
      card.style.cursor = "pointer";

      card.addEventListener("click", async () => {

         await saveAlbum(album);

         window.location.href =
            `album.html?collectionId=${album.collectionId}`;

      });

      container.appendChild(card);

   });

   filterAlbums();

}






// ========================================
// EXIBIR MÚSICAS
// ========================================

function displaySongs(songs) {

   if (!songs || songs.length === 0) {
      return null;
   }

   const container = document.getElementById("song-api-results");

   if (!container) {
      console.warn("Contêiner de músicas não encontrado.");
      return null;
   }

   songs.forEach(song => {

      const card = document.createElement("div");
      card.classList.add("song-api-card");

      const cover = createCover(
         song.artworkUrl100,
         `Capa da música ${song.trackName || "desconhecida"}`
      );

      const name = document.createElement("h3");
      name.textContent = song.trackName || "Música desconhecida";

      const artist = document.createElement("p");
      artist.textContent = song.artistName || "Artista desconhecido";

      // Guardar informações para os filtros
      card.dataset.title =
         (song.trackName || "").toLowerCase();

      card.dataset.artist =
         (song.artistName || "").toLowerCase();

      card.dataset.genre =
         (song.primaryGenreName || "").toLowerCase();

      const album = document.createElement("span");
      album.textContent = song.collectionName || "Álbum desconhecido";

      // Informações das avaliações
      const ratingInfo = document.createElement("div");
      ratingInfo.classList.add("song-rating-info");

      const averageText = document.createElement("span");
      averageText.classList.add("song-average");
      averageText.textContent = "★ 0.0";

      const countText = document.createElement("span");
      countText.classList.add("song-rating-count");
      countText.textContent = "0 avaliações";

      ratingInfo.appendChild(averageText);
      ratingInfo.appendChild(countText);

      card.appendChild(cover);
      card.appendChild(name);
      card.appendChild(artist);
      card.appendChild(album);
      card.appendChild(ratingInfo);

      // Abrir página de avaliação da música
      card.style.cursor = "pointer";

      card.addEventListener("click", async () => {

         await saveSong(song);

         window.location.href =
            `song-details.html?trackId=${song.trackId}`;

      });

      container.appendChild(card);

   });

   return container;
}


// ========================================
// CARREGAR MÉDIAS DAS MÚSICAS
// ========================================

async function loadSongRatings(songs, container, searchId) {


   if (!container || !Array.isArray(songs) || songs.length === 0) {
      return;
   }
   try {

      // Buscar músicas cadastradas no Supabase
      const externalIds = songs
         .map(song => song.trackId)
         .filter(Boolean);

      if (externalIds.length === 0) {
         return;
      }

      const { data: songsData, error: songsError } = await supabase
         .from("songs")
         .select("id, external_id")
         .in("external_id", externalIds);

      if (songsError) {
         throw songsError;
      }

      const songRecords = songsData || [];

      const songIds = songRecords.map(song => song.id);

      if (songIds.length === 0) {
         return;
      }

      // Buscar avaliações das músicas
      const { data: ratings, error: ratingsError } = await supabase
         .from("ratings")
         .select("song_id, rating")
         .in("song_id", songIds);

      if (ratingsError) {
         throw ratingsError;
      }

      // Ignorar avaliações de pesquisas antigas
      if (searchId !== currentSearchId) {
         return;
      }

      // Calcular médias e quantidades
      const ratingStats = new Map();

      (ratings || []).forEach(item => {

         const current = ratingStats.get(item.song_id) || {
            total: 0,
            count: 0
         };

         current.total += Number(item.rating);
         current.count++;

         ratingStats.set(item.song_id, current);

      });

      // Atualizar os cards com os valores reais
      const cards = container.querySelectorAll(".song-api-card");

      songs.forEach((song, index) => {

         const card = cards[index];

         if (!card) {
            return;
         }

         const record = songRecords.find(
            item => String(item.external_id) === String(song.trackId)
         );

         const stats = record
            ? ratingStats.get(record.id)
            : null;

         const average = stats && stats.count > 0
            ? stats.total / stats.count
            : 0;

         const count = stats ? stats.count : 0;

         const averageText = card.querySelector(".song-average");
         const countText = card.querySelector(".song-rating-count");

         averageText.textContent = `★ ${average.toFixed(1)}`;

         countText.textContent =
            `${count} ${count === 1 ? "avaliação" : "avaliações"}`;

      });

   } catch (error) {

      console.error("Erro ao carregar médias das músicas:", error);

   }

}




// ========================================
// PESQUISAR ARTISTAS E ÁLBUNS
// ========================================


async function searchMusic() {

   if (!searchInput || !artistResults || !searchMessage) {
      return;
   }

   const searchId = ++currentSearchId;

   const term = searchInput.value.trim();

   // Salvar pesquisa para restaurar ao voltar
   sessionStorage.setItem("musicRateSearch", term);

   if (!term) {

      searchMessage.textContent = "Digite o nome de um artista ou álbum.";

      artistResults.innerHTML = "";

      const albumResultsContainer = document.getElementById("album-api-results");
      const songResultsContainer = document.getElementById("song-api-results");

      if (albumResultsContainer) {
         albumResultsContainer.innerHTML = "";
      }

      if (songResultsContainer) {
         songResultsContainer.innerHTML = "";
      }

      filterAlbums();

      return;
   }

   const albumResultsContainer = document.getElementById("album-api-results");
   const songResultsContainer = document.getElementById("song-api-results");

   if (albumResultsContainer) {
      albumResultsContainer.innerHTML = "";
   }

   if (songResultsContainer) {
      songResultsContainer.innerHTML = "";
   }

   searchMessage.textContent = "Pesquisando artistas, álbuns e músicas...";

   const searchParts = term.split(/\s[-–—]\s/, 2);

   const hasArtistAndAlbum = searchParts.length === 2;

   const artistTerm = hasArtistAndAlbum
      ? searchParts[0].trim()
      : term;

   const albumTerm = hasArtistAndAlbum
      ? searchParts[1].trim()
      : "";

   function normalizeText(text) {
      return (text || "")
         .toLowerCase()
         .normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "")
         .trim();
   }


   let artists = [];
   let albumsResult = [];
   let songsResult = [];

   try {

      [artists, albumsResult, songsResult] = await Promise.all([
         searchArtists(artistTerm),
         searchAlbums(term),
         searchSongs(hasArtistAndAlbum ? albumTerm : term)
      ]);

      if (searchId !== currentSearchId) {
         return;
      }

   } catch (error) {

      console.error("Erro ao pesquisar músicas:", error);

      searchMessage.textContent =
         "Não foi possível realizar a pesquisa. Tente novamente.";

      return;

   }

   if (searchId !== currentSearchId) {
      return;
   }

   console.log("Artistas encontrados:", artists);
   console.log("Álbuns encontrados:", albumsResult);
   console.log("Músicas encontradas:", songsResult);

   const exactArtist = artists.find(artist =>
      normalizeText(artist.artistName) === normalizeText(artistTerm)
   );

   let albums = albumsResult;
   let songs = songsResult;

   if (exactArtist) {

      albums = albumsResult.filter(album =>
         normalizeText(album.artistName) ===
         normalizeText(exactArtist.artistName)
      );

      songs = songsResult.filter(song =>
         normalizeText(song.artistName) ===
         normalizeText(exactArtist.artistName)
      );

   }

   // Pesquisa específica: Artista - Álbum ou Música
   if (hasArtistAndAlbum) {

      albums = albums.filter(album =>
         normalizeText(album.artistName) === normalizeText(artistTerm) &&
         normalizeText(album.collectionName).includes(normalizeText(albumTerm))
      );

      songs = songs.filter(song =>
         normalizeText(song.artistName) === normalizeText(artistTerm) &&
         normalizeText(song.trackName).includes(normalizeText(albumTerm))
      );

   }

   if (albums.length === 0 && songs.length === 0) {
      searchMessage.textContent = "Nenhum resultado encontrado.";
      return;
   }

   searchMessage.textContent = "";


   // Exibir álbuns
   await displayAlbums(albums, searchId);

   // Verificar se ainda é a pesquisa mais recente
   if (searchId !== currentSearchId) {
      return;
   }

   // Exibir músicas encontradas
   const songContainer = displaySongs(songs);

   await loadSongRatings(songs, songContainer, searchId);

   // Salvar informações no Supabase
   await saveArtists(artists);
   await saveAlbums(albums);
   await saveSongs(songs);

}




// ========================================
// PESQUISA PELO BOTÃO
// ========================================

if (searchButton) {

   searchButton.addEventListener("click", searchMusic);

}


// ========================================
// PESQUISA AO PRESSIONAR ENTER
// ========================================

if (searchInput) {

   searchInput.addEventListener("input", filterAlbums);

   searchInput.addEventListener("keydown", event => {

      if (event.key === "Enter") {
         searchMusic();
      }

   });

}



// ========================================
// FILTROS POR CATEGORIA
// ========================================

filterButtons.forEach(button => {

   button.addEventListener("click", () => {

      filterButtons.forEach(item => {
         item.classList.remove("active");
      });

      button.classList.add("active");

      activeFilter = button.dataset.filter;

      sessionStorage.setItem("musicRateFilter", activeFilter);

      filterAlbums();

   });

});


// ========================================
// ORDENAÇÃO DOS ÁLBUNS
// ========================================

if (sortSelect) {

   sortSelect.addEventListener("change", () => {

      sessionStorage.setItem("musicRateSort", sortSelect.value);

      sortAlbumCards();

   });

}

// ========================================
// INICIALIZAR FILTROS
// ========================================

filterAlbums();


// Restaurar gênero selecionado
const savedFilter = sessionStorage.getItem("musicRateFilter");

if (savedFilter) {

   activeFilter = savedFilter;

   filterButtons.forEach(button => {

      button.classList.toggle(
         "active",
         button.dataset.filter === savedFilter
      );

   });

}


// Restaurar ordenação dos álbuns
const savedSort = sessionStorage.getItem("musicRateSort");

if (savedSort && sortSelect) {
   sortSelect.value = savedSort;
}

// ========================================
// RESTAURAR ÚLTIMA PESQUISA
// ========================================

const savedSearch = sessionStorage.getItem("musicRateSearch");

if (savedSearch && searchInput) {

   searchInput.value = savedSearch;

   searchMusic();

}