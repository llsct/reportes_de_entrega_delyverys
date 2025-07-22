// src/auth.js
const MASTER_PASSWORD = "toto123";

let isAuthenticated = false;

export function initAuth() {
    console.log("[Auth] Módulo de autenticación inicializado.");
}

export function login(password) {
    if (password === MASTER_PASSWORD) {
        isAuthenticated = true;
        console.log("[Auth] Autenticación exitosa.");
        return true;
    } else {
        isAuthenticated = false;
        console.warn("[Auth] Intento de autenticación fallido.");
        return false;
    }
}

export function logout() {
    isAuthenticated = false;
    console.log("[Auth] Sesión cerrada.");
}

export function getAuthStatus() {
    return isAuthenticated;
}

export function getMasterPassword() {
    return MASTER_PASSWORD;
}