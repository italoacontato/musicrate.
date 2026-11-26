
/* ========================================
   MUSICRATE - DETALHES DA MÚSICA
======================================== */

import { supabase } from "./supabase.js";

console.log("Detalhes da música iniciados!");


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const songCover = document.getElementById("song-cover");
const songTitle = document.getElementById("song-title");
const songArtist = document.getElementById("song-artist");
const songAlbum = document.getElementById("song-album");
const songYear = document.getElementById("song-year");
const songDuration = document.getElementById("song-duration");

const favoriteButton = document.getElementById("favorite-button");
const favoriteMessage = document.getElementById("favorite-message");

const songAverage = document.getElementById("song-average");
const songRatingCount = document.getElementById("song-rating-count");

const ratingValue = document.getElementById("rating-value");
const ratingReview = document.getElementById("rating-review");
const submitRating = document.getElementById("submit-rating");
const ratingMessage = document.getElementById("rating-message");

const communityReviews = document.getElementById("community-reviews");


// ========================================
// IDENTIFICAR A MÚSICA PELA URL
// ========================================

const urlParams = new URLSearchParams(window.location.search);
const trackId = urlParams.get("trackId");

let currentSong = null;
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
// CARREGAR DADOS DA MÚSICA
// ========================================

async function loadSong() {

    try {

        if (!trackId) {
            throw new Error("Identificador da música não encontrado na URL.");
        }

        // Buscar música no Supabase

        const { data: song, error } = await supabase
            .from("songs")
            .select("*")
            .eq("external_id", trackId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!song) {
            throw new Error(
                "Música não encontrada. Acesse primeiro a página do álbum para cadastrar suas faixas."
            );
        }

        currentSong = song;

        await loadFavoriteStatus();

        // Buscar artista

        const { data: artist, error: artistError } = await supabase
            .from("artists")
            .select("name")
            .eq("id", song.artist_id)
            .maybeSingle();

        if (artistError) {
            throw artistError;
        }

        // Buscar álbum

        const { data: album, error: albumError } = await supabase
            .from("albums")
            .select("title, cover_url, release_date")
            .eq("id", song.album_id)
            .maybeSingle();

        if (albumError) {
            throw albumError;
        }

        // Exibir informações

        songTitle.textContent = song.title;

        songArtist.textContent =
            artist?.name || "Artista desconhecido";

        songAlbum.textContent =
            album?.title || "Álbum desconhecido";

        songYear.textContent = album?.release_date
            ? new Date(`${album.release_date}T12:00:00`).getFullYear()
            : "Ano desconhecido";

        songDuration.textContent = song.duration_ms
            ? formatDuration(song.duration_ms)
            : "--:--";

        // Exibir capa do álbum

        if (album?.cover_url) {

            const coverUrl = album.cover_url.replace(
                "100x100bb",
                "600x600bb"
            );

            songCover.style.backgroundImage =
                `url("${coverUrl}")`;

            songCover.style.backgroundSize = "cover";
            songCover.style.backgroundPosition = "center";

            songCover.innerHTML = "";

        } else {

            songCover.textContent = "Capa indisponível";

        }

        // Carregar avaliações

        await loadRatings();

    } catch (error) {

        console.error("Erro ao carregar música:", error);

        songTitle.textContent = "Não foi possível carregar a música.";
        songArtist.textContent = error.message;

        communityReviews.innerHTML = "";

    }

}


// ========================================
// CARREGAR AVALIAÇÕES DA COMUNIDADE
// ========================================

async function loadRatings() {

    const { data: ratings, error } = await supabase
        .from("ratings")
        .select("id, rating, review, created_at, user_id")
        .eq("song_id", currentSong.id)
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

    songAverage.textContent = average.toFixed(1);

    songRatingCount.textContent =
        `${totalRatings} ${totalRatings === 1 ? "avaliação" : "avaliações"} da comunidade`;

    communityReviews.innerHTML = "";

    if (totalRatings === 0) {

        communityReviews.innerHTML =
            "<p>Esta música ainda não possui avaliações. Seja o primeiro!</p>";

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
                "Entre na sua conta para avaliar esta música.";

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

            // Verificar se o usuário já avaliou a música

            const { data: existingRating, error: searchError } =
                await supabase
                    .from("ratings")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("song_id", currentSong.id)
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
                        song_id: currentSong.id,
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
// FAVORITAR E DESFAVORITAR MÚSICA
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
        .eq("song_id", currentSong.id)
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
                .eq("song_id", currentSong.id)
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
                "Música removida dos favoritos.";

        } else {

            const { error } = await supabase
                .from("favorites")
                .insert({
                    user_id: user.id,
                    song_id: currentSong.id
                });

            if (error) throw error;

            favoriteMessage.textContent =
                "Música adicionada aos favoritos!";

        }

        await loadFavoriteStatus();

    } catch (error) {

        console.error("Erro ao atualizar favorito:", error);

        favoriteMessage.textContent =
            "Não foi possível atualizar seus favoritos.";

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

loadSong();
