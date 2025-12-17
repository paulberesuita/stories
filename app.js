'use strict';

// DOM Elements
const apiKeyInput = document.getElementById('api-key');
const storyPromptInput = document.getElementById('story-prompt');
const generateBtn = document.getElementById('generate-btn');
const errorMessage = document.getElementById('error-message');
const inputSection = document.getElementById('input-section');
const outputSection = document.getElementById('output-section');
const storyCarousel = document.getElementById('story-carousel');
const carouselContainer = document.getElementById('carousel-container');
const carouselDots = document.getElementById('carousel-dots');
const createNewBtn = document.getElementById('create-new-btn');

// State
const state = {
    apiKey: localStorage.getItem('openai_key') || '',
    isGenerating: false,
    currentScene: 0,
    images: [null, null, null, null],
    captions: [null, null, null, null],
    cards: [],
    currentCardIndex: 0,
    error: null,
    touchStartX: 0,
    touchEndX: 0
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
    createNewBtn.addEventListener('click', handleCreateNew);
    storyPromptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleGenerate();
        }
    });

    // Swipe navigation for carousel
    setupSwipeNavigation();
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

    // Hide input section and show output section
    inputSection.classList.add('hidden');
    outputSection.classList.remove('hidden');
    
    // Reset state
    state.isGenerating = true;
    state.currentScene = 0;
    state.currentCardIndex = 0;
    state.images = [null, null, null, null];
    state.captions = [null, null, null, null];
    
    // Clear previous cards
    storyCarousel.innerHTML = '';
    carouselDots.innerHTML = '';
    state.cards = [];
    createNewBtn.classList.add('hidden');

    // Update UI
    updateButtonState();
    
    // Generate scene prompts and captions
    const scenePrompts = generateScenePrompts(userPrompt);
    const sceneCaptions = generateSceneCaptions(userPrompt);

    // Generate images sequentially
    try {
        for (let i = 0; i < 4; i++) {
            state.currentScene = i;
            state.currentCardIndex = i;
            
            // Show loading card for current scene
            showLoadingCard(i);
            
            // Scroll to current card
            scrollToCard(i);
            updateDots();
            
            const imageData = await generateImage(scenePrompts[i]);
            if (imageData) {
                state.images[i] = imageData;
                state.captions[i] = sceneCaptions[i];
                updateSceneCard(i, imageData, sceneCaptions[i]);
            } else {
                throw new Error(`Failed to generate scene ${i + 1}`);
            }
        }
        
        // All scenes complete - show "Create New Story" button
        createNewBtn.classList.remove('hidden');
    } catch (error) {
        showError(error.message || 'Failed to generate story. Please try again.');
        // Remove loading card if error occurred
        if (state.cards[state.currentScene]) {
            state.cards[state.currentScene].remove();
        }
        // Show input section again on error
        inputSection.classList.remove('hidden');
        outputSection.classList.add('hidden');
    } finally {
        state.isGenerating = false;
        state.currentScene = 0;
        updateButtonState();
    }
}

// Handle "Create New Story" button click
function handleCreateNew() {
    // Clear story prompt (keep API key)
    storyPromptInput.value = '';
    
    // Hide output section and show input section
    outputSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    
    // Clear carousel
    storyCarousel.innerHTML = '';
    carouselDots.innerHTML = '';
    state.cards = [];
    state.images = [null, null, null, null];
    state.captions = [null, null, null, null];
    state.currentCardIndex = 0;
    
    // Focus on prompt input
    storyPromptInput.focus();
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
    card.className = 'flex flex-col gap-2 flex-shrink-0 w-[85vw] max-w-[500px] snap-center';
    card.innerHTML = `
        <div class="w-full aspect-square rounded-xl overflow-hidden bg-[#e5e5e5] relative animate-pulse">
            <div class="absolute inset-0 flex items-center justify-center">
                <p class="text-sm text-blue-400 font-medium">Generating Scene ${index + 1}...</p>
            </div>
        </div>
        <div class="flex flex-col gap-1">
            <div class="h-3 w-16 bg-[#e5e5e5] rounded animate-pulse"></div>
            <div class="h-4 w-full bg-[#e5e5e5] rounded animate-pulse"></div>
            <div class="h-4 w-3/4 bg-[#e5e5e5] rounded animate-pulse"></div>
        </div>
    `;
    storyCarousel.appendChild(card);
    state.cards[index] = card;
    updateDots();
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
    // Ensure card maintains its width class
    card.className = 'flex flex-col gap-2 flex-shrink-0 w-[85vw] max-w-[500px] snap-center';
}

// Scroll carousel to specific card
function scrollToCard(index) {
    if (!state.cards[index]) return;
    
    const card = state.cards[index];
    const container = carouselContainer;
    
    // Calculate scroll position to center the card
    const cardLeft = card.offsetLeft;
    const cardWidth = card.offsetWidth;
    const containerWidth = container.offsetWidth;
    const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);
    
    container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
    });
    
    state.currentCardIndex = index;
    updateDots();
}

// Update navigation dots
function updateDots() {
    carouselDots.innerHTML = '';
    for (let i = 0; i < state.cards.length; i++) {
        const dot = document.createElement('button');
        dot.className = `w-2 h-2 rounded-full transition-all ${
            i === state.currentCardIndex 
                ? 'bg-blue-500 w-6' 
                : 'bg-[#e5e5e5] hover:bg-[#d4d4d4]'
        }`;
        dot.addEventListener('click', () => {
            scrollToCard(i);
        });
        carouselDots.appendChild(dot);
    }
}

// Setup swipe navigation for carousel
function setupSwipeNavigation() {
    carouselContainer.addEventListener('touchstart', (e) => {
        state.touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carouselContainer.addEventListener('touchend', (e) => {
        state.touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    // Also handle mouse drag
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;

    carouselContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - carouselContainer.offsetLeft;
        scrollLeft = carouselContainer.scrollLeft;
        carouselContainer.style.cursor = 'grabbing';
    });

    carouselContainer.addEventListener('mouseleave', () => {
        isDragging = false;
        carouselContainer.style.cursor = 'grab';
    });

    carouselContainer.addEventListener('mouseup', () => {
        isDragging = false;
        carouselContainer.style.cursor = 'grab';
    });

    carouselContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - carouselContainer.offsetLeft;
        const walk = (x - startX) * 2;
        carouselContainer.scrollLeft = scrollLeft - walk;
    });

    // Update current card index on scroll
    carouselContainer.addEventListener('scroll', () => {
        updateCurrentCardFromScroll();
    });
}

// Handle swipe gesture
function handleSwipe() {
    const swipeThreshold = 50;
    const diff = state.touchStartX - state.touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0 && state.currentCardIndex < state.cards.length - 1) {
            // Swipe left - next card
            scrollToCard(state.currentCardIndex + 1);
        } else if (diff < 0 && state.currentCardIndex > 0) {
            // Swipe right - previous card
            scrollToCard(state.currentCardIndex - 1);
        }
    }
}

// Update current card index based on scroll position
function updateCurrentCardFromScroll() {
    if (state.cards.length === 0) return;
    
    const container = carouselContainer;
    const scrollPosition = container.scrollLeft + container.offsetWidth / 2;
    
    let closestCard = 0;
    let closestDistance = Infinity;
    
    state.cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(scrollPosition - cardCenter);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestCard = index;
        }
    });
    
    if (closestCard !== state.currentCardIndex) {
        state.currentCardIndex = closestCard;
        updateDots();
    }
}

// Update button state
function updateButtonState() {
    // Button is hidden during generation, so no need to update
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

