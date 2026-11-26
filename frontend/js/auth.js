
// ========================================
// AUTENTICAÇÃO DO MUSICRATE
// ========================================

import { supabase } from "./supabase.js";


// ========================================
// CLOUDFLARE TURNSTILE
// ========================================

const TURNSTILE_SITE_KEY = "0x4AAAAAAGTKm35DU7ytP0k9";

let signupCaptchaToken = null;
let loginCaptchaToken = null;

let signupWidgetId = null;
let loginWidgetId = null;

let signupProcessing = false;
let loginProcessing = false;


// Carregar biblioteca do Cloudflare
function loadTurnstile() {

    return new Promise((resolve, reject) => {

        if (window.turnstile) {
            resolve();
            return;
        }

        const existingScript = document.querySelector(
            'script[src*="challenges.cloudflare.com/turnstile"]'
        );

        if (existingScript) {

            existingScript.addEventListener("load", resolve, { once: true });
            existingScript.addEventListener("error", reject, { once: true });

            return;
        }

        const script = document.createElement("script");

        script.src =
            "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

        script.async = true;
        script.defer = true;

        script.onload = resolve;
        script.onerror = reject;

        document.head.appendChild(script);
    });
}


// Inicializar CAPTCHA
async function initializeTurnstile() {

    const signupContainer = document.getElementById("signup-turnstile");
    const loginContainer = document.getElementById("login-turnstile");

    if (!signupContainer && !loginContainer) return;

    try {

        await loadTurnstile();

        if (signupContainer) {

            signupWidgetId = window.turnstile.render(
                signupContainer,
                {
                    sitekey: TURNSTILE_SITE_KEY,

                    callback: (token) => {
                        signupCaptchaToken = token;
                    },

                    "expired-callback": () => {
                        signupCaptchaToken = null;
                    },

                    "error-callback": () => {
                        signupCaptchaToken = null;
                    }
                }
            );
        }

        if (loginContainer) {

            loginWidgetId = window.turnstile.render(
                loginContainer,
                {
                    sitekey: TURNSTILE_SITE_KEY,

                    callback: (token) => {
                        loginCaptchaToken = token;
                    },

                    "expired-callback": () => {
                        loginCaptchaToken = null;
                    },

                    "error-callback": () => {
                        loginCaptchaToken = null;
                    }
                }
            );
        }

    } catch (error) {

        console.error("Erro ao carregar Turnstile:", error);
    }
}

initializeTurnstile();


// Reiniciar CAPTCHA
function resetCaptcha(type) {

    try {

        if (type === "signup") {

            signupCaptchaToken = null;

            if (signupWidgetId !== null && window.turnstile) {
                window.turnstile.reset(signupWidgetId);
            }
        }

        if (type === "login") {

            loginCaptchaToken = null;

            if (loginWidgetId !== null && window.turnstile) {
                window.turnstile.reset(loginWidgetId);
            }
        }

    } catch (error) {

        console.error("Erro ao reiniciar CAPTCHA:", error);
    }
}


// ========================================
// CADASTRO DE USUÁRIO
// ========================================

const signupForm = document.getElementById("signup-form");

if (signupForm) {

    signupForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (signupProcessing) return;

        const username = document.getElementById("username").value.trim();
        const fullName = document.getElementById("full-name").value.trim();
        const email = document.getElementById("signup-email").value.trim();
        const password = document.getElementById("signup-password").value;

        const message = document.getElementById("signup-message");
        const submitButton = signupForm.querySelector('[type="submit"]');

        if (!signupCaptchaToken) {

            message.textContent = "Conclua a verificação de segurança.";
            return;
        }

        signupProcessing = true;

        if (submitButton) submitButton.disabled = true;

        message.textContent = "Criando sua conta...";

        try {

            const { data, error } = await supabase.auth.signUp({

                email: email,
                password: password,

                options: {

                    data: {
                        username: username,
                        full_name: fullName
                    },

                    captchaToken: signupCaptchaToken
                }
            });

            resetCaptcha("signup");

            if (error) {
                message.textContent = "Erro: " + error.message;
                return;
            }

            if (data.session) {

                message.textContent = "Conta criada com sucesso!";

                window.location.href = "../index.html";

            } else {

                message.textContent =
                    "Conta criada! Verifique seu e-mail para confirmar o cadastro.";
            }

        } catch (error) {

            resetCaptcha("signup");

            console.error("Erro no cadastro:", error);

            message.textContent =
                "Não foi possível criar sua conta. Tente novamente.";

        } finally {

            signupProcessing = false;

            if (submitButton) submitButton.disabled = false;
        }
    });
}


// ========================================
// LOGIN DE USUÁRIO
// ========================================

const loginForm = document.getElementById("login-form");

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (loginProcessing) return;

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;

        const message = document.getElementById("login-message");
        const submitButton = loginForm.querySelector('[type="submit"]');

        if (!loginCaptchaToken) {

            message.textContent = "Conclua a verificação de segurança.";
            return;
        }

        loginProcessing = true;

        if (submitButton) submitButton.disabled = true;

        message.textContent = "Entrando...";

        try {

            const { error } = await supabase.auth.signInWithPassword({

                email: email,
                password: password,

                options: {
                    captchaToken: loginCaptchaToken
                }
            });

            resetCaptcha("login");

            if (error) {

                message.textContent = "Erro: " + error.message;
                return;
            }

            message.textContent = "Login realizado com sucesso!";

            window.location.href = "../index.html";

        } catch (error) {

            resetCaptcha("login");

            console.error("Erro no login:", error);

            message.textContent =
                "Não foi possível realizar o login. Tente novamente.";

        } finally {

            loginProcessing = false;

            if (submitButton) submitButton.disabled = false;
        }
    });
}


// ========================================
// CONTROLE DO CABEÇALHO
// ========================================

const logoutButton = document.getElementById("logout-button");

const loginLink = document.getElementById("login-link");
const registerLink = document.getElementById("register-link");

const profileMenu = document.getElementById("profile-menu");
const profileToggle = document.getElementById("profile-toggle");
const profileDropdown = document.getElementById("profile-dropdown");


// Atualizar cabeçalho
function updateHeader(session) {

    const loggedIn = Boolean(session);

    if (loginLink) loginLink.hidden = loggedIn;

    if (registerLink) registerLink.hidden = loggedIn;

    if (profileMenu) profileMenu.hidden = !loggedIn;

    if (!loggedIn) {
        closeProfileMenu();
    }
}


// ========================================
// ABRIR E FECHAR MENU DO PERFIL
// ========================================

function closeProfileMenu() {

    if (profileDropdown) {
        profileDropdown.hidden = true;
    }

    if (profileToggle) {
        profileToggle.setAttribute("aria-expanded", "false");
    }
}


if (profileToggle && profileDropdown) {

    profileToggle.addEventListener("click", () => {

        const isOpen = !profileDropdown.hidden;

        profileDropdown.hidden = isOpen;

        profileToggle.setAttribute(
            "aria-expanded",
            String(!isOpen)
        );
    });
}


// Fechar ao clicar fora
document.addEventListener("click", (event) => {

    if (
        profileMenu &&
        !profileMenu.contains(event.target)
    ) {

        closeProfileMenu();
    }
});


// ========================================
// VERIFICAR SESSÃO
// ========================================

async function loadHeader() {

    try {

        const { data, error } = await supabase.auth.getSession();

        if (error) {

            console.error("Erro ao verificar sessão:", error.message);
            return;
        }

        updateHeader(data.session);

    } catch (error) {

        console.error("Erro inesperado ao carregar sessão:", error);
    }
}

loadHeader();


// Monitorar alterações na autenticação
supabase.auth.onAuthStateChange((_event, session) => {

    updateHeader(session);
});


// ========================================
// SAIR DA CONTA
// ========================================

if (logoutButton) {

    logoutButton.addEventListener("click", async () => {

        logoutButton.disabled = true;

        try {

            const { error } = await supabase.auth.signOut();

            if (error) {

                alert("Não foi possível sair: " + error.message);
                return;
            }

            updateHeader(null);

            window.location.reload();

        } catch (error) {

            console.error("Erro ao sair da conta:", error);

            alert("Ocorreu um erro ao tentar sair da conta.");

        } finally {

            logoutButton.disabled = false;
        }
    });
}
