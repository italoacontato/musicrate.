
import { supabase } from "./supabase.js";

console.log("MusicRate Home iniciado!");

// ========================================
// ELEMENTOS DA PÁGINA INICIAL
// ========================================

const featuredAlbums = document.getElementById("featured-albums");
const recentReviews = document.getElementById("recent-reviews");


// ========================================
// ÁLBUNS EM DESTAQUE
// ========================================

async function loadFeaturedAlbums() {

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        featuredAlbums.innerHTML = "<p>Faça login para visualizar seus álbuns.</p>";
        return;
    }

    const { data: ratings, error } = await supabase
        .from("ratings")
        .select("album_id, rating")
        .eq("user_id", user.id)
        .not("album_id", "is", null);

    if (error) {
        console.error("Erro ao buscar avaliações:", error);
        featuredAlbums.innerHTML = "<p>Não foi possível carregar os álbuns.</p>";
        return;
    }

    const albumStats = {};

    ratings.forEach(rating => {

        if (!albumStats[rating.album_id]) {
            albumStats[rating.album_id] = {
                total: 0,
                count: 0
            };
        }

        albumStats[rating.album_id].total += rating.rating;
        albumStats[rating.album_id].count++;

    });

    const topAlbums = Object.entries(albumStats)
        .map(([id, stats]) => ({
            id,
            average: stats.total / stats.count,
            count: stats.count
        }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 3);

    if (topAlbums.length === 0) {
        featuredAlbums.innerHTML = "<p>Ainda não existem álbuns avaliados.</p>";
        return;
    }

    const albumIds = topAlbums.map(album => album.id);

    const { data: albums, error: albumsError } = await supabase
        .from("albums")
        .select("id, title, cover_url, artist_id")
        .in("id", albumIds);

    if (albumsError) {
        console.error("Erro ao buscar álbuns:", albumsError);
        featuredAlbums.innerHTML = "<p>Não foi possível carregar os álbuns.</p>";
        return;
    }

    const artistIds = [...new Set(albums.map(album => album.artist_id))];

    const { data: artists } = await supabase
        .from("artists")
        .select("id, name")
        .in("id", artistIds);

    featuredAlbums.innerHTML = "";

    topAlbums.forEach((item, index) => {

        const album = albums.find(a => a.id == item.id);

        if (!album) return;

        const artist = artists?.find(a => a.id === album.artist_id);

        const card = document.createElement("div");
        card.className = "album-card";

        card.innerHTML = `
            <span class="album-position">${index + 1}º LUGAR</span>
            <img
             src="${album.cover_url ? album.cover_url.replace("100x100bb", "600x600bb") : "../img/placeholder.png"}"
             alt="${album.title}"
             loading="lazy"
>            <h3>${album.title}</h3>
            <p>${artist?.name || "Artista desconhecido"}</p>
            <span>⭐ ${item.average.toFixed(1)}</span>
            <small>${item.count} avaliações</small>
        `;

        featuredAlbums.appendChild(card);

    });

}


// ========================================
// AVALIAÇÕES RECENTES
// ========================================

async function loadRecentReviews() {

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        recentReviews.innerHTML = "<p>Faça login para visualizar suas avaliações.</p>";
        return;
    }

    const { data: ratings, error } = await supabase
        .from("ratings")
        .select("id, user_id, album_id, song_id, rating, review, created_at")
        .eq("user_id", user.id)
        .not("review", "is", null)
        .neq("review", "")
        .order("created_at", { ascending: false })
        .limit(2);

    if (error) {
        console.error("Erro ao buscar avaliações recentes:", error);
        recentReviews.innerHTML = "<p>Não foi possível carregar as avaliações.</p>";
        return;
    }

    if (!ratings || ratings.length === 0) {
        recentReviews.innerHTML = "<p>Ainda não existem avaliações recentes.</p>";
        return;
    }

    const userIds = [...new Set(ratings.map(r => r.user_id))];
    const albumIds = [...new Set(ratings.filter(r => r.album_id).map(r => r.album_id))];
    const songIds = [...new Set(ratings.filter(r => r.song_id).map(r => r.song_id))];

    const [profilesResult, albumsResult, songsResult] = await Promise.all([

        supabase
            .from("profiles")
            .select("id, full_name, username")
            .in("id", userIds),

        albumIds.length
            ? supabase.from("albums").select("id, title").in("id", albumIds)
            : Promise.resolve({ data: [] }),

        songIds.length
            ? supabase.from("songs").select("id, title").in("id", songIds)
            : Promise.resolve({ data: [] })

    ]);

    const profiles = profilesResult.data || [];
    const albums = albumsResult.data || [];
    const songs = songsResult.data || [];

    recentReviews.innerHTML = "";

    ratings.forEach(rating => {

        const profile = profiles.find(p => p.id === rating.user_id);
        const album = albums.find(a => a.id === rating.album_id);
        const song = songs.find(s => s.id === rating.song_id);

        const contentTitle = album?.title || song?.title || "Conteúdo musical";
        const userName = profile?.full_name || profile?.username || "Usuário";

        const card = document.createElement("div");
        card.className = "review-card";

        card.innerHTML = `
            <h3>${userName}</h3>
            <p>${contentTitle}</p>
            <p>${rating.review}</p>
            <span>⭐ ${Number(rating.rating).toFixed(1)}</span>
        `;

        recentReviews.appendChild(card);

    });

}


// ========================================
// INICIALIZAÇÃO
// ========================================

loadFeaturedAlbums();
loadRecentReviews();
