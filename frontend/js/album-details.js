
/* ========================================
   MUSICRATE - DETALHES DO ÁLBUM
======================================== */

import { supabase } from "./supabase.js";

import { searchAlbumTracks } from "./music-api.js";

console.log("Detalhes do álbum iniciados!");


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const albumCover = document.getElementById("album-cover");
const albumTitle = document.getElementById("album-title");
const favoriteButton = document.getElementById("favorite-button");
const favoriteMessage = document.getElementById("favorite-message");
const albumArtist = document.getElementById("album-artist");
const albumYear = document.getElementById("album-year");
const albumTrackCount = document.getElementById("album-track-count");
const albumDuration = document.getElementById("album-duration");
const albumDescription = document.getElementById("album-description");

const albumAverage = document.getElementById("album-average");
const albumRatingCount = document.getElementById("album-rating-count");

const trackList = document.getElementById("track-list");
const trackNote = document.getElementById("track-note");

const ratingValue = document.getElementById("rating-value");
const submitRating = document.getElementById("submit-rating");
const ratingMessage = document.getElementById("rating-message");
const ratingReview = document.getElementById("rating-review");

const communityReviews = document.getElementById("community-reviews");


// ========================================
// IDENTIFICAR O ÁLBUM PELA URL
// ========================================

const urlParams = new URLSearchParams(window.location.search);
const collectionId = urlParams.get("collectionId");

let currentAlbum = null;
let editingRatingId = null;


// ========================================
// FORMATAR DURAÇÃO
// ========================================

function formatDuration(durationMs) {

    const totalMinutes = Math.floor(durationMs / 60000);

    const seconds = Math.floor((durationMs % 60000) / 1000);

    return `${totalMinutes}:${String(seconds).padStart(2, "0")}`;

}


// ========================================
// RESTAURAR FORMULÁRIO
// ========================================

function resetRatingForm() {

    editingRatingId = null;

    ratingValue.value = "";
    ratingReview.value = "";

    submitRating.textContent = "Enviar avaliação";

}


// ========================================
// CARREGAR DADOS DO ÁLBUM
// ========================================

async function loadAlbum() {

    try {

        if (!collectionId) {
            throw new Error("Identificador do álbum não encontrado na URL.");
        }

        const { data: album, error } = await supabase
            .from("albums")
            .select("*")
            .eq("external_id", collectionId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!album) {
            throw new Error("Álbum não encontrado no banco de dados.");
        }

        currentAlbum = album;
        await loadFavoriteStatus();

        // Buscar artista

        const { data: artist, error: artistError } = await supabase
            .from("artists")
            .select("name")
            .eq("id", album.artist_id)
            .maybeSingle();

        if (artistError) {
            throw artistError;
        }

        // Exibir informações

        albumTitle.textContent = album.title;
        albumArtist.textContent = artist?.name || "Artista desconhecido";

        albumYear.textContent = album.release_date
            ? new Date(`${album.release_date}T12:00:00`).getFullYear()
            : "Ano desconhecido";

        albumDescription.textContent =
            album.genre || "Gênero musical não informado.";

        // Exibir capa

        if (album.cover_url) {

            const coverUrl = album.cover_url.replace(
                "100x100bb",
                "600x600bb"
            );

            albumCover.style.backgroundImage =
                `url("${coverUrl}")`;

            albumCover.style.backgroundSize = "cover";
            albumCover.style.backgroundPosition = "center";

            albumCover.innerHTML = "";

        } else {

            albumCover.textContent = "Capa indisponível";

        }

        // Carregar músicas e avaliações

        await loadTracks();
        await loadRatings();

    } catch (error) {

        console.error("Erro ao carregar álbum:", error);

        albumTitle.textContent = "Não foi possível carregar o álbum.";
        albumArtist.textContent = error.message;

        trackList.innerHTML = "";
        communityReviews.innerHTML = "";

    }

}


// ========================================
// CARREGAR TODAS AS MÚSICAS DO ÁLBUM
// ========================================

async function loadTracks() {

    try {

        // Buscar todas as faixas na API do iTunes

        const songs = await searchAlbumTracks(collectionId);

        trackList.innerHTML = "";

        if (!songs || songs.length === 0) {

            trackList.innerHTML =
                "<p>Nenhuma música encontrada para este álbum.</p>";

            albumTrackCount.textContent = "0 faixas";
            albumDuration.textContent = "0 minutos";

            return;

        }

        // Verificar usuário autenticado

        const { data: sessionData } =
            await supabase.auth.getSession();

        const user = sessionData.session?.user;

        // Identificar músicas já cadastradas

        const trackIds = songs.map(song => song.trackId);

        const { data: existingSongs, error: searchError } = await supabase
            .from("songs")
            .select("external_id")
            .in("external_id", trackIds);

        if (searchError) {
            throw searchError;
        }

        const existingIds = new Set(
            existingSongs.map(song => String(song.external_id))
        );

        // Cadastrar somente músicas que ainda não existem

        if (user) {

            const newSongs = songs
                .filter(song => !existingIds.has(String(song.trackId)))
                .map(song => ({

                    external_id: song.trackId,
                    artist_id: currentAlbum.artist_id,
                    album_id: currentAlbum.id,
                    title: song.trackName,
                    track_number: song.trackNumber || null,
                    duration_ms: song.trackTimeMillis || null,
                    preview_url: song.previewUrl || null

                }));

            if (newSongs.length > 0) {

                const { error: insertError } = await supabase
                    .from("songs")
                    .insert(newSongs);

                if (insertError) {
                    throw insertError;
                }

                console.log(
                    `${newSongs.length} músicas cadastradas no Supabase.`
                );

            }

        }

        // ========================================
        // IDENTIFICAR MÚSICAS CADASTRADAS
        // ========================================

        const { data: savedSongs, error: savedSongsError } = await supabase
            .from("songs")
            .select("id, external_id")
            .eq("album_id", currentAlbum.id)
            .in("external_id", trackIds);

        if (savedSongsError) {
            throw savedSongsError;
        }

        const songIdMap = new Map(
            savedSongs.map(song => [
                String(song.external_id),
                song.id
            ])
        );

        // ========================================
        // IDENTIFICAR MÚSICAS FAVORITADAS
        // ========================================

        let favoriteSongIds = new Set();

        if (user) {

            const { data: favorites, error: favoritesError } = await supabase
                .from("favorites")
                .select("song_id")
                .eq("user_id", user.id)
                .not("song_id", "is", null);

            if (favoritesError) {
                throw favoritesError;
            }

            favoriteSongIds = new Set(
                favorites.map(favorite => favorite.song_id)
            );

        }

        // Exibir todas as músicas encontradas

        let totalDuration = 0;

        songs.forEach((song, index) => {

            totalDuration += song.trackTimeMillis || 0;

            const item = document.createElement("div");
            item.classList.add("track-item");

            const number = document.createElement("span");
            number.classList.add("track-number");

            number.textContent = String(
                song.trackNumber || index + 1
            ).padStart(2, "0");

            const name = document.createElement("a");

            name.classList.add("track-name");

            name.textContent = song.trackName;

            name.href = `song-details.html?trackId=${encodeURIComponent(song.trackId)}`;
            
            name.title = "Ver detalhes e avaliar esta música";

            const duration = document.createElement("span");
            duration.classList.add("track-duration");

            duration.textContent = song.trackTimeMillis
                ? formatDuration(song.trackTimeMillis)
                : "--:--";

            item.appendChild(number);
            item.appendChild(name);
            item.appendChild(duration);

            // Botão de favorito da música

            const songId = songIdMap.get(String(song.trackId));

            if (songId) {

                const favoriteSongButton = document.createElement("button");

                favoriteSongButton.type = "button";
                favoriteSongButton.classList.add("track-favorite-button");

                const isFavorite = favoriteSongIds.has(songId);

                favoriteSongButton.textContent = isFavorite
                    ? "♥"
                    : "♡";

                favoriteSongButton.title = isFavorite
                    ? "Remover dos favoritos"
                    : "Adicionar aos favoritos";

                favoriteSongButton.addEventListener("click", () => {
                    toggleSongFavorite(songId, favoriteSongButton);
                });

                item.appendChild(favoriteSongButton);

            }

            trackList.appendChild(item);

        });

        // Atualizar informações do álbum

        albumTrackCount.textContent =
            `${songs.length} ${songs.length === 1 ? "faixa" : "faixas"}`;

        albumDuration.textContent =
            `${Math.round(totalDuration / 60000)} minutos`;

        trackNote.textContent =
            `Exibindo ${songs.length} faixas do álbum.`;

    } catch (error) {

        console.error("Erro ao carregar músicas:", error);

        trackList.innerHTML =
            "<p>Não foi possível carregar as músicas.</p>";

    }

}


// ========================================
// CARREGAR AVALIAÇÕES DA COMUNIDADE
// ========================================

async function loadRatings() {

    const { data: ratings, error } = await supabase
        .from("ratings")
        .select("id, rating, review, created_at, user_id")
        .eq("album_id", currentAlbum.id)
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    const totalRatings = ratings.length;

    const average = totalRatings > 0
        ? ratings.reduce(
            (total, item) => total + Number(item.rating), 0
        ) / totalRatings
        : 0;

    albumAverage.textContent = average.toFixed(1);

    albumRatingCount.textContent =
        `${totalRatings} ${totalRatings === 1 ? "avaliação" : "avaliações"} da comunidade`;

    communityReviews.innerHTML = "";

    if (totalRatings === 0) {

        communityReviews.innerHTML =
            "<p>Este álbum ainda não possui avaliações. Seja o primeiro!</p>";

        return;

    }

    const userIds = [...new Set(ratings.map(item => item.user_id))];

    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", userIds);

    if (profilesError) {
        throw profilesError;
    }

    // ========================================
    // CARREGAR CURTIDAS DAS AVALIAÇÕES
    // ========================================

    const ratingIds = ratings.map(item => item.id);

    const { data: likes, error: likesError } = await supabase
        .from("likes")
        .select("rating_id, user_id")
        .in("rating_id", ratingIds);

    if (likesError) {
        throw likesError;
    }

    // Verificar usuário conectado

    const { data: sessionData } = await supabase.auth.getSession();

    const loggedUser = sessionData.session?.user;

    // Criar conjunto de avaliações curtidas pelo usuário

    const likedRatings = new Set(
        likes
            .filter(like => like.user_id === loggedUser?.id)
            .map(like => like.rating_id)
    );

    // Exibir avaliações

    ratings.forEach(rating => {

        const profile = profiles.find(
            item => item.id === rating.user_id
        );

        const review = document.createElement("article");
        review.classList.add("community-review");

        const user = document.createElement("div");
        user.classList.add("review-user");

        const avatar = document.createElement("div");
        avatar.classList.add("user-avatar");

        const username =
            profile?.full_name ||
            profile?.username ||
            "Usuário";

        avatar.textContent = username.charAt(0).toUpperCase();

        const userInfo = document.createElement("div");

        const name = document.createElement("h3");
        name.textContent = username;

        const date = document.createElement("span");
        date.textContent = new Date(rating.created_at)
            .toLocaleDateString("pt-BR");

        userInfo.appendChild(name);
        userInfo.appendChild(date);

        user.appendChild(avatar);
        user.appendChild(userInfo);


        const score = document.createElement("div");
        score.classList.add("community-score");
        score.textContent = `★ ${Number(rating.rating).toFixed(1)}/10`;

        review.appendChild(user);
        review.appendChild(score);

        // ========================================
        // EXIBIR CURTIDAS
        // ========================================

        const ratingLikes = likes.filter(
            like => like.rating_id === rating.id
        );

        const likeCount = document.createElement("span");
        likeCount.classList.add("like-count");

        likeCount.textContent =
            `${ratingLikes.length} ${ratingLikes.length === 1 ? "curtida" : "curtidas"}`;

        // Botão de curtir

        const likeButton = document.createElement("button");

        likeButton.type = "button";
        likeButton.classList.add("like-button");

        const alreadyLiked = likedRatings.has(rating.id);

        likeButton.textContent = alreadyLiked ? "♥ Curtido" : "♡ Curtir";

        likeButton.disabled = !loggedUser;

        if (!loggedUser) {
            likeButton.title = "Entre na sua conta para curtir.";
        }

        likeButton.addEventListener("click", () => {
            toggleLike(rating.id);
        });

        const likeContainer = document.createElement("div");
        likeContainer.classList.add("review-likes");

        likeContainer.appendChild(likeButton);
        likeContainer.appendChild(likeCount);

        review.appendChild(likeContainer);

        // Verificar se a avaliação pertence ao usuário conectado

        if (loggedUser && loggedUser.id === rating.user_id) {

            const actions = document.createElement("div");
            actions.classList.add("review-actions");

            // Botão editar

            const editButton = document.createElement("button");

            editButton.type = "button";
            editButton.textContent = "Editar";
            editButton.classList.add("review-edit");

            editButton.addEventListener("click", () => {

                ratingValue.value = rating.rating;
                ratingReview.value = rating.review || "";

                editingRatingId = rating.id;

                submitRating.textContent = "Salvar alterações";

                ratingMessage.textContent =
                    "Você está editando sua avaliação.";

                ratingValue.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            });

            // Botão excluir

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.textContent = "Excluir";
            deleteButton.classList.add("review-delete");

            deleteButton.addEventListener("click", () => {
                deleteRating(rating.id);
            });

            actions.appendChild(editButton);
            actions.appendChild(deleteButton);

            review.appendChild(actions);

        }


        // Exibir texto da resenha

        if (rating.review) {

            const reviewText = document.createElement("p");

            reviewText.classList.add("review-text");

            reviewText.textContent = rating.review;

            review.appendChild(reviewText);

        }

        communityReviews.appendChild(review);

    });

}


// ========================================
// CURTIR E DESCURTIR AVALIAÇÕES
// ========================================

async function toggleLike(ratingId) {

    try {

        const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const user = sessionData.session?.user;

        if (!user) {
            ratingMessage.textContent =
                "Entre na sua conta para curtir avaliações.";
            return;
        }

        // Verificar se já curtiu

        const { data: existingLike, error: searchError } =
            await supabase
                .from("likes")
                .select("id")
                .eq("rating_id", ratingId)
                .eq("user_id", user.id)
                .maybeSingle();

        if (searchError) {
            throw searchError;
        }

        if (existingLike) {

            // Remover curtida

            const { error: deleteError } = await supabase
                .from("likes")
                .delete()
                .eq("id", existingLike.id)
                .eq("user_id", user.id);

            if (deleteError) {
                throw deleteError;
            }

        } else {

            // Adicionar curtida

            const { error: insertError } = await supabase
                .from("likes")
                .insert({
                    user_id: user.id,
                    rating_id: ratingId
                });

            if (insertError) {
                throw insertError;
            }

        }

        // Atualizar avaliações e curtidas

        await loadRatings();

    } catch (error) {

        console.error("Erro ao atualizar curtida:", error);

        ratingMessage.textContent =
            "Não foi possível atualizar a curtida.";

    }

}


// ========================================
// ENVIAR OU EDITAR AVALIAÇÃO
// ========================================

async function sendRating() {

    try {

        ratingMessage.textContent = "";

        const rating = Number(ratingValue.value);
        const review = ratingReview.value.trim();

        // Validar nota

        if (
            ratingValue.value.trim() === "" ||
            !Number.isFinite(rating) ||
            rating < 0 ||
            rating > 10 ||
            !Number.isInteger(rating * 2)
        ) {

            ratingMessage.textContent =
                "Informe uma nota entre 0 e 10, em intervalos de 0,5.";

            return;

        }

        // Verificar usuário autenticado

        const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const user = sessionData.session?.user;

        if (!user) {

            ratingMessage.textContent =
                "Entre na sua conta para avaliar este álbum.";

            return;

        }

        // Verificar se está editando uma avaliação

        if (editingRatingId) {

            const { error: updateError } = await supabase
                .from("ratings")
                .update({
                    rating,
                    review
                })
                .eq("id", editingRatingId)
                .eq("user_id", user.id);

            if (updateError) {
                throw updateError;
            }

            ratingMessage.textContent =
                "Sua avaliação foi atualizada com sucesso!";

        } else {

            // Verificar se o usuário já avaliou o álbum

            const { data: existingRating, error: searchError } =
                await supabase
                    .from("ratings")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("album_id", currentAlbum.id)
                    .maybeSingle();

            if (searchError) {
                throw searchError;
            }

            if (existingRating) {

                // Atualizar avaliação existente

                const { error: updateError } = await supabase
                    .from("ratings")
                    .update({
                        rating,
                        review
                    })
                    .eq("id", existingRating.id)
                    .eq("user_id", user.id);

                if (updateError) {
                    throw updateError;
                }

                ratingMessage.textContent =
                    "Sua avaliação foi atualizada com sucesso!";

            } else {

                // Inserir nova avaliação

                const { error: insertError } = await supabase
                    .from("ratings")
                    .insert({
                        user_id: user.id,
                        album_id: currentAlbum.id,
                        rating,
                        review
                    });

                if (insertError) {
                    throw insertError;
                }

                ratingMessage.textContent =
                    "Sua avaliação foi registrada com sucesso!";

            }

        }

        // Restaurar formulário

        resetRatingForm();

        // Atualizar avaliações e média

        await loadRatings();

    } catch (error) {

        console.error("Erro ao enviar avaliação:", error);

        ratingMessage.textContent =
            "Não foi possível registrar sua avaliação. Verifique o console.";

    }

}


// ========================================
// EXCLUIR AVALIAÇÃO
// ========================================

async function deleteRating(ratingId) {

    const confirmed = confirm(
        "Tem certeza de que deseja excluir sua avaliação?"
    );

    if (!confirmed) {
        return;
    }

    try {

        const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const user = sessionData.session?.user;

        if (!user) {
            throw new Error("Você precisa estar conectado.");
        }

        const { error } = await supabase
            .from("ratings")
            .delete()
            .eq("id", ratingId)
            .eq("user_id", user.id);

        if (error) {
            throw error;
        }

        resetRatingForm();

        ratingMessage.textContent =
            "Avaliação excluída com sucesso!";

        await loadRatings();

    } catch (error) {

        console.error("Erro ao excluir avaliação:", error);

        ratingMessage.textContent =
            "Não foi possível excluir sua avaliação.";

    }

}


// ========================================
// EVENTO DO BOTÃO DE AVALIAÇÃO
// ========================================

if (submitRating) {

    submitRating.addEventListener("click", sendRating);

}


// ========================================
// FAVORITAR E DESFAVORITAR ÁLBUM
// ========================================

async function loadFavoriteStatus() {

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
        favoriteButton.textContent = "♡ Adicionar aos favoritos";
        return;
    }

    const { data: favorite, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("album_id", currentAlbum.id)
        .maybeSingle();

    if (error) {
        console.error("Erro ao verificar favorito:", error);
        return;
    }

    favoriteButton.textContent = favorite
        ? "♥ Remover dos favoritos"
        : "♡ Adicionar aos favoritos";
}


async function toggleFavorite() {

    try {

        const { data: userData, error: userError } =
            await supabase.auth.getUser();

        if (userError) throw userError;

        const user = userData.user;

        if (!user) {
            favoriteMessage.textContent =
                "Entre na sua conta para adicionar favoritos.";
            return;
        }

        const { data: existingFavorite, error: searchError } =
            await supabase
                .from("favorites")
                .select("id")
                .eq("user_id", user.id)
                .eq("album_id", currentAlbum.id)
                .maybeSingle();

        if (searchError) throw searchError;

        if (existingFavorite) {

            const { error } = await supabase
                .from("favorites")
                .delete()
                .eq("id", existingFavorite.id)
                .eq("user_id", user.id);

            if (error) throw error;

            favoriteMessage.textContent =
                "Álbum removido dos favoritos.";

        } else {

            const { error } = await supabase
                .from("favorites")
                .insert({
                    user_id: user.id,
                    album_id: currentAlbum.id
                });

            if (error) throw error;

            favoriteMessage.textContent =
                "Álbum adicionado aos favoritos!";
        }

        await loadFavoriteStatus();

    } catch (error) {

        console.error("Erro ao atualizar favorito:", error);

        favoriteMessage.textContent =
            "Não foi possível atualizar seus favoritos.";

    }

}


// ========================================
// FAVORITAR E DESFAVORITAR MÚSICA
// ========================================

async function toggleSongFavorite(songId, button) {

    try {

        const { data: userData, error: userError } =
            await supabase.auth.getUser();

        if (userError) {
            throw userError;
        }

        const user = userData.user;

        if (!user) {

            trackNote.textContent =
                "Entre na sua conta para adicionar músicas aos favoritos.";

            return;

        }

        const { data: existingFavorite, error: searchError } =
            await supabase
                .from("favorites")
                .select("id")
                .eq("user_id", user.id)
                .eq("song_id", songId)
                .maybeSingle();

        if (searchError) {
            throw searchError;
        }

        if (existingFavorite) {

            const { error } = await supabase
                .from("favorites")
                .delete()
                .eq("id", existingFavorite.id)
                .eq("user_id", user.id);

            if (error) {
                throw error;
            }

            button.textContent = "♡";
            button.title = "Adicionar aos favoritos";

            trackNote.textContent =
                "Música removida dos favoritos.";

        } else {

            const { error } = await supabase
                .from("favorites")
                .insert({
                    user_id: user.id,
                    song_id: songId
                });

            if (error) {
                throw error;
            }

            button.textContent = "♥";
            button.title = "Remover dos favoritos";

            trackNote.textContent =
                "Música adicionada aos favoritos!";

        }

    } catch (error) {

        console.error("Erro ao atualizar favorito da música:", error);

        trackNote.textContent =
            "Não foi possível atualizar os favoritos.";

    }

}

// ========================================
// EVENTO DO BOTÃO DE FAVORITOS
// ========================================

if (favoriteButton) {
    favoriteButton.addEventListener("click", toggleFavorite);
}


// ========================================
// INICIALIZAR PÁGINA
// ========================================

loadAlbum();
