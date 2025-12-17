'use strict';

// DOM Elements
const apiKeyInput = document.getElementById('api-key');
const storyPromptInput = document.getElementById('story-prompt');
const generateBtn = document.getElementById('generate-btn');
const errorMessage = document.getElementById('error-message');
const storyGrid = document.getElementById('story-grid');

// State
const state = {
    apiKey: localStorage.getItem('openai_key') || '',
    isGenerating: false,
    currentScene: 0,
    images: [null, null, null, null],
    captions: [null, null, null, null],
    cards: [],
    error: null
};

// Initialize
function init() {
    // Load API key from localStorage
    if (state.apiKey) {
        apiKeyInput.value = state.apiKey;
    }

    // Event listeners
    apiKeyInput.addEventListener('input', handleApiKeyChange);
    generateBtn.addEventListener('click', handleGenerate);
    storyPromptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleGenerate();
        }
    });
}

// Handle API key input change
function handleApiKeyChange(e) {
    const key = e.target.value.trim();
    state.apiKey = key;
    if (key) {
        localStorage.setItem('openai_key', key);
    } else {
        localStorage.removeItem('openai_key');
    }
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

    // Reset state
    state.isGenerating = true;
    state.currentScene = 0;
    state.images = [null, null, null, null];
    state.captions = [null, null, null, null];
    
    // Clear previous cards
    storyGrid.innerHTML = '';
    state.cards = [];

    // Update UI
    updateButtonState();
    
    // Generate scene prompts and captions
    const scenePrompts = generateScenePrompts(userPrompt);
    const sceneCaptions = generateSceneCaptions(userPrompt);

    // Generate images sequentially
    try {
        for (let i = 0; i < 4; i++) {
            state.currentScene = i;
            updateButtonState();
            
            // Show loading card for current scene
            showLoadingCard(i);
            
            const imageData = await generateImage(scenePrompts[i]);
            if (imageData) {
                state.images[i] = imageData;
                state.captions[i] = sceneCaptions[i];
                updateSceneCard(i, imageData, sceneCaptions[i]);
            } else {
                throw new Error(`Failed to generate scene ${i + 1}`);
            }
        }
    } catch (error) {
        showError(error.message || 'Failed to generate story. Please try again.');
        // Remove loading card if error occurred
        if (state.cards[state.currentScene]) {
            state.cards[state.currentScene].remove();
        }
    } finally {
        state.isGenerating = false;
        state.currentScene = 0;
        updateButtonState();
    }
}

// Generate scene prompts from user prompt
function generateScenePrompts(userPrompt) {
    return [
        `Scene 1 of 4 - The beginning: ${userPrompt}. Show the opening scene that introduces the setting and characters.`,
        `Scene 2 of 4 - Rising action: ${userPrompt}. Show a development or challenge emerging.`,
        `Scene 3 of 4 - Climax: ${userPrompt}. Show the peak moment of tension or action.`,
        `Scene 4 of 4 - Resolution: ${userPrompt}. Show how the story concludes.`
    ];
}

// Generate scene captions from user prompt
function generateSceneCaptions(userPrompt) {
    // Extract the core idea from the prompt
    const coreIdea = userPrompt.toLowerCase();
    
    return [
        `The beginning: ${coreIdea}. This opening scene introduces the setting and characters, establishing the world where our story unfolds.`,
        `Rising action: ${coreIdea}. A challenge emerges, creating tension and propelling the narrative forward as obstacles appear.`,
        `Climax: ${coreIdea}. The story reaches its peak moment of tension, where the central conflict comes to a dramatic head.`,
        `Resolution: ${coreIdea}. The story concludes, bringing closure and showing how the journey transforms the characters and their world.`
    ];
}

// Generate image using OpenAI API
async function generateImage(prompt) {
    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-image-1.5',
                prompt: prompt,
                n: 1,
                size: '1024x1024',
                quality: 'medium'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Handle both URL and base64 responses
        if (data.data && data.data[0]) {
            // If we get a URL, fetch it and convert to base64 data URL
            if (data.data[0].url) {
                const imageResponse = await fetch(data.data[0].url);
                const blob = await imageResponse.blob();
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } 
            // If we get base64 directly
            else if (data.data[0].b64_json) {
                return `data:image/png;base64,${data.data[0].b64_json}`;
            } else {
                throw new Error('Invalid response format from API');
            }
        } else {
            throw new Error('Invalid response format from API');
        }
    } catch (error) {
        if (error.message.includes('API error')) {
            throw error;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Failed to connect. Please check your internet connection and try again.');
        } else {
            throw new Error(error.message || 'Failed to generate image. Please try again.');
        }
    }
}

// Show loading card for a scene
function showLoadingCard(index) {
    const card = document.createElement('div');
    card.className = 'flex flex-col gap-2';
    card.innerHTML = `
        <div class="w-full aspect-square rounded-xl overflow-hidden bg-[#e5e5e5] relative animate-pulse">
            <div class="absolute inset-0 flex items-center justify-center">
                <p class="text-sm text-[#737373] font-medium">Generating Scene ${index + 1}...</p>
            </div>
        </div>
        <div class="flex flex-col gap-1">
            <div class="h-3 w-16 bg-[#e5e5e5] rounded animate-pulse"></div>
            <div class="h-4 w-full bg-[#e5e5e5] rounded animate-pulse"></div>
            <div class="h-4 w-3/4 bg-[#e5e5e5] rounded animate-pulse"></div>
        </div>
    `;
    storyGrid.appendChild(card);
    state.cards[index] = card;
}

// Update scene card with image and caption
function updateSceneCard(index, imageData, caption) {
    if (!state.cards[index]) return;
    
    const card = state.cards[index];
    card.innerHTML = `
        <div class="w-full aspect-square rounded-xl overflow-hidden bg-[#e5e5e5]">
            <img src="${imageData}" alt="Scene ${index + 1}" class="w-full h-full object-cover" />
        </div>
        <div class="flex flex-col gap-1">
            <div class="text-xs font-medium text-[#737373] uppercase tracking-wide">SCENE ${index + 1}</div>
            <p class="text-sm text-[#171717] leading-relaxed">${caption}</p>
        </div>
    `;
}

// Update button state
function updateButtonState() {
    if (state.isGenerating) {
        generateBtn.disabled = true;
        generateBtn.textContent = `Generating... (${state.currentScene + 1}/4)`;
    } else {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Story';
    }
}

// Show error message
function showError(message) {
    state.error = message;
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Clear error message
function clearError() {
    state.error = null;
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

