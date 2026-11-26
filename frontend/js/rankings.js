
// ========================================
// MUSICRATE - RANKINGS
// ========================================

import { supabase } from "./supabase.js";

console.log("Rankings MusicRate iniciado!");


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const albumRanking = document.getElementById("album-ranking");
const songRanking = document.getElementById("song-ranking");


// ========================================
// FORMATAR TEXTO PARA HTML
// ========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}


// ========================================
// CALCULAR MÉDIAS
// ========================================

function calculateAverages(ratings, targetField) {

    const averages = {};

    ratings.forEach(item => {

        const targetId = item[targetField];

        if (!targetId) return;

        if (!averages[targetId]) {
            averages[targetId] = {
                total: 0,
                count: 0
            };
        }

        averages[targetId].total += Number(item.rating);
        averages[targetId].count++;

    });

    return averages;
}


// ========================================
// EXIBIR OS RANKINGS
// ========================================

function displayRanking(container, items, type) {

    if (!items.length) {

        container.innerHTML = `
            <p>Nenhuma avaliação encontrada ainda.</p>
        `;

        return;
    }

    container.innerHTML = items.map((item, index) => {

        const title = escapeHTML(item.title);
        const artist = escapeHTML(item.artist);
        const cover = escapeHTML(
            item.cover || "../img/placeholder.png"
        );

        return `
            <article class="ranking-card">

                <span class="ranking-position">
                    #${index + 1}
                </span>

                <img
                    class="ranking-cover"
                    src="${cover}"
                    alt="Capa de ${title}"
                >

                <div class="ranking-info">

                    <h3>${title}</h3>

                    <p>${artist}</p>

                    <span class="ranking-reviews">
                        ${item.count} avaliações
                    </span>

                </div>

                <div class="ranking-score">

                    <strong>
                        ${item.average.toFixed(1)}
                    </strong>

                    <span>/ 10</span>

                </div>

            </article>
        `;

    }).join("");

    // Imagem alternativa caso a capa não carregue
    container.querySelectorAll(".ranking-cover").forEach(image => {

        image.addEventListener("error", () => {
            image.src = "../img/placeholder.png";
        }, { once: true });

    });

}


// ========================================
// RANKING DE ÁLBUNS
// ========================================

async function loadAlbumRanking() {

    albumRanking.innerHTML = "<p>Carregando álbuns...</p>";

    // Buscar avaliações de álbuns
    const { data: ratings, error } = await supabase
        .from("ratings")
        .select("album_id, rating")
        .not("album_id", "is", null);

    if (error) {
        console.error("Erro ao buscar avaliações de álbuns:", error);
        albumRanking.innerHTML = "<p>Não foi possível carregar o ranking.</p>";
        return;
    }

    const averages = calculateAverages(ratings, "album_id");

    const albumIds = Object.keys(averages);

    if (!albumIds.length) {
        displayRanking(albumRanking, [], "album");
        return;
    }

    // Buscar os álbuns avaliados
    const { data: albums, error: albumError } = await supabase
        .from("albums")
        .select("id, title, cover_url, artist_id")
        .in("id", albumIds);

    if (albumError) {
        console.error("Erro ao buscar álbuns:", albumError);
        albumRanking.innerHTML = "<p>Não foi possível carregar os álbuns.</p>";
        return;
    }

    // Buscar artistas relacionados
    const artistIds = [...new Set(
        albums.map(album => album.artist_id).filter(Boolean)
    )];

    let artists = [];

    if (artistIds.length) {

        const { data, error: artistError } = await supabase
            .from("artists")
            .select("id, name")
            .in("id", artistIds);

        if (artistError) {
            console.error("Erro ao buscar artistas:", artistError);
        } else {
            artists = data || [];
        }

    }

    const artistMap = {};

    artists.forEach(artist => {
        artistMap[artist.id] = artist.name;
    });

    // Montar ranking
    const ranking = albums.map(album => {

        const result = averages[album.id];

        return {
            title: album.title,
            artist: artistMap[album.artist_id] || "Artista desconhecido",
            cover: album.cover_url,
            count: result.count,
            average: result.total / result.count
        };

    });

    // Ordenar pela média e depois pela quantidade de avaliações
    ranking.sort((a, b) =>
        b.average - a.average || b.count - a.count
    );

    displayRanking(
        albumRanking,
        ranking.slice(0, 10),
        "album"
    );

}


// ========================================
// RANKING DE MÚSICAS
// ========================================

async function loadSongRanking() {

    songRanking.innerHTML = "<p>Carregando músicas...</p>";

    // Buscar avaliações de músicas
    const { data: ratings, error } = await supabase
        .from("ratings")
        .select("song_id, rating")
        .not("song_id", "is", null);

    if (error) {
        console.error("Erro ao buscar avaliações de músicas:", error);
        songRanking.innerHTML = "<p>Não foi possível carregar o ranking.</p>";
        return;
    }

    const averages = calculateAverages(ratings, "song_id");

    const songIds = Object.keys(averages);

    if (!songIds.length) {
        displayRanking(songRanking, [], "song");
        return;
    }

    // Buscar músicas avaliadas
    const { data: songs, error: songError } = await supabase
        .from("songs")
        .select(`
        id,
        title,
        artist_id,
        albums (
            cover_url
        )
    `)
        .in("id", songIds);

    if (songError) {
        console.error("Erro ao buscar músicas:", songError);
        songRanking.innerHTML = "<p>Não foi possível carregar as músicas.</p>";
        return;
    }

    // Buscar artistas relacionados
    const artistIds = [...new Set(
        songs.map(song => song.artist_id).filter(Boolean)
    )];

    let artists = [];

    if (artistIds.length) {

        const { data, error: artistError } = await supabase
            .from("artists")
            .select("id, name")
            .in("id", artistIds);

        if (artistError) {
            console.error("Erro ao buscar artistas:", artistError);
        } else {
            artists = data || [];
        }

    }

    const artistMap = {};

    artists.forEach(artist => {
        artistMap[artist.id] = artist.name;
    });

    // Montar ranking
    const ranking = songs.map(song => {

        const result = averages[song.id];

        return {
            title: song.title,
            artist: artistMap[song.artist_id] || "Artista desconhecido",
            cover: song.albums?.cover_url || "../img/placeholder.png", count: result.count,
            average: result.total / result.count
        };

    });

    // Ordenar pela média e depois pela quantidade de avaliações
    ranking.sort((a, b) =>
        b.average - a.average || b.count - a.count
    );

    displayRanking(
        songRanking,
        ranking.slice(0, 10),
        "song"
    );

}


// ========================================
// INICIAR RANKINGS
// ========================================

async function loadRankings() {

    await Promise.all([
        loadAlbumRanking(),
        loadSongRanking()
    ]);

}

loadRankings();
