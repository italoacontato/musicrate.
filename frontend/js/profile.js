
// ========================================
// PERFIL DO USUÁRIO - MUSICRATE
// ========================================

import { supabase } from "./supabase.js";


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const profileName = document.getElementById("profile-name");
const profileUsername = document.getElementById("profile-username");
const profileEmail = document.getElementById("profile-email");
const profileAvatar = document.getElementById("profile-avatar");
const avatarInput = document.getElementById("avatar-input");
const profileMessage = document.getElementById("profile-message");
const logoutButton = document.getElementById("logout-button");


// ========================================
// CARREGAR PERFIL
// ========================================

async function loadProfile() {

    profileMessage.textContent = "Carregando perfil...";

    // Verificar usuário autenticado

    const { data: userData, error: userError } =
        await supabase.auth.getUser();

    if (userError || !userData.user) {
        window.location.href = "./login.html";
        return;
    }

    const user = userData.user;

    // Buscar perfil no banco de dados

    const { data: existingProfile, error: profileError } =
        await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

    if (profileError) {

        console.error("Erro ao buscar perfil:", profileError);

        profileMessage.textContent =
            "Não foi possível carregar seu perfil.";

        return;
    }

    let profile = existingProfile;

    // Criar perfil caso ainda não exista

    if (!profile) {

        const newProfile = {
            id: user.id,
            username: user.user_metadata?.username || "",
            full_name: user.user_metadata?.full_name || ""
        };

        const { data, error } = await supabase
            .from("profiles")
            .insert(newProfile)
            .select()
            .single();

        if (error) {

            console.error("Erro ao criar perfil:", error);

            profileMessage.textContent =
                "Não foi possível criar seu perfil.";

            return;
        }

        profile = data;
    }

    // Exibir informações

    profileName.textContent =
        profile.full_name || "Usuário MusicRate";

    profileUsername.textContent =
        profile.username ? `@${profile.username}` : "Usuário";

    profileEmail.textContent = user.email || "";

    // Exibir foto ou inicial do usuário

    if (profile.avatar_url) {

        profileAvatar.innerHTML = "";

        const image = document.createElement("img");

        image.src = profile.avatar_url;
        image.alt = "Foto de perfil";

        profileAvatar.appendChild(image);

    } else {

        const name = profile.full_name || profile.username || "U";

        profileAvatar.textContent = name.charAt(0).toUpperCase();

    }

    profileMessage.textContent = "";

    // Carregar informações complementares

    await loadRatingHistory(user.id);
    await loadFavoriteAlbums(user.id);
    await loadFavoriteSongs(user.id);
    await loadUserStatistics(user.id);

}


// ========================================
// HISTÓRICO DE AVALIAÇÕES
// ========================================

async function loadRatingHistory(userId) {

    const historyContainer =
        document.getElementById("rating-history");

    const { data: ratings, error } = await supabase
        .from("ratings")
        .select(`
            id,
            rating,
            review,
            created_at,
            albums (
                title,
                cover_url
            ),
            songs (
                title
            )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {

        console.error("Erro ao carregar histórico:", error);

        historyContainer.textContent =
            "Não foi possível carregar seu histórico.";

        return;
    }

    historyContainer.innerHTML = "";

    if (!ratings || ratings.length === 0) {

        historyContainer.textContent =
            "Você ainda não realizou nenhuma avaliação.";

        return;
    }

    ratings.forEach(item => {

        const card = document.createElement("div");

        card.classList.add("history-card");

        const title = document.createElement("h3");

        title.textContent =
            item.albums?.title ||
            item.songs?.title ||
            "Item não identificado";

        const score = document.createElement("p");

        score.textContent = `Nota: ${item.rating}/10`;

        const review = document.createElement("p");

        review.textContent =
            item.review || "Sem comentário.";

        card.appendChild(title);
        card.appendChild(score);
        card.appendChild(review);

        historyContainer.appendChild(card);

    });

}


// ========================================
// CARREGAR ÁLBUNS FAVORITOS
// ========================================

async function loadFavoriteAlbums(userId) {

    const favoritesContainer =
        document.getElementById("favorite-albums");

    const { data: favorites, error } = await supabase
        .from("favorites")
        .select(`
            id,
            albums (
                title,
                cover_url
            )
        `)
        .eq("user_id", userId)
        .not("album_id", "is", null)
        .order("created_at", { ascending: false });

    if (error) {

        console.error("Erro ao carregar favoritos:", error);

        favoritesContainer.textContent =
            "Não foi possível carregar seus favoritos.";

        return;
    }

    favoritesContainer.innerHTML = "";
    console.log("Álbuns favoritos:", favorites);

    if (!favorites || favorites.length === 0) {

        favoritesContainer.textContent =
            "Você ainda não possui álbuns favoritos.";

        return;
    }

    favorites.forEach(item => {

        const album = item.albums;

        if (!album) return;

        const card = document.createElement("div");

        card.classList.add("favorite-card");

        if (album.cover_url) {

            const cover = document.createElement("img");

            cover.src = album.cover_url.replace(
                /\/\d+x\d+bb\./,
                "/600x600bb."
            );
            cover.alt = `Capa do álbum ${album.title}`;

            card.appendChild(cover);

        }

        const title = document.createElement("h3");

        title.textContent = album.title;

        card.appendChild(title);

        favoritesContainer.appendChild(card);

    });

}


// ========================================
// CARREGAR MÚSICAS FAVORITAS
// ========================================


async function loadFavoriteSongs(userId) {

    const favoritesContainer =
        document.getElementById("favorite-songs");

    const { data: favorites, error } = await supabase
        .from("favorites")
        .select(`
            id,
            songs (
                title,
                albums (
                    cover_url
                )
            )
        `)
        .eq("user_id", userId)
        .not("song_id", "is", null)
        .order("created_at", { ascending: false });

    if (error) {

        console.error("Erro ao carregar músicas favoritas:", error);

        favoritesContainer.textContent =
            "Não foi possível carregar suas músicas favoritas.";

        return;
    }

    favoritesContainer.innerHTML = "";

    if (!favorites || favorites.length === 0) {

        favoritesContainer.textContent =
            "Você ainda não possui músicas favoritas.";

        return;
    }

    favorites.forEach(item => {

        const song = item.songs;

        if (!song) return;

        const card = document.createElement("div");

        card.classList.add("favorite-card");

        // Utilizar a capa do álbum da música

        const coverUrl = song.albums?.cover_url;

        if (coverUrl) {

            const cover = document.createElement("img");

            cover.src = coverUrl.replace(
                /\/\d+x\d+bb\./,
                "/600x600bb."
            );
            cover.alt = `Capa da música ${song.title}`;

            card.appendChild(cover);

        }

        const title = document.createElement("h3");

        title.textContent = song.title;

        card.appendChild(title);

        favoritesContainer.appendChild(card);

    });

}


// ========================================
// CARREGAR ESTATÍSTICAS DO USUÁRIO
// ========================================

let ratingsChart = null;

async function loadUserStatistics(userId) {

    const { data: ratings, error } = await supabase
        .from("ratings")
        .select("rating, album_id, song_id")
        .eq("user_id", userId);

    if (error) {

        console.error("Erro ao carregar estatísticas:", error);

        return;
    }

    // Total de avaliações

    const totalRatings = ratings.length;

    document.getElementById("stat-total-ratings").textContent =
        totalRatings;

    // Nota média

    const average = totalRatings > 0
        ? ratings.reduce(
            (total, item) => total + Number(item.rating), 0
        ) / totalRatings
        : 0;

    document.getElementById("stat-average-rating").textContent =
        average.toFixed(1);

    // Quantidade de álbuns avaliados

    const albumsRated = ratings.filter(
        item => item.album_id !== null
    ).length;

    document.getElementById("stat-albums-rated").textContent =
        albumsRated;

    // Quantidade de músicas avaliadas

    const songsRated = ratings.filter(
        item => item.song_id !== null
    ).length;

    document.getElementById("stat-songs-rated").textContent =
        songsRated;


    // ========================================
    // GRÁFICO DE DISTRIBUIÇÃO DAS NOTAS
    // ========================================

    const labels = Array.from(
        { length: 21 },
        (_, index) => (index * 0.5).toFixed(1)
    );

    const distribution = labels.map(label =>
        ratings.filter(
            item => Number(item.rating).toFixed(1) === label
        ).length
    );

    const chartCanvas = document.getElementById("ratings-chart");

    if (!chartCanvas || typeof Chart === "undefined") {

        console.error("Canvas ou biblioteca Chart.js não encontrada.");

        return;
    }

    if (ratingsChart) {
        ratingsChart.destroy();
    }

    ratingsChart = new Chart(chartCanvas, {

        type: "bar",

        data: {
            labels: labels,

            datasets: [{
                label: "Quantidade de avaliações",
                data: distribution,
                borderWidth: 1
            }]
        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            scales: {

                y: {
                    beginAtZero: true,

                    ticks: {
                        precision: 0
                    }
                }

            },

            plugins: {

                legend: {
                    display: false
                }

            }

        }

    });

}


// ========================================
// SAIR DA CONTA
// ========================================

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        const { error } = await supabase.auth.signOut();

        if (error) {

            alert("Não foi possível sair da conta.");

            console.error(error);

            return;
        }

        window.location.href = "./login.html";

    });

}


// ========================================
// FOTO DE PERFIL - ENVIO AO SUPABASE
// ========================================

avatarInput.addEventListener("change", async () => {

    const file = avatarInput.files[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert("Selecione uma imagem JPG, PNG ou WebP.");
        avatarInput.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5 MB.");
        avatarInput.value = "";
        return;
    }

    const { data: userData, error: userError } =
        await supabase.auth.getUser();

    if (userError || !userData.user) {
        alert("Você precisa estar autenticado.");
        return;
    }

    const user = userData.user;

    const extension = file.name.split(".").pop().toLowerCase();
    const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

    profileMessage.textContent = "Enviando foto...";

    try {

        // Enviar imagem ao Storage
        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, {
                upsert: false,
                contentType: file.type
            });

        if (uploadError) throw uploadError;

        // Obter URL pública
        const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        const avatarUrl = urlData.publicUrl;

        // Atualizar perfil no banco
        const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: avatarUrl })
            .eq("id", user.id);

        if (updateError) throw updateError;

        // Atualizar imagem exibida
        profileAvatar.innerHTML = "";

        const image = document.createElement("img");
        image.src = avatarUrl;
        image.alt = "Foto de perfil";

        profileAvatar.appendChild(image);

        profileMessage.textContent = "Foto de perfil atualizada!";

    } catch (error) {

        console.error("Erro ao atualizar foto:", error);

        profileMessage.textContent =
            "Não foi possível atualizar sua foto.";

    }

    avatarInput.value = "";

});



// ========================================
// VISUALIZAR FOTO DE PERFIL AMPLIADA
// ========================================

const avatarLightbox = document.getElementById("avatar-lightbox");
const avatarLightboxImage = document.getElementById("avatar-lightbox-image");
const avatarLightboxClose = document.getElementById("avatar-lightbox-close");

// ABRIR FOTO AMPLIADA
profileAvatar.addEventListener("click", () => {
    const avatarImage = profileAvatar.querySelector("img");

    // Só abre se existir uma foto de perfil
    if (!avatarImage) return;

    avatarLightboxImage.src = avatarImage.src;
    avatarLightbox.classList.add("active");
});

// FECHAR PELO BOTÃO
avatarLightboxClose.addEventListener("click", () => {
    avatarLightbox.classList.remove("active");
});

// FECHAR AO CLICAR NO FUNDO
avatarLightbox.addEventListener("click", (event) => {
    if (event.target === avatarLightbox) {
        avatarLightbox.classList.remove("active");
    }
});

// FECHAR COM A TECLA ESC
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        avatarLightbox.classList.remove("active");
    }
});

// ========================================
// INICIALIZAR PÁGINA
// ========================================

loadProfile();
