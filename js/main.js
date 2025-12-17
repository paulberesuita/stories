'use strict';

// Main entry point - initialization and event handling

import { CONFIG, SAMPLE_STORIES, SCENE_COUNT } from './config.js';
import {
    state,
    setApiKey,
    resetGenerationState,
    setGenerating,
    setCurrentScene,
    setImage,
    setCaption,
    setCurrentCardIndex,
    setError,
    clearError as clearStateError,
    clearCards
} from './state.js';
import { generateScenePrompts, generateSceneCaptions, generateImage } from './api.js';
import { animateSectionTransition, setupButtonAnimations, animateEntrance } from './animations.js';
import {
    setCardStackElement,
    showLoadingCard,
    updateSceneCard,
    updateCardStackPosition,
    dismissCard,
    resetCardPosition,
    clearCardStack
} from './cards.js';
import { setDragCallbacks } from './drag.js';

// DOM Elements
let apiKeyInput;
let storyPromptInput;
let generateBtn;
let errorMessage;
let inputSection;
let outputSection;
let cardStack;
let createNewBtn;
let sampleStoriesContainer;

// Initialize DOM references
function initDomReferences() {
    apiKeyInput = document.getElementById('api-key');
    storyPromptInput = document.getElementById('story-prompt');
    generateBtn = document.getElementById('generate-btn');
    errorMessage = document.getElementById('error-message');
    inputSection = document.getElementById('input-section');
    outputSection = document.getElementById('output-section');
    cardStack = document.getElementById('card-stack');
    createNewBtn = document.getElementById('create-new-btn');
    sampleStoriesContainer = document.getElementById('sample-stories');

    // Set card stack element for cards module
    setCardStackElement(cardStack);

    // Set drag callbacks to avoid circular dependency
    setDragCallbacks(dismissCard, resetCardPosition);
}

// Initialize
function init() {
    initDomReferences();

    // Load API key from localStorage
    if (state.apiKey) {
        apiKeyInput.value = state.apiKey;
    }

    // Event listeners
    apiKeyInput.addEventListener('input', handleApiKeyChange);
    generateBtn.addEventListener('click', handleGenerate);
    createNewBtn.addEventListener('click', handleCreateNew);
    storyPromptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleGenerate();
        }
    });

    // Setup sample story pills
    setupSampleStories();

    // Setup button animations
    setupButtonAnimations(generateBtn, createNewBtn);
}

// Setup sample story pills
function setupSampleStories() {
    SAMPLE_STORIES.forEach(story => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'px-3 py-1.5 text-xs font-medium text-[#525252] bg-[#f5f5f5] hover:bg-[#e5e5e5] rounded-full transition-colors cursor-pointer';
        pill.textContent = story.label;
        pill.addEventListener('click', () => {
            storyPromptInput.value = story.prompt;
            storyPromptInput.focus();
        });
        sampleStoriesContainer.appendChild(pill);
    });
}

// Handle API key input change
function handleApiKeyChange(e) {
    const key = e.target.value.trim();
    setApiKey(key);
}

// Handle generate button click
async function handleGenerate() {
    // Clear previous error
    clearError();

    // Validate inputs
    if (!state.apiKey) {
        showError('Please enter your OpenAI API key');
        return;
    }

    const userPrompt = storyPromptInput.value.trim();
    if (!userPrompt) {
        showError('Please enter a story idea');
        return;
    }

    // Animate section transition
    animateSectionTransition(inputSection, outputSection);

    // Reset state
    resetGenerationState();

    // Clear previous cards
    clearCardStack();
    createNewBtn.classList.add('hidden');

    // Generate scene prompts and captions
    const scenePrompts = generateScenePrompts(userPrompt);
    const sceneCaptions = generateSceneCaptions(userPrompt);

    // Show all loading cards at once in stack
    for (let i = 0; i < SCENE_COUNT; i++) {
        showLoadingCard(i);
    }

    // Set first card as active initially
    setCurrentCardIndex(0);
    updateCardStackPosition();

    // Generate all images in parallel
    try {
        const imagePromises = scenePrompts.map((prompt, index) =>
            generateImage(prompt).then(imageData => ({
                index,
                imageData,
                caption: sceneCaptions[index]
            }))
        );

        // Wait for all images to complete
        const results = await Promise.all(imagePromises);

        // Update each card as it completes (they may complete in any order)
        results.forEach(({ index, imageData, caption }) => {
            if (imageData) {
                setImage(index, imageData);
                setCaption(index, caption);
                updateSceneCard(index, imageData, caption);
            } else {
                throw new Error(`Failed to generate scene ${index + 1}`);
            }
        });

        // All scenes complete - show "Create New Story" button with animation
        animateEntrance(createNewBtn);
    } catch (error) {
        showError(error.message || 'Failed to generate story. Please try again.');
        // Show input section again on error
        animateSectionTransition(outputSection, inputSection);
    } finally {
        setGenerating(false);
        setCurrentScene(0);
    }
}

// Handle "Create New Story" button click
function handleCreateNew() {
    // Clear story prompt (keep API key)
    storyPromptInput.value = '';

    // Animate section transition
    animateSectionTransition(outputSection, inputSection);

    // Clear card stack
    clearCardStack();
    clearCards();

    // Focus on prompt input
    storyPromptInput.focus();
}

// Show error message
function showError(message) {
    setError(message);
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Clear error message
function clearError() {
    clearStateError();
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
