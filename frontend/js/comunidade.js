
/* ========================================
   MUSICRATE - COMUNIDADE
======================================== */


// ========================================
// IMPORTAR SUPABASE
// ========================================

import { supabase } from "./supabase.js";



// ========================================
// SELETOR DE EMOJIS
// ========================================

function createEmojiPicker(textarea) {

    const emojis = [
        "😀", "😂", "🥹", "😍", "🥰",
        "😎", "🤔", "😭", "😡", "❤️",
        "💜", "🖤", "💙", "💚", "💛",
        "🔥", "✨", "⭐", "🎵", "🎶",
        "🎸", "🎧", "👏", "🙌", "👍",
        "👎", "💯", "🥳", "🤘", "🫶"
    ];

    const container = document.createElement("div");
    container.classList.add("emoji-picker-container");

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.classList.add("emoji-picker-button");
    toggleButton.innerHTML = `
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
        <path d="M9 9h.01"></path>
        <path d="M15 9h.01"></path>
    </svg>
`;

    toggleButton.title = "Adicionar emoji";
    toggleButton.setAttribute("aria-label", "Adicionar emoji");

    const panel = document.createElement("div");
    panel.classList.add("emoji-picker-panel");
    panel.hidden = true;

    emojis.forEach(emoji => {

        const emojiButton = document.createElement("button");

        emojiButton.type = "button";
        emojiButton.classList.add("emoji-option");
        emojiButton.textContent = emoji;

        emojiButton.addEventListener("click", () => {

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            textarea.setRangeText(
                emoji,
                start,
                end,
                "end"
            );

            textarea.focus();

            textarea.dispatchEvent(
                new Event("input", { bubbles: true })
            );

            panel.hidden = true;
        });

        panel.appendChild(emojiButton);

    });

    toggleButton.addEventListener("click", (event) => {
        event.stopPropagation();
        panel.hidden = !panel.hidden;
    });

    container.addEventListener("click", (event) => {
        event.stopPropagation();
    });

    document.addEventListener("click", () => {
        panel.hidden = true;
    });

    container.append(toggleButton, panel);

    return container;
}


// ========================================
// CONTROLE DE ACESSO À COMUNIDADE
// ========================================

async function checkCommunityAccess() {

    const { data, error } = await supabase.auth.getSession();

    if (error) {
        console.error("Erro ao verificar acesso:", error);
        return null;
    }

    return data.session?.user || null;
}

// ELEMENTOS DA PRÉ-VISUALIZAÇÃO

const imageInput = document.getElementById("post-image");
const imagePreview = document.getElementById("image-preview");
const imagePreviewGrid = document.getElementById("image-preview-grid");
const imagePreviewCount = document.getElementById("image-preview-count");

// IMAGENS SELECIONADAS

let selectedImages = [];

// ========================================
// COMPRIMIR IMAGENS
// ========================================

async function compressImage(file) {

    // Preservar GIFs e SVGs
    if (
        file.type === "image/gif" ||
        file.type === "image/svg+xml"
    ) {
        return file;
    }

    // Comprimir apenas JPEG e PNG
    if (
        file.type !== "image/jpeg" &&
        file.type !== "image/png"
    ) {
        return file;
    }

    const image = new Image();
    const imageUrl = URL.createObjectURL(file);

    try {

        image.src = imageUrl;

        await image.decode();

        const maxWidth = 1200;

        const scale = Math.min(
            1,
            maxWidth / image.width
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");

        context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const blob = await new Promise(resolve => {
            canvas.toBlob(
                resolve,
                "image/webp",
                0.82
            );
        });

        if (!blob) {
            throw new Error("Falha ao comprimir imagem.");
        }

        return new File(
            [blob],
            `${file.name.replace(/\.[^.]+$/, "")}.webp`,
            {
                type: "image/webp",
                lastModified: Date.now()
            }
        );

    } finally {
        URL.revokeObjectURL(imageUrl);
    }
}


// ========================================
// EXTRAIR CAMINHO DA IMAGEM NO STORAGE
// ========================================

function getImagePath(imageUrl) {

    if (!imageUrl) {
        return null;
    }

    try {

        const url = new URL(imageUrl);

        const marker = "/storage/v1/object/public/post-images/";

        const markerIndex = url.pathname.indexOf(marker);

        if (markerIndex === -1) {
            console.error("Caminho do Storage não encontrado:", imageUrl);
            return null;
        }

        const imagePath = url.pathname.slice(
            markerIndex + marker.length
        );

        return decodeURIComponent(imagePath);

    } catch (error) {

        console.error("Erro ao extrair caminho da imagem:", error);
        return null;
    }
}


// ========================================
// IDENTIFICAR USUÁRIO AUTENTICADO
// ========================================

async function getCurrentUser() {

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
        console.error("Erro ao identificar usuário:", error);
        return null;
    }

    return user;


}



// ========================================
// PUBLICAR TEXTO E VÁRIAS IMAGENS
// ========================================

const postContent = document.getElementById("post-content");

const postEmojiPicker = createEmojiPicker(postContent);

const postImageLabel = document.querySelector(
    'label[for="post-image"]'
);

const postMediaActions = document.createElement("div");
postMediaActions.classList.add("post-media-actions");

postImageLabel.parentNode.insertBefore(
    postMediaActions,
    postImageLabel
);

postMediaActions.append(
    postEmojiPicker,
    postImageLabel
);

const publishButton = document.getElementById("publish-button");

// ========================================
// ACESSO AO FORMULÁRIO DE PUBLICAÇÃO
// ========================================

const postCreate = document.querySelector(".post-create");

const loginPrompt = document.createElement("div");
loginPrompt.classList.add("community-login-prompt");

loginPrompt.innerHTML = `
    <p>Entre na sua conta para compartilhar suas publicações!</p>

    <div>
        <a href="login.html">Entrar</a>
        <a href="cadastro.html">Criar conta</a>
    </div>
`;

postCreate.insertAdjacentElement("beforebegin", loginPrompt);


// ========================================
// ATUALIZAR ACESSO CONFORME A SESSÃO
// ========================================

async function updateCommunityAccess() {

    const user = await checkCommunityAccess();

    if (postCreate) {
        postCreate.hidden = !user;
    }

    loginPrompt.hidden = Boolean(user);
}

updateCommunityAccess();

supabase.auth.onAuthStateChange(() => {
    updateCommunityAccess();
});

// ========================================
// NOTIFICAÇÃO PERSONALIZADA
// ========================================

function showPostAlert() {

    const notification = document.createElement("div");
    notification.classList.add("post-notification");

    const icon = document.createElement("span");
    icon.textContent = "⚠";

    const message = document.createElement("span");
    message.textContent = "Adicione um texto ou uma imagem antes de publicar.";

    notification.append(icon, message);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add("hide");

        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

publishButton.addEventListener("click", async () => {

    const content = postContent.value.trim();

    if (!content && selectedImages.length === 0) {
        showPostAlert();
        return;
    }

    const user = await getCurrentUser();

    if (!user) {
        alert("Você precisa entrar na sua conta para publicar.");
        return;
    }

    publishButton.disabled = true;

    const uploadedImages = [];

    try {

        // ========================================
        // ENVIAR IMAGENS PARA O STORAGE
        // ========================================

        for (const image of selectedImages) {

            const file = image.file;

            const optimizedFile = await compressImage(file);

            const fileExtension = optimizedFile.type === "image/webp"
                ? "webp"
                : file.name.split(".").pop().toLowerCase();

            const filePath =
                `${user.id}/${crypto.randomUUID()}.${fileExtension}`;

            const { error: uploadError } = await supabase.storage
                .from("post-images")
                .upload(filePath, optimizedFile, {
                    contentType: optimizedFile.type,
                    upsert: false
                });

            if (uploadError) {
                throw uploadError;
            }

            const { data: publicUrlData } = supabase.storage
                .from("post-images")
                .getPublicUrl(filePath);

            uploadedImages.push({
                image_url: publicUrlData.publicUrl,
                file_path: filePath
            });

        }


        // ========================================
        // CRIAR PUBLICAÇÃO
        // ========================================

        const firstImageUrl = uploadedImages.length > 0
            ? uploadedImages[0].image_url
            : null;

        const { data: postData, error: postError } = await supabase
            .from("posts")
            .insert({
                user_id: user.id,
                content: content,
                image_url: firstImageUrl
            })
            .select("id")
            .single();

        if (postError) {
            throw postError;
        }


        // ========================================
        // SALVAR IMAGENS NA TABELA POST_IMAGES
        // ========================================

        if (uploadedImages.length > 0) {

            const imageRecords = uploadedImages.map((image, index) => ({
                post_id: postData.id,
                image_url: image.image_url,
                position: index
            }));

            const { error: imagesError } = await supabase
                .from("post_images")
                .insert(imageRecords);

            if (imagesError) {

                console.error("Erro ao salvar imagens:", imagesError);

                // Remover publicação criada
                await supabase
                    .from("posts")
                    .delete()
                    .eq("id", postData.id)
                    .eq("user_id", user.id);

                throw imagesError;
            }

        }


        // ========================================
        // LIMPAR FORMULÁRIO
        // ========================================

        postContent.value = "";

        selectedImages.forEach(image => {
            URL.revokeObjectURL(image.url);
        });

        selectedImages = [];

        imageInput.value = "";

        renderImagePreview();

        await reloadLoadedPosts();

    } catch (error) {

        console.error("Erro ao publicar:", {
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
            error
        });

        // Remover arquivos enviados caso ocorra algum erro
        if (uploadedImages.length > 0) {

            const filePaths = uploadedImages.map(image => image.file_path);

            const { error: cleanupError } = await supabase.storage
                .from("post-images")
                .remove(filePaths);

            if (cleanupError) {
                console.error("Erro ao limpar imagens:", cleanupError);
            }

        }

        alert("Não foi possível publicar. Tente novamente.");

    } finally {

        publishButton.disabled = false;

    }

});



// ========================================
// CARREGAR PUBLICAÇÕES
// ========================================

const postsContainer = document.getElementById("posts-container");

// ========================================
// CONTROLE DE PAGINAÇÃO DO FEED
// ========================================

const POSTS_PER_PAGE = 10;

let currentPage = 0;
let hasMorePosts = true;
let isLoadingPosts = false;

// Botão para carregar mais publicações
const loadMoreButton = document.createElement("button");

loadMoreButton.type = "button";
loadMoreButton.textContent = "Carregar mais publicações";
loadMoreButton.classList.add("load-more-posts-button");
loadMoreButton.hidden = true;

postsContainer.insertAdjacentElement("afterend", loadMoreButton);

loadMoreButton.addEventListener("click", () => {
    loadPosts(false);
});

// ========================================
// VISUALIZAR IMAGEM AMPLIADA
// ========================================

const imageLightbox = document.createElement("div");
imageLightbox.classList.add("image-lightbox");

const lightboxImage = document.createElement("img");
lightboxImage.classList.add("image-lightbox-img");
lightboxImage.alt = "Imagem ampliada da publicação";

const closeLightboxButton = document.createElement("button");
closeLightboxButton.type = "button";
closeLightboxButton.classList.add("image-lightbox-close");
closeLightboxButton.textContent = "×";
closeLightboxButton.setAttribute("aria-label", "Fechar imagem");

imageLightbox.append(closeLightboxButton, lightboxImage);
document.body.appendChild(imageLightbox);

// Abrir imagem
function openImageLightbox(src) {
    lightboxImage.src = src;
    imageLightbox.classList.add("active");
    document.body.style.overflow = "hidden";
}

// Fechar imagem
function closeImageLightbox() {
    imageLightbox.classList.remove("active");
    document.body.style.overflow = "";
    lightboxImage.src = "";
}

closeLightboxButton.addEventListener("click", closeImageLightbox);

imageLightbox.addEventListener("click", (event) => {
    if (event.target === imageLightbox) {
        closeImageLightbox();
    }
});

// Fechar usando a tecla ESC
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeImageLightbox();
    }
});


// LOADPOSTS

async function loadPosts(reset = true) {

    if (isLoadingPosts) return;

    if (!reset && !hasMorePosts) return;

    isLoadingPosts = true;
    loadMoreButton.disabled = true;

    const urlParams = new URLSearchParams(window.location.search);

    const targetPostId = urlParams.get("post");
    const targetCommentId = urlParams.get("comment");

    if (reset) {
        currentPage = 0;
        hasMorePosts = true;

        postsContainer.innerHTML = "";

        loadMoreButton.hidden = true;
    }


    const start = currentPage * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE - 1;

    let { data: posts, error } = await supabase
        .from("posts")
        .select("id, user_id, content, image_url, created_at")
        .order("created_at", { ascending: false })
        .range(start, end);

    if (error) {

        console.error("Erro ao carregar publicações:", error);

        if (reset) {
            postsContainer.innerHTML =
                "<p>Não foi possível carregar as publicações.</p>";
        }

        isLoadingPosts = false;
        loadMoreButton.disabled = false;

        return;
    }


    const fetchedPostsCount = (posts || []).length;

    // ========================================
    // LOCALIZAR PUBLICAÇÃO DA NOTIFICAÇÃO
    // ========================================

    if (reset && targetPostId) {

        const postAlreadyLoaded = (posts || []).some(
            post => String(post.id) === String(targetPostId)
        );

        if (!postAlreadyLoaded) {

            const { data: targetPost, error: targetPostError } = await supabase
                .from("posts")
                .select("id, user_id, content, image_url, created_at")
                .eq("id", targetPostId)
                .maybeSingle();

            if (targetPostError) {
                console.error("Erro ao localizar publicação:", targetPostError);
            } else if (targetPost) {
                posts = [targetPost, ...(posts || [])];
            }
        }
    }

    // Evitar duplicar a publicação ao carregar outras páginas
    if (!reset && targetPostId) {
        posts = (posts || []).filter(
            post => String(post.id) !== String(targetPostId)
        );
    }

    if (!posts || posts.length === 0) {

        if (reset) {
            postsContainer.innerHTML =
                "<p>Nenhuma publicação ainda. Seja o primeiro a compartilhar!</p>";
        }

        hasMorePosts = false;
        loadMoreButton.hidden = true;

        isLoadingPosts = false;
        loadMoreButton.disabled = false;

        return;
    }

    currentPage++;

    hasMorePosts = fetchedPostsCount === POSTS_PER_PAGE;



    // ========================================
    // CARREGAR DADOS DAS PUBLICAÇÕES EM PARALELO
    // ========================================

    const userIds = [...new Set(posts.map(post => post.user_id))];

    const [
        postImagesResult,
        profilesResult,
        currentUser,
        postLikesResult,
        postCommentsResult
    ] = await Promise.all([

        supabase
            .from("post_images")
            .select("id, post_id, image_url, position")
            .in("post_id", posts.map(post => post.id))
            .order("position", { ascending: true }),

        supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .in("id", userIds),

        getCurrentUser(),

        supabase
            .from("post_likes")
            .select("post_id, user_id")
            .in("post_id", posts.map(post => post.id)),

        supabase
            .from("post_comments")
            .select("id, post_id, user_id, content, created_at, parent_comment_id")
            .in("post_id", posts.map(post => post.id))

    ]);

    // ========================================
    // PROCESSAR IMAGENS DAS PUBLICAÇÕES
    // ========================================

    const { data: postImages, error: postImagesError } = postImagesResult;

    if (postImagesError) {
        console.error("Erro ao carregar imagens:", postImagesError);
    }

    const postImagesMap = new Map();

    posts.forEach(post => {
        postImagesMap.set(post.id, []);
    });

    (postImages || []).forEach(image => {

        if (postImagesMap.has(image.post_id)) {
            postImagesMap.get(image.post_id).push(image);
        }

    });

    posts.forEach(post => {

        const images = postImagesMap.get(post.id);

        if (images.length === 0 && post.image_url) {

            images.push({
                image_url: post.image_url,
                position: 0
            });

        }

        post.images = images;

    });

    // ========================================
    // PROCESSAR PERFIS DOS AUTORES
    // ========================================

    const { data: profiles, error: profilesError } = profilesResult;

    if (profilesError) {
        console.error("Erro ao carregar autores:", profilesError);
    }

    const profilesMap = new Map(
        (profiles || []).map(profile => [profile.id, profile])
    );

    // ========================================
    // PROCESSAR CURTIDAS DAS PUBLICAÇÕES
    // ========================================

    const { data: postLikes, error: likesError } = postLikesResult;

    if (likesError) {
        console.error("Erro ao carregar curtidas:", likesError);
    }

    const likesMap = new Map();

    (postLikes || []).forEach(like => {

        if (!likesMap.has(like.post_id)) {
            likesMap.set(like.post_id, []);
        }

        likesMap.get(like.post_id).push(like.user_id);

    });

    // ========================================
    // PROCESSAR COMENTÁRIOS
    // ========================================

    const { data: postComments, error: commentsError } = postCommentsResult;

    if (commentsError) {
        console.error("Erro ao carregar comentários:", commentsError);
    }



    // ========================================
    // PREPARAR DADOS DOS COMENTÁRIOS
    // ========================================

    const commentIds = (postComments || []).map(comment => comment.id);

    const commentUserIds = [
        ...new Set((postComments || []).map(comment => comment.user_id))
    ];

    let commentImages = [];
    let commentLikesMap = new Map();

    // ========================================
    // CARREGAR DADOS DOS COMENTÁRIOS EM PARALELO
    // ========================================

    if (commentIds.length > 0) {

        const [
            commentLikesResult,
            commentImagesResult,
            commentProfilesResult
        ] = await Promise.all([

            // Curtidas dos comentários
            supabase
                .from("comment_likes")
                .select("comment_id, user_id")
                .in("comment_id", commentIds),

            // Imagens dos comentários
            supabase
                .from("comment_images")
                .select("id, comment_id, image_url")
                .in("comment_id", commentIds),

            // Perfis dos autores
            supabase
                .from("profiles")
                .select("id, full_name, username, avatar_url")
                .in("id", commentUserIds)

        ]);

        // ========================================
        // PROCESSAR CURTIDAS
        // ========================================

        const { data: commentLikes, error: commentLikesError } =
            commentLikesResult;

        if (commentLikesError) {
            console.error(
                "Erro ao carregar curtidas dos comentários:",
                commentLikesError
            );
        } else {

            (commentLikes || []).forEach(like => {

                if (!commentLikesMap.has(like.comment_id)) {
                    commentLikesMap.set(like.comment_id, []);
                }

                commentLikesMap.get(like.comment_id).push(like.user_id);

            });

        }

        // ========================================
        // PROCESSAR IMAGENS
        // ========================================

        const {
            data: imagesData,
            error: commentImagesError
        } = commentImagesResult;

        if (commentImagesError) {
            console.error(
                "Erro ao carregar imagens dos comentários:",
                commentImagesError
            );
        } else {
            commentImages = imagesData || [];
        }

        // ========================================
        // PROCESSAR PERFIS DOS AUTORES
        // ========================================

        const {
            data: commentProfiles,
            error: commentProfilesError
        } = commentProfilesResult;

        if (commentProfilesError) {
            console.error(
                "Erro ao carregar autores dos comentários:",
                commentProfilesError
            );
        } else {

            (commentProfiles || []).forEach(profile => {
                profilesMap.set(profile.id, profile);
            });

        }

    }

    // ========================================
    // ASSOCIAR IMAGENS AOS COMENTÁRIOS
    // ========================================

    const commentImagesMap = new Map();

    commentIds.forEach(commentId => {
        commentImagesMap.set(commentId, []);
    });

    commentImages.forEach(image => {

        if (commentImagesMap.has(image.comment_id)) {
            commentImagesMap.get(image.comment_id).push(image);
        }

    });

    (postComments || []).forEach(comment => {
        comment.images = commentImagesMap.get(comment.id) || [];
    });

    // ========================================
    // ORGANIZAR COMENTÁRIOS POR PUBLICAÇÃO
    // ========================================

    const commentsMap = new Map();

    (postComments || []).forEach(comment => {

        if (!commentsMap.has(comment.post_id)) {
            commentsMap.set(comment.post_id, []);
        }

        commentsMap.get(comment.post_id).push(comment);

    });


    posts.forEach(post => {

        const profile = profilesMap.get(post.user_id);

        const authorName =
            profile?.full_name ||
            profile?.username ||
            "Usuário";

        const postDate = new Date(post.created_at).toLocaleString("pt-BR");

        const postCard = document.createElement("article");
        postCard.classList.add("post-card");

        postCard.id = `post-${post.id}`;

        // Informações do autor
        const authorContainer = document.createElement("div");
        authorContainer.classList.add("post-author");

        const authorAvatar = document.createElement("img");
        authorAvatar.classList.add("post-author-avatar");

        if (profile?.avatar_url) {
            authorAvatar.src = profile.avatar_url;
            authorAvatar.alt = `Foto de ${authorName}`;
        } else {
            authorAvatar.src = "";
            authorAvatar.alt = "";
            authorAvatar.style.display = "none";
        }

        const author = document.createElement("h3");
        author.classList.add("post-author-name");
        author.textContent = authorName;

        authorContainer.append(authorAvatar, author);

        const date = document.createElement("span");
        date.classList.add("post-date");
        date.textContent = postDate;

        const content = document.createElement("p");
        content.classList.add("post-content");
        content.textContent = post.content;

        postCard.append(authorContainer, date, content);


        // ========================================
        // EXIBIR GALERIA DE IMAGENS
        // ========================================

        let imagesGallery = null;


        // RENDERIZA POSTS

        function renderPostImages() {

            if (imagesGallery) {
                imagesGallery.remove();
                imagesGallery = null;
            }

            if (!post.images || post.images.length === 0) {
                return;
            }

            imagesGallery = document.createElement("div");
            imagesGallery.classList.add("post-images-gallery");

            const viewport = document.createElement("div");
            viewport.classList.add("post-gallery-viewport");

            const track = document.createElement("div");
            track.classList.add("post-gallery-track");

            let currentIndex = 0;

            post.images.forEach((imageData, index) => {

                const imageContainer = document.createElement("div");
                imageContainer.classList.add("post-gallery-item");

                const image = document.createElement("img");

                image.src = imageData.image_url;
                image.alt = `Imagem ${index + 1} da publicação`;
                image.classList.add("post-image");
                image.title = "Clique para ampliar";

                image.loading = "lazy";
                image.decoding = "async";

                image.addEventListener("click", () => {
                    openImageLightbox(image.src);
                });

                imageContainer.appendChild(image);
                track.appendChild(imageContainer);

            });

            viewport.appendChild(track);
            imagesGallery.appendChild(viewport);

            // CONTROLES DO CARROSSEL

            if (post.images.length > 1) {

                const previousButton = document.createElement("button");
                previousButton.type = "button";
                previousButton.classList.add("gallery-arrow", "gallery-previous");
                previousButton.textContent = "‹";
                previousButton.setAttribute("aria-label", "Imagem anterior");

                const nextButton = document.createElement("button");
                nextButton.type = "button";
                nextButton.classList.add("gallery-arrow", "gallery-next");
                nextButton.textContent = "›";
                nextButton.setAttribute("aria-label", "Próxima imagem");

                const counter = document.createElement("span");
                counter.classList.add("gallery-counter");

                function updateCarousel() {

                    track.style.transform = `translateX(-${currentIndex * 100}%)`;

                    counter.textContent =
                        `${currentIndex + 1} / ${post.images.length}`;

                    previousButton.disabled = currentIndex === 0;
                    nextButton.disabled = currentIndex === post.images.length - 1;

                }

                previousButton.addEventListener("click", () => {

                    if (currentIndex > 0) {
                        currentIndex--;
                        updateCarousel();
                    }

                });

                nextButton.addEventListener("click", () => {

                    if (currentIndex < post.images.length - 1) {
                        currentIndex++;
                        updateCarousel();
                    }

                });

                imagesGallery.appendChild(previousButton);
                imagesGallery.appendChild(nextButton);
                imagesGallery.appendChild(counter);

                updateCarousel();

            }

            postCard.insertBefore(imagesGallery, likeButton);
        }

        // ========================================
        // BOTÃO DE CURTIDAS
        // ========================================

        const postUserLikes = likesMap.get(post.id) || [];

        let hasLiked = currentUser &&
            postUserLikes.includes(currentUser.id);

        const likeButton = document.createElement("button");

        likeButton.type = "button";
        likeButton.classList.add("like-post-button");

        likeButton.textContent = hasLiked
            ? `🩷 Curtido (${postUserLikes.length})`
            : `🩶 Curtir (${postUserLikes.length})`;

        if (currentUser) {

            likeButton.addEventListener("click", async () => {

                likeButton.disabled = true;

                try {

                    let result;

                    if (hasLiked) {

                        result = await supabase
                            .from("post_likes")
                            .delete()
                            .eq("post_id", post.id)
                            .eq("user_id", currentUser.id);

                        if (result.error) {
                            throw result.error;
                        }

                        const likeIndex = postUserLikes.indexOf(currentUser.id);

                        if (likeIndex !== -1) {
                            postUserLikes.splice(likeIndex, 1);
                        }

                        hasLiked = false;

                    } else {

                        result = await supabase
                            .from("post_likes")
                            .insert({
                                post_id: post.id,
                                user_id: currentUser.id
                            });

                        if (result.error) {
                            throw result.error;
                        }

                        postUserLikes.push(currentUser.id);

                        hasLiked = true;
                    }

                    likeButton.textContent = hasLiked
                        ? `🩷 Curtido (${postUserLikes.length})`
                        : `🩶 Curtir (${postUserLikes.length})`;

                } catch (error) {

                    console.error("Erro ao atualizar curtida:", error);

                    alert("Não foi possível atualizar a curtida.");

                } finally {

                    likeButton.disabled = false;

                }

            });

        } else {

            likeButton.disabled = true;
            likeButton.style.cursor = "default";
        }

        postCard.appendChild(likeButton);

        renderPostImages();


        // ========================================
        // EXIBIR COMENTÁRIOS
        // ========================================

        const postCommentsList = commentsMap.get(post.id) || [];

        const commentsSection = document.createElement("div");
        commentsSection.classList.add("post-comments");

        const commentsTitle = document.createElement("h4");
        commentsTitle.textContent = `Comentários (${postCommentsList.length})`;
        let commentsCount = postCommentsList.length;

        function updateCommentsCount(change = 0) {
            commentsCount += change;

            commentsTitle.textContent = `Comentários (${commentsCount})`;
        }
        commentsSection.appendChild(commentsTitle);

        let emptyCommentsMessage = null;

        if (postCommentsList.length === 0) {
            emptyCommentsMessage = document.createElement("p");
            emptyCommentsMessage.textContent = "Nenhum comentário ainda.";
            emptyCommentsMessage.classList.add("empty-comments");

            commentsSection.appendChild(emptyCommentsMessage);
        }



        // ========================================
        // MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
        // ========================================

        function showDeleteConfirmation(
            titleText = "Excluir comentário?",
            messageText = "Tem certeza de que deseja excluir este comentário? Essa ação não poderá ser desfeita."
        ) {

            return new Promise((resolve) => {

                const modal = document.createElement("div");
                modal.classList.add("delete-confirm-modal");

                const modalContent = document.createElement("div");
                modalContent.classList.add("delete-confirm-content");

                // Ícone
                const icon = document.createElement("div");
                icon.classList.add("delete-confirm-icon");
                icon.textContent = "🗑️";

                // Título
                const title = document.createElement("h2");
                title.textContent = titleText;

                // Mensagem
                const message = document.createElement("p");
                message.textContent = messageText;

                // Botões
                const actions = document.createElement("div");
                actions.classList.add("delete-confirm-actions");

                const cancelButton = document.createElement("button");
                cancelButton.type = "button";
                cancelButton.classList.add("cancel-delete-button");
                cancelButton.textContent = "Cancelar";

                const confirmButton = document.createElement("button");
                confirmButton.type = "button";
                confirmButton.classList.add("confirm-delete-button");
                confirmButton.textContent = "Excluir";

                // Finalizar confirmação
                function closeModal(confirmed) {
                    modal.remove();
                    resolve(confirmed);
                }

                cancelButton.addEventListener("click", () => {
                    closeModal(false);
                });

                confirmButton.addEventListener("click", () => {
                    closeModal(true);
                });

                modal.addEventListener("click", (event) => {
                    if (event.target === modal) {
                        closeModal(false);
                    }
                });

                // Montar modal
                actions.append(cancelButton, confirmButton);

                modalContent.append(
                    icon,
                    title,
                    message,
                    actions
                );

                modal.appendChild(modalContent);

                document.body.appendChild(modal);

                console.log("Modal criado:", modal);
                console.log("Estilo aplicado:", getComputedStyle(modal).position);
                console.log("Display:", getComputedStyle(modal).display);
                console.log("Z-index:", getComputedStyle(modal).zIndex);

            });

        }



        function renderComment(
            comment,
            container = commentsSection,
            depth = 0
        ) {
            const profile = profilesMap.get(comment.user_id);

            const authorName = profile?.full_name ||
                profile?.username ||
                "Usuário";

            const commentDate = new Date(comment.created_at)
                .toLocaleString("pt-BR");

            const commentItem = document.createElement("div");
            commentItem.classList.add("comment-item");
            commentItem.id = `comment-${comment.id}`;

            // Área destinada às respostas deste comentário
            const repliesContainer = document.createElement("div");
            repliesContainer.classList.add("comment-replies");

            // Informações do autor do comentário
            const authorContainer = document.createElement("div");
            authorContainer.classList.add("comment-author");

            const authorAvatar = document.createElement("img");
            authorAvatar.classList.add("comment-author-avatar");

            if (profile?.avatar_url) {
                authorAvatar.src = profile.avatar_url;
                authorAvatar.alt = `Foto de ${authorName}`;
            } else {
                authorAvatar.style.display = "none";
            }

            const author = document.createElement("strong");
            author.classList.add("comment-author-name");
            author.textContent = authorName;

            authorContainer.append(authorAvatar, author);

            const date = document.createElement("span");
            date.classList.add("comment-date");
            date.textContent = commentDate;

            const content = document.createElement("p");
            content.textContent = comment.content;

            commentItem.append(authorContainer, date, content);

            // ========================================
            // CURTIDAS DO COMENTÁRIO
            // ========================================

            const commentActions = document.createElement("div");
            commentActions.classList.add("comment-actions");

            const likeButton = document.createElement("button");
            likeButton.type = "button";
            likeButton.classList.add("comment-like-button");

            const commentUserLikes = commentLikesMap.get(comment.id) || [];

            let likesCount = commentUserLikes.length;

            let userLiked = currentUser
                ? commentUserLikes.includes(currentUser.id)
                : false;

            // Atualizar aparência do botão
            function updateLikeButton() {

                likeButton.textContent = userLiked
                    ? `🩷Curtido (${likesCount})`
                    : `🩶 Curtir (${likesCount})`;

                likeButton.classList.toggle("liked", userLiked);

            }

            // Curtir ou remover curtida
            likeButton.addEventListener("click", async () => {

                if (!currentUser) {
                    alert("Faça login para curtir comentários.");
                    return;
                }

                likeButton.disabled = true;

                if (userLiked) {

                    const { error } = await supabase
                        .from("comment_likes")
                        .delete()
                        .eq("comment_id", comment.id)
                        .eq("user_id", currentUser.id);

                    if (error) {
                        console.error("Erro ao remover curtida:", error);
                        alert("Não foi possível remover a curtida.");
                        likeButton.disabled = false;
                        return;
                    }

                    likesCount--;
                    userLiked = false;

                } else {

                    const { error } = await supabase
                        .from("comment_likes")
                        .insert({
                            comment_id: comment.id,
                            user_id: currentUser.id
                        });

                    if (error) {
                        console.error("Erro ao curtir comentário:", error);
                        alert("Não foi possível curtir o comentário.");
                        likeButton.disabled = false;
                        return;
                    }

                    likesCount++;
                    userLiked = true;

                }

                updateLikeButton();
                likeButton.disabled = false;

            });


            // Inicializar aparência do botão de curtida
            updateLikeButton();

            commentActions.appendChild(likeButton);


            // ========================================
            // RESPONDER AO COMENTÁRIO
            // ========================================

            const replyButton = document.createElement("button");
            replyButton.type = "button";
            replyButton.classList.add("reply-comment-button");
            replyButton.textContent = "Responder";

            replyButton.addEventListener("click", () => {

                if (!currentUser) {
                    alert("Faça login para responder comentários.");
                    return;
                }

                // Evitar abrir vários formulários
                if (repliesContainer.querySelector(".reply-form")) {
                    return;
                }

                const replyForm = document.createElement("div");
                replyForm.classList.add("reply-form");

                const replyInput = document.createElement("textarea");
                replyInput.placeholder = "Escreva sua resposta...";
                replyInput.maxLength = 1000;
                replyInput.rows = 2;


                const replyEmojiPicker = createEmojiPicker(replyInput);


                // ========================================
                // IMAGEM DA RESPOSTA
                // ========================================

                const replyImageInput = document.createElement("input");
                replyImageInput.type = "file";
                replyImageInput.accept = "image/*";
                replyImageInput.hidden = true;

                const replyImageLabel = document.createElement("label");
                replyImageLabel.classList.add("comment-image-label");
                replyImageLabel.classList.add("image-picker-button");
                replyImageLabel.title = "Adicionar imagem";
                replyImageLabel.setAttribute("aria-label", "Adicionar imagem");

                replyImageLabel.innerHTML = `
    <i class="bi bi-image"></i>
`;

                replyImageLabel.addEventListener("click", () => {
                    replyImageInput.click();
                });

                const replyImagePreview = document.createElement("div");
                replyImagePreview.classList.add("comment-image-preview");
                replyImagePreview.hidden = true;

                const replyImage = document.createElement("img");

                const removeReplyImage = document.createElement("button");
                removeReplyImage.type = "button";
                removeReplyImage.textContent = "Remover imagem";

                replyImagePreview.append(replyImage, removeReplyImage);

                let selectedReplyImage = null;
                let replyImageUrl = null;

                // Selecionar imagem
                replyImageInput.addEventListener("change", () => {

                    const file = replyImageInput.files[0];

                    if (!file) return;

                    if (!file.type.startsWith("image/")) {
                        alert("Selecione um arquivo de imagem válido.");
                        replyImageInput.value = "";
                        return;
                    }

                    if (file.size > 5 * 1024 * 1024) {
                        alert("A imagem deve ter no máximo 5 MB.");
                        replyImageInput.value = "";
                        return;
                    }

                    selectedReplyImage = file;

                    if (replyImageUrl) {
                        URL.revokeObjectURL(replyImageUrl);
                    }

                    replyImageUrl = URL.createObjectURL(file);

                    replyImage.src = replyImageUrl;
                    replyImagePreview.hidden = false;
                });

                // Remover imagem selecionada
                removeReplyImage.addEventListener("click", () => {

                    selectedReplyImage = null;
                    replyImageInput.value = "";

                    if (replyImageUrl) {
                        URL.revokeObjectURL(replyImageUrl);
                        replyImageUrl = null;
                    }

                    replyImage.src = "";
                    replyImagePreview.hidden = true;
                });


                const replyActions = document.createElement("div");
                replyActions.classList.add("reply-form-actions");

                const cancelReplyButton = document.createElement("button");
                cancelReplyButton.type = "button";
                cancelReplyButton.textContent = "Cancelar";

                const sendReplyButton = document.createElement("button");
                sendReplyButton.type = "button";
                sendReplyButton.textContent = "Responder";

                cancelReplyButton.addEventListener("click", () => {
                    replyForm.remove();
                });


                sendReplyButton.addEventListener("click", async () => {

                    const replyContent = replyInput.value.trim();

                    if (!replyContent && !selectedReplyImage) {
                        alert("Escreva uma resposta ou selecione uma imagem.");
                        return;
                    }

                    sendReplyButton.disabled = true;
                    sendReplyButton.textContent = "Enviando...";

                    let replyImagePath = null;
                    let replyImagePublicUrl = null;

                    try {

                        // ========================================
                        // ENVIAR IMAGEM DA RESPOSTA
                        // ========================================

                        if (selectedReplyImage) {

                            const file = selectedReplyImage;
                            const extension = file.name.split(".").pop().toLowerCase();

                            replyImagePath = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;

                            const { error: uploadError } = await supabase
                                .storage
                                .from("post-images")
                                .upload(replyImagePath, file);

                            if (uploadError) throw uploadError;

                            const { data: publicUrlData } = supabase
                                .storage
                                .from("post-images")
                                .getPublicUrl(replyImagePath);

                            replyImagePublicUrl = publicUrlData.publicUrl;
                        }

                        // ========================================
                        // SALVAR RESPOSTA
                        // ========================================

                        const { data: newReply, error } = await supabase
                            .from("post_comments")
                            .insert({
                                post_id: comment.post_id,
                                user_id: currentUser.id,
                                content: replyContent,
                                parent_comment_id: comment.id
                            })
                            .select("id, post_id, user_id, content, created_at, parent_comment_id")
                            .single();

                        if (error) throw error;

                        newReply.images = [];

                        // ========================================
                        // VINCULAR IMAGEM À RESPOSTA
                        // ========================================

                        if (replyImagePublicUrl) {

                            const { error: imageError } = await supabase
                                .from("comment_images")
                                .insert({
                                    comment_id: newReply.id,
                                    image_url: replyImagePublicUrl,
                                    position: 0
                                });

                            if (imageError) {

                                console.error("Erro ao salvar imagem:", imageError);

                                await supabase.storage
                                    .from("post-images")
                                    .remove([replyImagePath]);

                                replyImagePath = null;

                                alert("A resposta foi enviada, mas não foi possível salvar a imagem.");

                            } else {

                                newReply.images = [
                                    { image_url: replyImagePublicUrl }
                                ];

                            }
                        }

                        // ========================================
                        // BUSCAR PERFIL DO AUTOR
                        // ========================================

                        if (!profilesMap.has(currentUser.id)) {

                            const { data: currentProfile } = await supabase
                                .from("profiles")
                                .select("id, full_name, username, avatar_url")
                                .eq("id", currentUser.id)
                                .maybeSingle();

                            if (currentProfile) {
                                profilesMap.set(currentUser.id, currentProfile);
                            }
                        }

                        // ========================================
                        // ATUALIZAR LISTA DE RESPOSTAS
                        // ========================================

                        postCommentsList.push(newReply);

                        const loadMoreButton = [...repliesContainer.children].find(
                            element => element.classList.contains("load-more-replies")
                        );

                        renderComment(newReply, repliesContainer, depth + 1);

                        if (loadMoreButton) {
                            repliesContainer.appendChild(loadMoreButton);
                        }

                        updateCommentsCount(1);

                        if (emptyCommentsMessage) {
                            emptyCommentsMessage.remove();
                            emptyCommentsMessage = null;
                        }

                        // Limpar imagem selecionada
                        selectedReplyImage = null;
                        replyImageInput.value = "";

                        if (replyImageUrl) {
                            URL.revokeObjectURL(replyImageUrl);
                            replyImageUrl = null;
                        }

                        replyForm.remove();

                    } catch (error) {

                        console.error("Erro ao responder comentário:", error);

                        alert("Não foi possível enviar sua resposta.");

                        // Remover imagem enviada caso a resposta não tenha sido salva
                        if (replyImagePath) {
                            await supabase.storage
                                .from("post-images")
                                .remove([replyImagePath]);
                        }

                        sendReplyButton.disabled = false;
                        sendReplyButton.textContent = "Responder";
                    }

                });


                replyActions.append(cancelReplyButton, sendReplyButton);

                // ========================================
                // ÍCONES DE MÍDIA DA RESPOSTA
                // ========================================

                const replyMediaActions = document.createElement("div");
                replyMediaActions.classList.add("reply-media-actions");

                replyMediaActions.append(
                    replyEmojiPicker,
                    replyImageLabel
                );

                replyForm.append(
                    replyInput,
                    replyMediaActions,
                    replyImageInput,
                    replyImagePreview,
                    replyActions
                );

                repliesContainer.appendChild(replyForm);

                replyInput.focus();

            });


            commentActions.appendChild(replyButton);

            // ========================================
            // ACESSO ÀS AÇÕES DO COMENTÁRIO
            // ========================================

            if (!currentUser) {

                commentActions.hidden = true;

                const commentActionsPrompt = document.createElement("div");
                commentActionsPrompt.classList.add("community-login-prompt");

                commentActionsPrompt.innerHTML = `
        <p>Entre na sua conta para curtir ou responder este comentário!</p>

    `;

                commentItem.appendChild(commentActionsPrompt);
            }

            commentItem.appendChild(commentActions);


            // ========================================
            // EXIBIR IMAGEM DO COMENTÁRIO
            // ========================================

            if (comment.images && comment.images.length > 0) {

                const commentImageElement = document.createElement("img");

                commentImageElement.src = comment.images[0].image_url;
                commentImageElement.alt = "Imagem do comentário";
                commentImageElement.classList.add("comment-attached-image");
                commentImageElement.loading = "lazy";

                commentImageElement.addEventListener("click", () => {
                    openImageLightbox(commentImageElement.src);
                });

                commentItem.appendChild(commentImageElement);
            }

            // Excluir os próprios comentários

            if (currentUser && currentUser.id === comment.user_id) {

                // Editar os próprios comentários

                const editCommentButton = document.createElement("button");

                editCommentButton.type = "button";
                editCommentButton.textContent = "Editar";
                editCommentButton.classList.add("edit-comment-button");


                editCommentButton.addEventListener("click", () => {

                    // Criar modal
                    const editCommentModal = document.createElement("div");
                    editCommentModal.classList.add("edit-comment-modal");

                    // Conteúdo do modal
                    const modalContent = document.createElement("div");
                    modalContent.classList.add("edit-comment-content");

                    // Título
                    const modalTitle = document.createElement("h2");
                    modalTitle.textContent = "Editar comentário";

                    // Campo de edição
                    const textarea = document.createElement("textarea");
                    textarea.value = comment.content;
                    textarea.maxLength = 1000;
                    textarea.placeholder = "Escreva seu comentário...";

                    // Área dos botões
                    const actions = document.createElement("div");
                    actions.classList.add("edit-comment-actions");

                    // Botão cancelar
                    const cancelButton = document.createElement("button");
                    cancelButton.type = "button";
                    cancelButton.id = "cancel-edit-comment";
                    cancelButton.textContent = "Cancelar";

                    // Botão salvar
                    const saveButton = document.createElement("button");
                    saveButton.type = "button";
                    saveButton.id = "save-edit-comment";
                    saveButton.textContent = "Salvar alterações";

                    // Fechar modal
                    cancelButton.addEventListener("click", () => {
                        editCommentModal.remove();
                    });

                    // Salvar alterações
                    saveButton.addEventListener("click", async () => {

                        const newContent = textarea.value.trim();

                        if (!newContent) {
                            alert("O comentário não pode ficar vazio.");
                            return;
                        }

                        saveButton.disabled = true;
                        saveButton.textContent = "Salvando...";

                        const { error } = await supabase
                            .from("post_comments")
                            .update({
                                content: newContent
                            })
                            .eq("id", comment.id);

                        if (error) {
                            console.error("Erro ao editar comentário:", error);
                            alert("Não foi possível editar o comentário.");

                            saveButton.disabled = false;
                            saveButton.textContent = "Salvar alterações";
                            return;
                        }

                        // Atualizar comentário diretamente na tela
                        content.textContent = newContent;

                        // Atualizar objeto do comentário
                        comment.content = newContent;

                        editCommentModal.remove();
                    });

                    // Montar modal
                    actions.append(cancelButton, saveButton);

                    modalContent.append(
                        modalTitle,
                        textarea,
                        actions
                    );

                    editCommentModal.appendChild(modalContent);

                    document.body.appendChild(editCommentModal);

                    textarea.focus();

                });


                commentItem.appendChild(editCommentButton);

                const deleteCommentButton = document.createElement("button");

                deleteCommentButton.type = "button";
                deleteCommentButton.textContent = "Excluir";
                deleteCommentButton.classList.add("delete-comment-button");



                deleteCommentButton.addEventListener("click", async () => {

                    const confirmed = await showDeleteConfirmation();

                    if (!confirmed) return;

                    // Buscar imagens vinculadas ao comentário

                    const { data: commentImages, error: imagesError } = await supabase
                        .from("comment_images")
                        .select("image_url")
                        .eq("comment_id", comment.id);

                    if (imagesError) {
                        console.error("Erro ao buscar imagens:", imagesError);
                        alert("Não foi possível excluir o comentário.");
                        return;
                    }

                    // Excluir o comentário do banco de dados

                    const { error } = await supabase
                        .from("post_comments")
                        .delete()
                        .eq("id", comment.id);

                    if (error) {
                        console.error("Erro ao excluir comentário:", error);
                        alert("Não foi possível excluir o comentário.");
                        return;
                    }

                    // Remover imagens do Storage

                    const imagePaths = (commentImages || [])
                        .map(image => getImagePath(image.image_url))
                        .filter(Boolean);

                    console.log("Imagens encontradas:", commentImages);
                    console.log("Caminhos para exclusão:", imagePaths);

                    if (imagePaths.length > 0) {

                        console.log("Usuário autenticado:", currentUser.id);
                        console.log("Pasta da imagem:", imagePaths[0].split("/")[0]);

                        const { data: removedFiles, error: storageError } = await supabase
                            .storage
                            .from("post-images")
                            .remove(imagePaths);

                        console.log("Resultado da exclusão:", removedFiles);
                        console.log("Erro da exclusão:", storageError);

                        if (storageError) {
                            console.error("Erro ao remover imagens:", storageError);
                        }

                    }
                    // Remover comentário diretamente da tela
                    commentItem.remove();

                    // Atualizar quantidade de comentários
                    updateCommentsCount(-1);

                    // Exibir mensagem caso não existam mais comentários
                    if (commentsCount === 0) {
                        emptyCommentsMessage = document.createElement("p");
                        emptyCommentsMessage.textContent = "Nenhum comentário ainda.";
                        emptyCommentsMessage.classList.add("empty-comments");
                        commentsSection.appendChild(emptyCommentsMessage);
                    }
                });


                commentItem.appendChild(deleteCommentButton);
            }

            container.appendChild(commentItem);

            commentItem.appendChild(repliesContainer);


            const replies = postCommentsList.filter(
                reply => reply.parent_comment_id === comment.id
            );

            // teste console respostas da resposta

            console.log("Nível da resposta:", comment.content);
            console.log("Quantidade de respostas:", replies.length);
            console.log("IDs encontrados:", replies.map(reply => reply.id));


            // console teste 

            console.log("Comentário:", comment.id);

            console.log("Respostas encontradas:", replies.length);

            console.log("Dados das respostas:", replies.map(reply => ({
                id: reply.id,
                parent_comment_id: reply.parent_comment_id
            })));

            // ========================================
            // EXIBIR RESPOSTAS GRADUALMENTE
            // ========================================

            let visibleRepliesCount = targetCommentId
                ? replies.length
                : depth === 0
                    ? replies.length
                    : 2;


            let showDeeperReplies = targetCommentId
                ? true
                : depth < 2;


            const renderedReplies = new Set();


            function renderVisibleReplies() {

                // Procurar somente o botão deste nível
                const loadMoreButton = [...repliesContainer.children].find(
                    element => element.classList.contains("load-more-replies")
                );

                if (loadMoreButton) {
                    loadMoreButton.remove();
                }

                // Limitar inicialmente a profundidade das respostas
                if (depth >= 2 && !showDeeperReplies) {

                    if (replies.length > 0) {

                        const button = document.createElement("button");

                        button.type = "button";
                        button.classList.add("load-more-replies");
                        button.textContent = "Ver mais respostas";

                        button.addEventListener("click", () => {
                            showDeeperReplies = true;
                            renderVisibleReplies();
                        });

                        repliesContainer.appendChild(button);
                    }

                    return;
                }

                const repliesToShow = replies.slice(
                    0,
                    visibleRepliesCount
                );

                repliesToShow.forEach(reply => {

                    if (!renderedReplies.has(reply.id)) {
                        renderComment(reply, repliesContainer, depth + 1);
                        renderedReplies.add(reply.id);
                    }

                });

                if (replies.length > visibleRepliesCount) {

                    const button = document.createElement("button");

                    button.type = "button";
                    button.classList.add("load-more-replies");

                    const remaining = replies.length - visibleRepliesCount;

                    button.textContent = `Ver mais respostas (${remaining})`;

                    button.addEventListener("click", () => {
                        visibleRepliesCount += 2;
                        renderVisibleReplies();
                    });

                    repliesContainer.appendChild(button);
                }
            }


            renderVisibleReplies();

        }


        // ========================================
        // EXIBIR COMENTÁRIOS GRADUALMENTE
        // ========================================

        const rootComments = postCommentsList.filter(
            comment => !comment.parent_comment_id
        );

        let visibleCommentsCount = targetCommentId
            ? rootComments.length
            : 3;

        const renderedRootComments = new Set();

        function renderVisibleComments() {

            const commentsToShow = rootComments.slice(
                0,
                visibleCommentsCount
            );

            commentsToShow.forEach(comment => {

                if (!renderedRootComments.has(comment.id)) {
                    renderComment(comment);
                    renderedRootComments.add(comment.id);
                }

            });

            let loadMoreButton = commentsSection.querySelector(
                ".load-more-comments"
            );

            if (rootComments.length > visibleCommentsCount) {

                if (!loadMoreButton) {

                    loadMoreButton = document.createElement("button");
                    loadMoreButton.type = "button";
                    loadMoreButton.classList.add("load-more-comments");

                    loadMoreButton.addEventListener("click", () => {
                        visibleCommentsCount += 3;
                        renderVisibleComments();
                    });

                    commentsSection.appendChild(loadMoreButton);
                }

                const remaining = rootComments.length - visibleCommentsCount;

                loadMoreButton.textContent = `Ver mais comentários (${remaining})`;

            } else if (loadMoreButton) {
                loadMoreButton.remove();
            }
        }

        renderVisibleComments();



        postCard.appendChild(commentsSection);

        // ========================================
        // FORMULÁRIO DE COMENTÁRIOS
        // ========================================

        const commentForm = document.createElement("div");
        commentForm.classList.add("comment-form");

        const commentInput = document.createElement("textarea");
        commentInput.placeholder = "Escreva um comentário...";
        commentInput.rows = 2;

        const commentEmojiPicker = createEmojiPicker(commentInput);


        const commentButton = document.createElement("button");
        commentButton.type = "button";
        commentButton.textContent = "Comentar";

        // ========================================
        // IMAGEM DO COMENTÁRIO
        // ========================================

        const commentImageInput = document.createElement("input");
        commentImageInput.type = "file";
        commentImageInput.accept = "image/*";
        commentImageInput.hidden = true;

        const commentImageLabel = document.createElement("label");
        commentImageLabel.classList.add("comment-image-label");
        commentImageLabel.classList.add("image-picker-button");
        commentImageLabel.title = "Adicionar imagem";
        commentImageLabel.setAttribute("aria-label", "Adicionar imagem");

        commentImageLabel.innerHTML = `
    <i class="bi bi-image"></i>
`;

        commentImageLabel.addEventListener("click", () => {
            commentImageInput.click();
        });

        const commentImagePreview = document.createElement("div");
        commentImagePreview.classList.add("comment-image-preview");
        commentImagePreview.hidden = true;

        const commentImage = document.createElement("img");

        const removeCommentImage = document.createElement("button");
        removeCommentImage.type = "button";
        removeCommentImage.textContent = "Remover imagem";

        commentImagePreview.append(commentImage, removeCommentImage);

        let selectedCommentImage = null;
        let commentImageUrl = null;

        commentImageInput.addEventListener("change", () => {

            const file = commentImageInput.files[0];

            if (!file) return;

            if (!file.type.startsWith("image/")) {
                alert("Selecione um arquivo de imagem válido.");
                commentImageInput.value = "";
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert("A imagem deve ter no máximo 5 MB.");
                commentImageInput.value = "";
                return;
            }

            if (commentImageUrl) {
                URL.revokeObjectURL(commentImageUrl);
            }

            selectedCommentImage = file;
            commentImageUrl = URL.createObjectURL(file);

            commentImage.src = commentImageUrl;
            commentImagePreview.hidden = false;
        });

        removeCommentImage.addEventListener("click", () => {

            selectedCommentImage = null;
            commentImageInput.value = "";

            if (commentImageUrl) {
                URL.revokeObjectURL(commentImageUrl);
                commentImageUrl = null;
            }

            commentImage.src = "";
            commentImagePreview.hidden = true;
        });

        // ========================================
        // ÍCONES DE MÍDIA DO COMENTÁRIO
        // ========================================

        const commentMediaActions = document.createElement("div");
        commentMediaActions.classList.add("comment-media-actions");

        commentMediaActions.append(
            commentEmojiPicker,
            commentImageLabel
        );

        // ========================================
        // AÇÕES DO FORMULÁRIO DE COMENTÁRIOS
        // ========================================

        const commentFormActions = document.createElement("div");
        commentFormActions.classList.add("comment-form-actions");

        commentFormActions.append(
            commentMediaActions,
            commentButton
        );

        commentForm.append(
            commentInput,
            commentImageInput,
            commentImagePreview,
            commentFormActions
        );

        postCard.appendChild(commentForm);

        // ========================================
        // ACESSO AO FORMULÁRIO DE COMENTÁRIOS
        // ========================================

        if (!currentUser) {

            commentForm.hidden = true;

            const commentLoginPrompt = document.createElement("div");
            commentLoginPrompt.classList.add("community-login-prompt");

            commentLoginPrompt.innerHTML = `
        <p>Entre na sua conta para comentar nesta publicação!</p>

    `;


            // Botões de login e register caso queira deixar visível, adicionar antes do `;

            // <div>
            //     <a href="login.html">Entrar</a>
            //     <a href="cadastro.html">Criar conta</a>
            // </div>

            postCard.insertBefore(commentLoginPrompt, commentForm);
        }


        commentButton.addEventListener("click", async () => {

            const commentContent = commentInput.value.trim();

            if (!commentContent) {
                alert("Escreva algo antes de comentar.");
                return;
            }

            if (!currentUser) {
                alert("Entre na sua conta para comentar.");
                return;
            }

            commentButton.disabled = true;

            let uploadedImagePath = null;
            let createdCommentId = null;

            try {

                // ========================================
                // ENVIAR IMAGEM PARA O STORAGE
                // ========================================

                let imageUrl = null;

                if (selectedCommentImage) {

                    const file = selectedCommentImage;
                    const extension = file.name.split(".").pop().toLowerCase();

                    const filePath = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;

                    const { error: uploadError } = await supabase
                        .storage
                        .from("post-images")
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    uploadedImagePath = filePath;

                    const { data: publicUrlData } = supabase
                        .storage
                        .from("post-images")
                        .getPublicUrl(filePath);

                    imageUrl = publicUrlData.publicUrl;
                }

                // ========================================
                // CRIAR COMENTÁRIO
                // ========================================

                const { data: comment, error: commentError } = await supabase
                    .from("post_comments")
                    .insert({
                        post_id: post.id,
                        user_id: currentUser.id,
                        content: commentContent
                    })
                    .select("id")
                    .single();

                if (commentError) throw commentError;

                createdCommentId = comment.id;

                // ========================================
                // SALVAR REFERÊNCIA DA IMAGEM
                // ========================================

                if (imageUrl) {

                    const { error: imageError } = await supabase
                        .from("comment_images")
                        .insert({
                            comment_id: comment.id,
                            image_url: imageUrl,
                            position: 0
                        });

                    if (imageError) throw imageError;
                }

                // ========================================
                // LIMPAR FORMULÁRIO
                // ========================================

                commentInput.value = "";
                selectedCommentImage = null;
                commentImageInput.value = "";

                if (commentImageUrl) {
                    URL.revokeObjectURL(commentImageUrl);
                    commentImageUrl = null;
                }

                commentImage.src = "";
                commentImagePreview.hidden = true;

                // ========================================
                // ATUALIZAR COMENTÁRIOS NA TELA
                // ========================================

                if (!profilesMap.has(currentUser.id)) {

                    const { data: currentProfile, error: profileError } = await supabase
                        .from("profiles")
                        .select("id, full_name, username, avatar_url")
                        .eq("id", currentUser.id)
                        .maybeSingle();

                    if (profileError) {
                        console.error("Erro ao carregar perfil do usuário:", profileError);
                    }

                    if (currentProfile) {
                        profilesMap.set(currentProfile.id, currentProfile);
                    } else {
                        profilesMap.set(currentUser.id, {
                            full_name: currentUser.user_metadata?.full_name,
                            username: currentUser.user_metadata?.username,
                            avatar_url: null
                        });
                    }
                }
                const newComment = {
                    id: comment.id,
                    post_id: post.id,
                    user_id: currentUser.id,
                    content: commentContent,
                    created_at: new Date().toISOString(),
                    parent_comment_id: null,
                    images: imageUrl ? [{ image_url: imageUrl }] : []
                };

                // Adicionar à lista local de comentários
                postCommentsList.push(newComment);
                rootComments.push(newComment);
                renderedRootComments.add(newComment.id);

                // Exibir comentário sem recarregar a página
                renderComment(newComment);

                // Atualizar quantidade de comentários
                updateCommentsCount(1);

                if (emptyCommentsMessage) {
                    emptyCommentsMessage.remove();
                    emptyCommentsMessage = null;
                }

            } catch (error) {

                console.error("Erro ao enviar comentário:", error);

                // Remover comentário incompleto, se necessário
                if (createdCommentId) {
                    await supabase
                        .from("post_comments")
                        .delete()
                        .eq("id", createdCommentId);
                }

                // Remover imagem enviada em caso de erro
                if (uploadedImagePath) {
                    await supabase
                        .storage
                        .from("post-images")
                        .remove([uploadedImagePath]);
                }

                alert("Não foi possível enviar o comentário.");

            } finally {
                commentButton.disabled = false;
            }
        });


        if (currentUser && currentUser.id === post.user_id) {
            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.textContent = "Excluir publicação";
            deleteButton.classList.add("delete-post-button");


            deleteButton.addEventListener("click", async () => {

                const confirmed = await showDeleteConfirmation(
                    "Excluir publicação?",
                    "Tem certeza de que deseja excluir esta publicação e todas as imagens e comentários associados? Essa ação não poderá ser desfeita."
                );

                if (!confirmed) return;

                deleteButton.disabled = true;

                try {

                    // Buscar imagens da publicação
                    const { data: postImages, error: postImagesError } = await supabase
                        .from("post_images")
                        .select("image_url")
                        .eq("post_id", post.id);

                    if (postImagesError) throw postImagesError;

                    // Buscar comentários da publicação
                    const { data: comments, error: commentsError } = await supabase
                        .from("post_comments")
                        .select("id")
                        .eq("post_id", post.id);

                    if (commentsError) throw commentsError;

                    // Buscar imagens dos comentários
                    let commentImages = [];

                    if (comments && comments.length > 0) {

                        const commentIds = comments.map(comment => comment.id);

                        const { data, error: commentImagesError } = await supabase
                            .from("comment_images")
                            .select("image_url")
                            .in("comment_id", commentIds);

                        if (commentImagesError) throw commentImagesError;

                        commentImages = data || [];
                    }

                    // Reunir todas as URLs das imagens
                    const imageUrls = [
                        ...(postImages || []).map(image => image.image_url),
                        ...(commentImages || []).map(image => image.image_url)
                    ];

                    // Compatibilidade com publicações antigas
                    if (post.image_url) {
                        imageUrls.push(post.image_url);
                    }

                    // Converter URLs em caminhos do Storage
                    const imagePaths = [
                        ...new Set(
                            imageUrls
                                .map(url => getImagePath(url))
                                .filter(Boolean)
                        )
                    ];

                    // Excluir publicação do banco de dados
                    const { error: deleteError } = await supabase
                        .from("posts")
                        .delete()
                        .eq("id", post.id)
                        .eq("user_id", currentUser.id);

                    if (deleteError) throw deleteError;

                    // Remover arquivos do Storage
                    if (imagePaths.length > 0) {

                        const { data: removedFiles, error: storageError } =
                            await supabase.storage
                                .from("post-images")
                                .remove(imagePaths);

                        if (storageError) {
                            console.error(
                                "Erro ao remover imagens do Storage:",
                                storageError
                            );
                        } else {
                            console.log("Resultado da exclusão:", removedFiles);
                        }
                    }

                    await reloadLoadedPosts();


                } catch (error) {

                    console.error("Erro ao excluir publicação:", error);

                    alert("Não foi possível excluir a publicação.");

                    deleteButton.disabled = false;
                }

            });


            postCard.appendChild(deleteButton);
        }

        // ========================================
        // EDITAR PUBLICAÇÃO
        // ========================================

        if (currentUser && currentUser.id === post.user_id) {
            const editButton = document.createElement("button");

            editButton.type = "button";
            editButton.textContent = "Editar publicação";
            editButton.classList.add("edit-post-button");


            editButton.addEventListener("click", async () => {



                const editModal = document.createElement("div");
                editModal.className = "edit-post-modal";


                editModal.innerHTML = `
    <div class="edit-post-content">

        <h2>Editar publicação</h2>

        <label for="edit-post-text">Texto da publicação</label>

        <textarea id="edit-post-text">${post.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>

        <div class="edit-post-image">

            <p>Imagens da publicação</p>

            <div id="edit-images-grid" class="edit-images-grid"></div>

            <p id="edit-images-count"></p>

            <label for="edit-post-file">Adicionar imagens</label>

            <input
                type="file"
                id="edit-post-file"
                accept="image/*"
                multiple
            >

            <p class="edit-image-hint">
                Você pode adicionar até 5 imagens, com limite de 5 MB cada.
            </p>

        </div>

        <div class="edit-post-actions">
            <button type="button" id="cancel-edit-post">Cancelar</button>
            <button type="button" id="save-edit-post">Salvar alterações</button>
        </div>

    </div>
`;


                document.body.appendChild(editModal);

                // ========================================
                // GERENCIAR IMAGENS DA EDIÇÃO
                // ========================================

                // Manter as imagens que já pertencem à publicação
                let editImages = (post.images || []).map(image => ({
                    id: image.id,
                    url: image.image_url,
                    existing: true
                }));

                const editImageInput = editModal.querySelector("#edit-post-file");
                const editImagesGrid = editModal.querySelector("#edit-images-grid");
                const editImagesCount = editModal.querySelector("#edit-images-count");


                // ========================================
                // RENDERIZAR IMAGENS DO MODAL
                // ========================================

                function renderEditImages() {

                    editImagesGrid.innerHTML = "";

                    editImages.forEach((image, index) => {

                        const container = document.createElement("div");
                        container.classList.add("edit-image-item");

                        const img = document.createElement("img");
                        img.src = image.url;
                        img.alt = `Imagem ${index + 1} da publicação`;

                        const removeButton = document.createElement("button");
                        removeButton.type = "button";
                        removeButton.textContent = "×";
                        removeButton.classList.add("remove-edit-image");

                        removeButton.addEventListener("click", () => {

                            // Liberar memória das imagens novas
                            if (!image.existing) {
                                URL.revokeObjectURL(image.url);
                            }

                            editImages.splice(index, 1);

                            renderEditImages();

                        });

                        container.appendChild(img);
                        container.appendChild(removeButton);

                        editImagesGrid.appendChild(container);

                    });

                    editImagesCount.textContent =
                        `${editImages.length} de 5 imagens selecionadas`;

                }


                // ========================================
                // SELECIONAR NOVAS IMAGENS
                // ========================================

                editImageInput.addEventListener("change", () => {

                    const files = Array.from(editImageInput.files);

                    if (editImages.length + files.length > 5) {
                        alert("Você pode adicionar no máximo 5 imagens por publicação.");
                        editImageInput.value = "";
                        return;
                    }

                    files.forEach(file => {

                        if (!file.type.startsWith("image/")) {
                            alert(`O arquivo "${file.name}" não é uma imagem válida.`);
                            return;
                        }

                        if (file.size > 5 * 1024 * 1024) {
                            alert(`A imagem "${file.name}" ultrapassa o limite de 5 MB.`);
                            return;
                        }

                        editImages.push({
                            file: file,
                            url: URL.createObjectURL(file),
                            existing: false
                        });

                    });

                    renderEditImages();

                    editImageInput.value = "";

                });


                // Exibir imagens atuais ao abrir o modal
                renderEditImages();

                const cancelButton = editModal.querySelector("#cancel-edit-post");

                cancelButton.addEventListener("click", () => {
                    editModal.remove();
                });


                const saveButton = editModal.querySelector("#save-edit-post");


                saveButton.addEventListener("click", async () => {

                    const newContent = editModal
                        .querySelector("#edit-post-text")
                        .value.trim();

                    if (!newContent) {
                        alert("O texto da publicação não pode ficar vazio.");
                        return;
                    }

                    saveButton.disabled = true;
                    saveButton.textContent = "Salvando...";

                    const uploadedFilePaths = [];
                    let databaseChangesStarted = false;

                    const oldImages = post.images || [];

                    try {

                        const { data: { user }, error: userError } =
                            await supabase.auth.getUser();

                        if (userError || !user) {
                            throw new Error("Usuário não autenticado.");
                        }

                        // ========================================
                        // ENVIAR NOVAS IMAGENS
                        // ========================================

                        const finalImages = [];

                        for (const image of editImages) {

                            // Manter imagens existentes
                            if (image.existing) {

                                finalImages.push({
                                    image_url: image.url
                                });

                                continue;
                            }

                            // Otimizar imagem nova
                            const optimizedFile = await compressImage(image.file);

                            const originalExtension = image.file.name
                                .split(".")
                                .pop()
                                .toLowerCase();

                            const extension = optimizedFile.type === "image/webp"
                                ? "webp"
                                : originalExtension;

                            const filePath =
                                `${user.id}/${crypto.randomUUID()}.${extension}`;

                            const { error: uploadError } = await supabase
                                .storage
                                .from("post-images")
                                .upload(filePath, optimizedFile, {
                                    contentType: optimizedFile.type,
                                    upsert: false
                                });

                            if (uploadError) {
                                throw uploadError;
                            }

                            uploadedFilePaths.push(filePath);

                            const { data } = supabase
                                .storage
                                .from("post-images")
                                .getPublicUrl(filePath);

                            finalImages.push({
                                image_url: data.publicUrl
                            });

                        }

                        // ========================================
                        // ATUALIZAR PUBLICAÇÃO
                        // ========================================

                        const firstImageUrl = finalImages.length > 0
                            ? finalImages[0].image_url
                            : null;

                        databaseChangesStarted = true;

                        const { error: updateError } = await supabase
                            .from("posts")
                            .update({
                                content: newContent,
                                image_url: firstImageUrl
                            })
                            .eq("id", post.id)
                            .eq("user_id", user.id);

                        if (updateError) {
                            throw updateError;
                        }

                        // ========================================
                        // ATUALIZAR REGISTROS DAS IMAGENS
                        // ========================================

                        const { error: deleteRecordsError } = await supabase
                            .from("post_images")
                            .delete()
                            .eq("post_id", post.id);

                        if (deleteRecordsError) {
                            throw deleteRecordsError;
                        }

                        if (finalImages.length > 0) {

                            const imageRecords = finalImages.map((image, index) => ({
                                post_id: post.id,
                                image_url: image.image_url,
                                position: index
                            }));

                            const { error: insertImagesError } = await supabase
                                .from("post_images")
                                .insert(imageRecords);

                            if (insertImagesError) {
                                throw insertImagesError;
                            }

                        }

                        // ========================================
                        // REMOVER IMAGENS EXCLUÍDAS DO STORAGE
                        // ========================================

                        const finalImageUrls = finalImages.map(image => image.image_url);

                        const removedImagePaths = oldImages
                            .filter(image => !finalImageUrls.includes(image.image_url))
                            .map(image => getImagePath(image.image_url))
                            .filter(Boolean);

                        const uniqueRemovedPaths = [...new Set(removedImagePaths)];

                        if (uniqueRemovedPaths.length > 0) {

                            const { error: storageDeleteError } = await supabase
                                .storage
                                .from("post-images")
                                .remove(uniqueRemovedPaths);

                            if (storageDeleteError) {
                                console.error(
                                    "Erro ao remover imagens antigas:",
                                    storageDeleteError
                                );
                            }

                        }

                        // ========================================
                        // ATUALIZAR PUBLICAÇÃO DIRETAMENTE NA TELA
                        // ========================================

                        // Atualizar texto
                        content.textContent = newContent;

                        // Atualizar dados da publicação
                        post.content = newContent;

                        post.images = finalImages.map((image, index) => ({
                            image_url: image.image_url,
                            position: index
                        }));

                        post.image_url = firstImageUrl;

                        // Atualizar galeria
                        renderPostImages();

                        // Liberar memória das imagens temporárias
                        editImages.forEach(image => {
                            if (!image.existing) {
                                URL.revokeObjectURL(image.url);
                            }
                        });

                        editModal.remove();

                    } catch (error) {

                        console.error("Erro ao editar publicação:", error);

                        // Tentar restaurar os registros anteriores
                        if (databaseChangesStarted) {

                            try {

                                await supabase
                                    .from("posts")
                                    .update({
                                        content: post.content,
                                        image_url: post.image_url
                                    })
                                    .eq("id", post.id);

                                await supabase
                                    .from("post_images")
                                    .delete()
                                    .eq("post_id", post.id);

                                if (oldImages.length > 0) {

                                    const oldRecords = oldImages.map((image, index) => ({
                                        post_id: post.id,
                                        image_url: image.image_url,
                                        position: index
                                    }));

                                    await supabase
                                        .from("post_images")
                                        .insert(oldRecords);

                                }

                            } catch (rollbackError) {

                                console.error(
                                    "Erro ao restaurar publicação:",
                                    rollbackError
                                );

                            }

                        }

                        // Remover arquivos enviados durante a tentativa
                        if (uploadedFilePaths.length > 0) {

                            await supabase
                                .storage
                                .from("post-images")
                                .remove(uploadedFilePaths);

                        }

                        alert("Não foi possível salvar as alterações.");

                        saveButton.disabled = false;
                        saveButton.textContent = "Salvar alterações";

                    }

                });



            });


            postCard.appendChild(editButton);
        }

        postsContainer.appendChild(postCard);
    });

    // ========================================
    // LOCALIZAR CONTEÚDO DA NOTIFICAÇÃO
    // ========================================

    if (reset && targetPostId) {

        setTimeout(() => {

            const targetElement = targetCommentId
                ? document.getElementById(`comment-${targetCommentId}`)
                : document.getElementById(`post-${targetPostId}`);

            if (targetElement) {

                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                targetElement.classList.add("notification-target-highlight");

            } else {
                console.warn("Conteúdo da notificação não encontrado na página.");
            }

        }, 300);
    }

    // Atualizar botão de carregamento

    // Atualizar botão de carregamento

    loadMoreButton.hidden = !hasMorePosts;
    loadMoreButton.disabled = false;

    isLoadingPosts = false;
}
// ========================================
// ATUALIZAR PUBLICAÇÕES CARREGADAS
// ========================================

async function reloadLoadedPosts() {

    const pagesToReload = Math.max(currentPage, 1);

    await loadPosts(true);

    for (let i = 1; i < pagesToReload && hasMorePosts; i++) {
        await loadPosts(false);
    }

}


// ========================================
// SUPABASE REALTIME - NOVOS COMENTÁRIOS
// ========================================

let realtimeRefreshTimeout = null;

const communityRealtimeChannel = supabase
    .channel("community-comments")
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "post_comments"
        },
        async (payload) => {

            console.log("Novo comentário recebido:", payload.new);

            // Identificar o usuário atual
            const { data: { user } } = await supabase.auth.getUser();

            // Ignorar comentários publicados pelo próprio usuário,
            // pois eles já aparecem imediatamente na tela.
            if (user && payload.new.user_id === user.id) {
                return;
            }

            // Evitar várias atualizações simultâneas
            clearTimeout(realtimeRefreshTimeout);

            realtimeRefreshTimeout = setTimeout(async () => {

                if (!isLoadingPosts) {
                    await reloadLoadedPosts();
                }

            }, 500);

        }
    )

    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "posts"
        },
        async (payload) => {

            console.log("Nova publicação recebida:", payload.new);

            clearTimeout(realtimeRefreshTimeout);

            realtimeRefreshTimeout = setTimeout(async () => {

                if (!isLoadingPosts) {
                    await reloadLoadedPosts();
                }

            }, 500);

        }
    )


    // ========================================
    // REALTIME - CURTIDAS DE PUBLICAÇÕES
    // ========================================

    .on(
        "postgres_changes",
        {
            event: "*",
            schema: "public",
            table: "post_likes"
        },
        async (payload) => {

            console.log("Alteração nas curtidas de posts:", payload);

            clearTimeout(realtimeRefreshTimeout);

            realtimeRefreshTimeout = setTimeout(async () => {

                if (!isLoadingPosts) {
                    await reloadLoadedPosts();
                }

            }, 500);

        }
    )

    // ========================================
    // REALTIME - CURTIDAS DE COMENTÁRIOS
    // ========================================

    .on(
        "postgres_changes",
        {
            event: "*",
            schema: "public",
            table: "comment_likes"
        },
        async (payload) => {

            console.log("Alteração nas curtidas de comentários:", payload);

            clearTimeout(realtimeRefreshTimeout);

            realtimeRefreshTimeout = setTimeout(async () => {

                if (!isLoadingPosts) {
                    await reloadLoadedPosts();
                }

            }, 500);

        }
    )

    .subscribe((status) => {

        console.log("Status do Realtime:", status);

    });


// Carregar publicações ao abrir a página
loadPosts();



// ========================================
// SELECIONAR E VISUALIZAR IMAGENS
// ========================================

imageInput.addEventListener("change", () => {

    const files = Array.from(imageInput.files);

    if (!files.length) {
        return;
    }

    // Verificar limite de 5 imagens

    if (selectedImages.length + files.length > 5) {
        alert("Você pode adicionar no máximo 5 imagens por publicação.");
        imageInput.value = "";
        return;
    }

    files.forEach(file => {

        // Verificar formato

        if (!file.type.startsWith("image/")) {
            alert("Um dos arquivos selecionados não é uma imagem válida.");
            return;
        }

        // Verificar tamanho máximo de 5 MB

        if (file.size > 5 * 1024 * 1024) {
            alert(`A imagem "${file.name}" ultrapassa o limite de 5 MB.`);
            return;
        }

        selectedImages.push({
            file: file,
            url: URL.createObjectURL(file)
        });

    });

    renderImagePreview();

    imageInput.value = "";

});


// ========================================
// RENDERIZAR PRÉ-VISUALIZAÇÃO
// ========================================

function renderImagePreview() {

    imagePreviewGrid.innerHTML = "";

    selectedImages.forEach((image, index) => {

        const container = document.createElement("div");
        container.classList.add("image-preview-item");

        const img = document.createElement("img");
        img.src = image.url;
        img.alt = `Imagem ${index + 1} da publicação`;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.classList.add("remove-preview-image");
        removeButton.setAttribute("aria-label", "Remover imagem");

        removeButton.innerHTML = '<i class="bi bi-x-lg"></i>';

        removeButton.addEventListener("click", () => {

            URL.revokeObjectURL(image.url);

            selectedImages.splice(index, 1);

            renderImagePreview();

        });

        container.appendChild(img);
        container.appendChild(removeButton);

        imagePreviewGrid.appendChild(container);

    });

    imagePreview.hidden = selectedImages.length === 0;

    imagePreviewCount.textContent =
        `${selectedImages.length} de 5 imagens selecionadas`;

}



