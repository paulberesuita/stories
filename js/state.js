// State management

import { CONFIG, SCENE_COUNT } from './config.js';

// Application state
export const state = {
    apiKey: localStorage.getItem(CONFIG.STORAGE_KEY_API) || '',
    isGenerating: false,
    currentScene: 0,
    images: Array(SCENE_COUNT).fill(null),
    captions: Array(SCENE_COUNT).fill(null),
    cards: [],
    currentCardIndex: 0,
    error: null
};

// State mutation functions
export function setApiKey(key) {
    state.apiKey = key;
    if (key) {
        localStorage.setItem(CONFIG.STORAGE_KEY_API, key);
    } else {
        localStorage.removeItem(CONFIG.STORAGE_KEY_API);
    }
}

export function resetGenerationState() {
    state.isGenerating = true;
    state.currentScene = 0;
    state.currentCardIndex = 0;
    state.images = Array(SCENE_COUNT).fill(null);
    state.captions = Array(SCENE_COUNT).fill(null);
    state.cards = [];
}

export function setGenerating(value) {
    state.isGenerating = value;
}

export function setCurrentScene(index) {
    state.currentScene = index;
}

export function setImage(index, imageData) {
    state.images[index] = imageData;
}

export function setCaption(index, caption) {
    state.captions[index] = caption;
}

export function setCard(index, card) {
    state.cards[index] = card;
}

export function setCurrentCardIndex(index) {
    state.currentCardIndex = index;
}

export function setError(message) {
    state.error = message;
}

export function clearError() {
    state.error = null;
}

export function clearCards() {
    state.cards = [];
    state.images = Array(SCENE_COUNT).fill(null);
    state.captions = Array(SCENE_COUNT).fill(null);
    state.currentCardIndex = 0;
}
