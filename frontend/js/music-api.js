
/* ========================================
   MUSICRATE - ITUNES SEARCH API
======================================== */

const API_URL = "https://itunes.apple.com/search";


// ========================================
// PESQUISAR ARTISTAS
// ========================================


export async function searchArtists(term) {

    function normalizeText(text) {
        return (text || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    const url = `${API_URL}?term=${encodeURIComponent(term)}&entity=musicArtist&limit=50`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Erro ao consultar artistas.");
        }

        const data = await response.json();

        // Mostrar somente artistas com nome correspondente à pesquisa
        return (data.results || []).filter(artist =>
            normalizeText(artist.artistName) === normalizeText(term)
        );

    } catch (error) {
        console.error("Erro na pesquisa de artistas:", error);
        return [];
    }
}




// ========================================
// PESQUISAR ÁLBUNS
// ========================================


export async function searchAlbums(term) {

    function normalizeText(text) {
        return (text || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    const separator = term.split(/\s[-–—]\s/, 2);

    const hasArtistAndAlbum = separator.length === 2;

    const artistName = hasArtistAndAlbum
        ? separator[0].trim()
        : "";

    const albumName = hasArtistAndAlbum
        ? separator[1].trim()
        : term.trim();

    const url = `${API_URL}?term=${encodeURIComponent(albumName)}&entity=album&limit=200`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Erro ao consultar álbuns.");
        }

        const data = await response.json();

        const albums = data.results || [];

        const fullAlbums = albums.filter(album =>
            Number(album.trackCount) >= 7
        );

        if (!hasArtistAndAlbum) {
            return fullAlbums;
        }

        return fullAlbums.filter(album =>
            normalizeText(album.artistName) === normalizeText(artistName) &&
            normalizeText(album.collectionName).includes(normalizeText(albumName))
        );
        
    } catch (error) {
        console.error("Erro na pesquisa de álbuns:", error);
        return [];
    }
}




// ========================================
// PESQUISAR MÚSICAS
// ========================================

export async function searchSongs(term) {

    const url = `${API_URL}?term=${encodeURIComponent(term)}&entity=musicTrack&limit=20`;
    try {

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Erro ao consultar músicas.");
        }

        const data = await response.json();

        return data.results || [];

    } catch (error) {

        console.error("Erro na pesquisa de músicas:", error);

        return [];

    }

}


// ========================================
// BUSCAR TODAS AS FAIXAS DE UM ÁLBUM
// ========================================

export async function searchAlbumTracks(collectionId) {

    const url = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song`;

    try {

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Erro ao consultar as faixas do álbum.");
        }

        const data = await response.json();

        // Remover o primeiro resultado, que representa o álbum
        // e manter somente as músicas

        return (data.results || []).filter(song =>
            song.wrapperType === "track" &&
            song.kind === "song"
        );

    } catch (error) {

        console.error("Erro ao buscar faixas do álbum:", error);

        return [];

    }

}


