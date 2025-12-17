'use strict';

// DOM Elements
const apiKeyInput = document.getElementById('api-key');
const storyPromptInput = document.getElementById('story-prompt');
const generateBtn = document.getElementById('generate-btn');
const errorMessage = document.getElementById('error-message');
const inputSection = document.getElementById('input-section');
const outputSection = document.getElementById('output-section');
const cardStack = document.getElementById('card-stack');
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

    // Card drag is set up per card in showLoadingCard/updateSceneCard
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

    // Animate section transition
    animateSectionTransition(inputSection, outputSection, 'out', 'in');
    
    // Reset state
    state.isGenerating = true;
    state.currentScene = 0;
    state.currentCardIndex = 0;
    state.images = [null, null, null, null];
    state.captions = [null, null, null, null];
    
    // Clear previous cards
    cardStack.innerHTML = '';
    carouselDots.innerHTML = '';
    state.cards = [];
    state.currentCardIndex = 0;
    createNewBtn.classList.add('hidden');

    // Update UI
    updateButtonState();
    
    // Generate scene prompts and captions
    const scenePrompts = generateScenePrompts(userPrompt);
    const sceneCaptions = generateSceneCaptions(userPrompt);

    // Show all loading cards at once in stack
    for (let i = 0; i < 4; i++) {
        showLoadingCard(i);
    }
    
    // Set first card as active initially
    state.currentCardIndex = 0;
    updateCardStackPosition();
    updateDots();
    
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
                state.images[index] = imageData;
                state.captions[index] = caption;
                updateSceneCard(index, imageData, caption);
            } else {
                throw new Error(`Failed to generate scene ${index + 1}`);
            }
        });
        
        // All scenes complete - show "Create New Story" button with animation
        const { animate } = Motion;
        createNewBtn.classList.remove('hidden');
        createNewBtn.style.opacity = '0';
        createNewBtn.style.transform = 'translateY(10px)';
        requestAnimationFrame(() => {
            animate(createNewBtn, {
                opacity: [0, 1],
                y: [10, 0]
            }, {
                duration: 0.3,
                ease: "easeOut"
            });
        });
    } catch (error) {
        showError(error.message || 'Failed to generate story. Please try again.');
        // Show input section again on error
        animateSectionTransition(outputSection, inputSection, 'out', 'in');
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
    
    // Animate section transition
    animateSectionTransition(outputSection, inputSection, 'out', 'in');
    
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
    card.className = 'story-card flex flex-col gap-2 w-[85vw] max-w-[400px]';
    card.dataset.index = index;
    card.innerHTML = `
        <div class="card-content flex flex-col gap-2 w-full">
            <div class="w-full aspect-square rounded-xl overflow-hidden bg-[#e5e5e5] relative shadow-lg" id="loading-image-${index}">
                <div class="absolute inset-0 flex items-center justify-center">
                    <p class="text-sm text-blue-400 font-medium">Generating Scene ${index + 1}...</p>
                </div>
            </div>
            <div class="flex flex-col gap-1">
                <div class="h-3 w-16 bg-[#e5e5e5] rounded" id="loading-skeleton-1-${index}"></div>
                <div class="h-4 w-full bg-[#e5e5e5] rounded" id="loading-skeleton-2-${index}"></div>
                <div class="h-4 w-3/4 bg-[#e5e5e5] rounded" id="loading-skeleton-3-${index}"></div>
            </div>
        </div>
    `;
    cardStack.appendChild(card);
    state.cards[index] = card;
    
    // Position card in stack (newest on top)
    updateCardStackPosition();
    
    // Animate card entrance using Motion API
    const { animate } = Motion;
    animate(card, {
        opacity: [0, 1],
        y: [20, 0],
        scale: [0.95, 1]
    }, {
        duration: 0.35,
        ease: "easeOut"
    });
    
    // Animate loading pulse
    const loadingImage = document.getElementById(`loading-image-${index}`);
    const skeleton1 = document.getElementById(`loading-skeleton-1-${index}`);
    const skeleton2 = document.getElementById(`loading-skeleton-2-${index}`);
    const skeleton3 = document.getElementById(`loading-skeleton-3-${index}`);
    
    animate([loadingImage, skeleton1, skeleton2, skeleton3], {
        opacity: [0.5, 1, 0.5]
    }, {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
    });
    
    // Setup drag for this card
    setupCardDrag(card, index);
}

// Update scene card with image and caption
function updateSceneCard(index, imageData, caption) {
    if (!state.cards[index]) return;
    
    const card = state.cards[index];
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content flex flex-col gap-2 w-full';
    
    const imageContainer = document.createElement('div');
    imageContainer.className = 'w-full aspect-square rounded-xl overflow-hidden bg-[#e5e5e5] shadow-lg';
    const img = document.createElement('img');
    img.src = imageData;
    img.alt = `Scene ${index + 1}`;
    img.className = 'w-full h-full object-cover';
    img.style.opacity = '0';
    
    imageContainer.appendChild(img);
    cardContent.appendChild(imageContainer);
    
    const captionDiv = document.createElement('div');
    captionDiv.className = 'flex flex-col gap-1 px-2 pb-2';
    captionDiv.innerHTML = `
        <div class="text-xs font-medium text-[#737373] uppercase tracking-wide">SCENE ${index + 1}</div>
        <p class="text-sm text-[#171717] leading-relaxed">${caption}</p>
    `;
    cardContent.appendChild(captionDiv);
    
    card.innerHTML = '';
    card.appendChild(cardContent);
    
    // Ensure card maintains its classes
    card.className = 'story-card flex flex-col gap-2 w-[85vw] max-w-[400px]';
    card.dataset.index = index;
    
    // Update stack position
    updateCardStackPosition();
    
    // Re-setup drag
    setupCardDrag(card, index);
    
    // Animate image reveal
    const { animate } = Motion;
    img.onload = () => {
        animate(img, {
            opacity: [0, 1],
            scale: [0.98, 1]
        }, {
            duration: 0.25,
            ease: "easeOut"
        });
    };
}

// Update card stack positions (stack cards with offset)
function updateCardStackPosition() {
    state.cards.forEach((card, index) => {
        if (!card) return;
        
        // Calculate z-index - cards are ordered by index, with current on top
        // Cards are stacked: newest (index 3) on top, oldest (index 0) on bottom
        // But we want currentCardIndex to be on top
        const isActive = index === state.currentCardIndex;
        const zIndex = isActive ? state.cards.length + 10 : state.cards.length - index;
        
        // Stack offset: cards behind are offset down and slightly to the side
        const stackOffsetY = (state.cards.length - 1 - index) * 12; // 12px vertical offset
        const stackOffsetX = (state.cards.length - 1 - index) * 4; // 4px horizontal offset
        
        card.style.zIndex = zIndex;
        card.style.display = 'block';
        card.style.transform = `translateX(calc(-50% + ${stackOffsetX}px)) translateY(${stackOffsetY}px)`;
        
        // Add/remove active class to control content visibility
        if (isActive) {
            card.classList.add('active');
            card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
        } else {
            card.classList.remove('active');
            card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }
    });
}

// Setup drag interaction for a card
function setupCardDrag(card, index) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    const handleStart = (clientX, clientY) => {
        // Only allow dragging the top card
        if (index !== state.currentCardIndex) return;
        
        isDragging = true;
        startX = clientX;
        startY = clientY;
        currentX = 0;
        currentY = 0;
        card.classList.add('dragging');
    };
    
    const handleMove = (clientX, clientY) => {
        if (!isDragging) return;
        
        currentX = clientX - startX;
        currentY = clientY - startY;
        
        // Only allow horizontal dragging
        dragOffsetX = currentX;
        dragOffsetY = 0;
        
        // Apply transform with stack offset
        const stackOffsetY = (state.cards.length - 1 - index) * 12;
        const stackOffsetX = (state.cards.length - 1 - index) * 4;
        const rotation = dragOffsetX * 0.1;
        card.style.transform = `translateX(calc(-50% + ${stackOffsetX}px + ${dragOffsetX}px)) translateY(${stackOffsetY}px) rotate(${rotation}deg)`;
    };
    
    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        card.classList.remove('dragging');
        
        const threshold = 80; // Minimum drag distance to dismiss card
        const velocity = Math.abs(currentX);
        
        if (Math.abs(dragOffsetX) > threshold || velocity > 3) {
            // Dismiss card and reveal next/previous
            if (dragOffsetX < 0 && state.currentCardIndex < state.cards.length - 1) {
                // Swiped left - dismiss current, show next card
                dismissCard(state.currentCardIndex, state.currentCardIndex + 1, -1);
            } else if (dragOffsetX > 0 && state.currentCardIndex > 0) {
                // Swiped right - dismiss current, show previous card
                dismissCard(state.currentCardIndex, state.currentCardIndex - 1, 1);
            } else {
                // Snap back
                resetCardPosition(card, index, dragOffsetX);
            }
        } else {
            // Snap back
            resetCardPosition(card, index, dragOffsetX);
        }
    };
    
    // Mouse events
    card.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
    });
    
    document.addEventListener('mousemove', (e) => {
        handleMove(e.clientX, e.clientY);
    });
    
    document.addEventListener('mouseup', () => {
        handleEnd();
    });
    
    // Touch events
    card.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
        handleEnd();
    }, { passive: true });
}

// Dismiss current card and reveal next/previous (swipe to dismiss)
function dismissCard(currentIndex, nextIndex, direction) {
    if (nextIndex < 0 || nextIndex >= state.cards.length) return;
    
    const { animate } = Motion;
    const currentCard = state.cards[currentIndex];
    const nextCard = state.cards[nextIndex];
    
    if (!currentCard || !nextCard) return;
    
    // Animate current card off screen (dismiss)
    const dismissDistance = direction * 600;
    animate(currentCard, {
        x: [0, dismissDistance],
        opacity: [1, 0],
        rotate: [0, direction * 20],
        scale: [1, 0.8]
    }, {
        duration: 0.4,
        ease: "easeIn",
        onUpdate: (latest) => {
            const stackOffsetY = (state.cards.length - 1 - currentIndex) * 12;
            const stackOffsetX = (state.cards.length - 1 - currentIndex) * 4;
            currentCard.style.transform = `translateX(calc(-50% + ${stackOffsetX}px + ${latest.x}px)) translateY(${stackOffsetY}px) rotate(${latest.rotate}deg) scale(${latest.scale})`;
        },
        onComplete: () => {
            // Update current index
            state.currentCardIndex = nextIndex;
            updateCardStackPosition();
        }
    });
    
    // Bring next card to front with animation
    const newStackOffsetY = (state.cards.length - 1 - nextIndex) * 12;
    const newStackOffsetX = (state.cards.length - 1 - nextIndex) * 4;
    
    // Set initial position
    nextCard.style.opacity = '1';
    nextCard.style.transform = `translateX(calc(-50% + ${newStackOffsetX}px)) translateY(${newStackOffsetY}px) scale(0.95)`;
    nextCard.classList.add('active');
    
    requestAnimationFrame(() => {
        animate(nextCard, {
            scale: [0.95, 1]
        }, {
            duration: 0.3,
            ease: "easeOut",
            onUpdate: (latest) => {
                nextCard.style.transform = `translateX(calc(-50% + ${newStackOffsetX}px)) translateY(${newStackOffsetY}px) scale(${latest.scale})`;
            }
        });
    });
    
    updateDots();
}

// Flip to a specific card (for dot navigation)
function flipToCard(index) {
    if (index < 0 || index >= state.cards.length || index === state.currentCardIndex) return;
    
    const { animate } = Motion;
    const oldIndex = state.currentCardIndex;
    const direction = index > oldIndex ? 1 : -1;
    
    // Update index immediately
    state.currentCardIndex = index;
    
    // Animate old card to back
    const oldCard = state.cards[oldIndex];
    if (oldCard) {
        const oldStackOffsetY = (state.cards.length - 1 - oldIndex) * 12;
        const oldStackOffsetX = (state.cards.length - 1 - oldIndex) * 4;
        oldCard.classList.remove('active');
        
        animate(oldCard, {
            scale: [1, 0.95]
        }, {
            duration: 0.2,
            ease: "easeIn",
            onUpdate: (latest) => {
                oldCard.style.transform = `translateX(calc(-50% + ${oldStackOffsetX}px)) translateY(${oldStackOffsetY}px) scale(${latest.scale})`;
            }
        });
    }
    
    // Bring new card to front
    const newCard = state.cards[index];
    if (newCard) {
        const newStackOffsetY = (state.cards.length - 1 - index) * 12;
        const newStackOffsetX = (state.cards.length - 1 - index) * 4;
        newCard.classList.add('active');
        newCard.style.transform = `translateX(calc(-50% + ${newStackOffsetX}px)) translateY(${newStackOffsetY}px) scale(0.95)`;
        
        requestAnimationFrame(() => {
            animate(newCard, {
                scale: [0.95, 1]
            }, {
                duration: 0.3,
                ease: "easeOut",
                onUpdate: (latest) => {
                    newCard.style.transform = `translateX(calc(-50% + ${newStackOffsetX}px)) translateY(${newStackOffsetY}px) scale(${latest.scale})`;
                },
                onComplete: () => {
                    updateCardStackPosition();
                }
            });
        });
    } else {
        updateCardStackPosition();
    }
    
    updateDots();
}

// Reset card position (snap back if not dismissed)
function resetCardPosition(card, index, currentOffsetX) {
    const { animate } = Motion;
    const stackOffsetY = (state.cards.length - 1 - index) * 12;
    const stackOffsetX = (state.cards.length - 1 - index) * 4;
    
    animate(card, {
        x: [currentOffsetX, 0],
        rotate: [currentOffsetX * 0.1, 0]
    }, {
        duration: 0.3,
        ease: "easeOut",
        onUpdate: (latest) => {
            card.style.transform = `translateX(calc(-50% + ${stackOffsetX}px + ${latest.x}px)) translateY(${stackOffsetY}px) rotate(${latest.rotate}deg)`;
        },
        onComplete: () => {
            card.style.transform = `translateX(calc(-50% + ${stackOffsetX}px)) translateY(${stackOffsetY}px)`;
        }
    });
}

// Update navigation dots
function updateDots() {
    const previousDots = Array.from(carouselDots.children);
    const previousActiveIndex = previousDots.findIndex(dot => 
        dot.style.width === '24px' || dot.classList.contains('active')
    );
    
    carouselDots.innerHTML = '';
    for (let i = 0; i < state.cards.length; i++) {
        const dot = document.createElement('button');
        const isActive = i === state.currentCardIndex;
        dot.className = `rounded-full ${
            isActive 
                ? 'bg-blue-500 active' 
                : 'bg-[#e5e5e5] hover:bg-[#d4d4d4]'
        }`;
        
        // Set initial state
        const targetWidth = isActive ? 24 : 8;
        dot.style.width = `${targetWidth}px`;
        dot.style.height = '8px';
        
        // If transitioning from previous state, animate
        if (previousActiveIndex !== -1 && previousActiveIndex !== state.currentCardIndex) {
            const { animate } = Motion;
            if (i === previousActiveIndex) {
                // Was active, now inactive
                dot.style.width = '24px';
                requestAnimationFrame(() => {
                    animate(dot, {
                        width: [24, 8]
                    }, {
                        duration: 0.2,
                        ease: "easeOut"
                    });
                });
            } else if (isActive) {
                // Becomes active
                dot.style.width = '8px';
                requestAnimationFrame(() => {
                    animate(dot, {
                        width: [8, 24]
                    }, {
                        duration: 0.2,
                        ease: "easeOut"
                    });
                });
            }
        }
        
        dot.addEventListener('click', () => {
            flipToCard(i);
        });
        carouselDots.appendChild(dot);
    }
}

// Setup swipe navigation for carousel
function setupSwipeNavigation() {
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let velocity = 0;
    let lastX = 0;
    let lastTime = 0;
    let animationFrame = null;

    // Smooth scroll update function
    function updateScroll() {
        if (!isDragging) return;
        animationFrame = requestAnimationFrame(updateScroll);
    }

    // Touch events for mobile swipe
    let touchStartY = 0;
    let isHorizontalSwipe = false;
    
    carouselContainer.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        state.touchStartX = touch.screenX;
        touchStartY = touch.screenY;
        isDragging = true;
        isHorizontalSwipe = false;
        startX = touch.screenX;
        scrollLeft = carouselContainer.scrollLeft;
        lastX = touch.screenX;
        lastTime = Date.now();
        velocity = 0;
        carouselContainer.style.scrollBehavior = 'auto';
    }, { passive: true });

    carouselContainer.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        const currentX = touch.screenX;
        const currentY = touch.screenY;
        const currentTime = Date.now();
        
        // Determine if this is a horizontal swipe
        if (!isHorizontalSwipe) {
            const deltaX = Math.abs(currentX - state.touchStartX);
            const deltaY = Math.abs(currentY - touchStartY);
            isHorizontalSwipe = deltaX > deltaY && deltaX > 10;
        }
        
        // Only handle horizontal swipes
        if (isHorizontalSwipe) {
            const deltaX = currentX - lastX;
            const deltaTime = currentTime - lastTime;
            
            if (deltaTime > 0) {
                velocity = deltaX / deltaTime;
            }
            
            // Smooth 1:1 drag ratio
            const walk = currentX - startX;
            carouselContainer.scrollLeft = scrollLeft - walk;
            
            lastX = currentX;
            lastTime = currentTime;
        }
    }, { passive: true });

    carouselContainer.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        
        const touch = e.changedTouches[0];
        state.touchEndX = touch.screenX;
        isDragging = false;
        carouselContainer.style.scrollBehavior = 'smooth';
        
        // Only process swipe if it was horizontal
        if (!isHorizontalSwipe) {
            return;
        }
        
        // Use velocity and distance to determine direction
        const swipeThreshold = 50; // Increased threshold for better mobile experience
        const totalSwipe = state.touchEndX - state.touchStartX;
        const swipeDistance = Math.abs(totalSwipe);
        const minSwipeDistance = 30;
        
        // Check if swipe is significant enough
        if (swipeDistance > minSwipeDistance || Math.abs(velocity) > 0.3) {
            // Determine direction
            if (totalSwipe < -swipeThreshold || (totalSwipe < -minSwipeDistance && velocity < -0.2)) {
                // Swipe left - go to next card
                if (state.currentCardIndex < state.cards.length - 1) {
                    scrollToCard(state.currentCardIndex + 1);
                    return;
                }
            } else if (totalSwipe > swipeThreshold || (totalSwipe > minSwipeDistance && velocity > 0.2)) {
                // Swipe right - go to previous card
                if (state.currentCardIndex > 0) {
                    scrollToCard(state.currentCardIndex - 1);
                    return;
                }
            }
        }
        
        // Otherwise snap to nearest card
        snapToNearestCard();
    }, { passive: true });
    
    carouselContainer.addEventListener('touchcancel', () => {
        if (isDragging) {
            isDragging = false;
            carouselContainer.style.scrollBehavior = 'smooth';
            snapToNearestCard();
        }
    }, { passive: true });

    // Mouse drag events
    carouselContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX;
        scrollLeft = carouselContainer.scrollLeft;
        lastX = e.pageX;
        lastTime = Date.now();
        velocity = 0;
        carouselContainer.style.cursor = 'grabbing';
        carouselContainer.style.scrollBehavior = 'auto';
        e.preventDefault();
    });

    carouselContainer.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            carouselContainer.style.cursor = 'grab';
            carouselContainer.style.scrollBehavior = 'smooth';
            snapToNearestCard();
        }
    });

    carouselContainer.addEventListener('mouseup', (e) => {
        if (isDragging) {
            isDragging = false;
            carouselContainer.style.cursor = 'grab';
            carouselContainer.style.scrollBehavior = 'smooth';
            
            // Use velocity to determine direction
            const swipeThreshold = 50;
            const totalDrag = e.pageX - startX;
            
            if (Math.abs(totalDrag) > swipeThreshold || Math.abs(velocity) > 0.5) {
                if (totalDrag < -swipeThreshold || velocity < -0.3) {
                    // Drag left - next card
                    if (state.currentCardIndex < state.cards.length - 1) {
                        scrollToCard(state.currentCardIndex + 1);
                        return;
                    }
                } else if (totalDrag > swipeThreshold || velocity > 0.3) {
                    // Drag right - previous card
                    if (state.currentCardIndex > 0) {
                        scrollToCard(state.currentCardIndex - 1);
                        return;
                    }
                }
            }
            
            snapToNearestCard();
        }
    });

    carouselContainer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const currentX = e.pageX;
        const currentTime = Date.now();
        const deltaX = currentX - lastX;
        const deltaTime = currentTime - lastTime;
        
        if (deltaTime > 0) {
            velocity = deltaX / deltaTime;
        }
        
        // Smooth 1:1 drag ratio
        const walk = currentX - startX;
        carouselContainer.scrollLeft = scrollLeft - walk;
        
        lastX = currentX;
        lastTime = currentTime;
    });

    // Update current card index on scroll (more responsive)
    let scrollTimeout;
    carouselContainer.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        // Update more frequently during scroll for better feedback
        scrollTimeout = setTimeout(() => {
            if (!isDragging) {
                updateCurrentCardFromScroll();
            }
        }, 16); // ~60fps updates
    });
}

// Snap to nearest card after drag/swipe
function snapToNearestCard() {
    if (state.cards.length === 0) return;
    
    const container = carouselContainer;
    const containerRect = container.getBoundingClientRect();
    const scrollPosition = container.scrollLeft + containerRect.width / 2;
    
    let closestCard = 0;
    let closestDistance = Infinity;
    
    state.cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const carouselRect = storyCarousel.getBoundingClientRect();
        
        // Calculate card center relative to carousel, then add scroll
        const cardLeftRelative = cardRect.left - carouselRect.left;
        const cardAbsoluteLeft = cardLeftRelative + container.scrollLeft;
        const cardWidth = cardRect.width;
        const cardCenter = cardAbsoluteLeft + cardWidth / 2;
        
        const distance = Math.abs(scrollPosition - cardCenter);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestCard = index;
        }
    });
    
    // Only snap if we're not already on the closest card
    if (closestCard !== state.currentCardIndex) {
        scrollToCard(closestCard);
    } else {
        // Even if it's the same card, ensure it's properly centered
        scrollToCard(closestCard);
    }
}

// Handle swipe gesture (legacy - now handled in snapToNearestCard)
function handleSwipe() {
    // This function is no longer needed as snapToNearestCard handles it
    snapToNearestCard();
}

// Update current card index based on scroll position
function updateCurrentCardFromScroll() {
    if (state.cards.length === 0) return;
    
    const container = carouselContainer;
    const containerRect = container.getBoundingClientRect();
    const scrollPosition = container.scrollLeft + containerRect.width / 2;
    
    let closestCard = 0;
    let closestDistance = Infinity;
    
    state.cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const carouselRect = storyCarousel.getBoundingClientRect();
        
        // Calculate card center relative to carousel, then add scroll
        const cardLeftRelative = cardRect.left - carouselRect.left;
        const cardAbsoluteLeft = cardLeftRelative + container.scrollLeft;
        const cardWidth = cardRect.width;
        const cardCenter = cardAbsoluteLeft + cardWidth / 2;
        
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

// Animate section transitions
function animateSectionTransition(hideSection, showSection, hideDirection, showDirection) {
    const { animate } = Motion;
    
    // Hide section with animation
    if (!hideSection.classList.contains('hidden')) {
        animate(hideSection, {
            opacity: [1, 0],
            y: [0, -20]
        }, {
            duration: 0.3,
            ease: "easeIn",
            onComplete: () => {
                hideSection.classList.add('hidden');
            }
        });
    } else {
        hideSection.classList.add('hidden');
    }
    
    // Show section with animation
    showSection.classList.remove('hidden');
    showSection.style.opacity = '0';
    showSection.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
        animate(showSection, {
            opacity: [0, 1],
            y: [20, 0]
        }, {
            duration: 0.35,
            ease: "easeOut",
            onComplete: () => {
                showSection.style.opacity = '';
                showSection.style.transform = '';
            }
        });
    });
}

// Add button press animations
function setupButtonAnimations() {
    const { animate } = Motion;
    
    // Generate button
    generateBtn.addEventListener('mousedown', () => {
        animate(generateBtn, {
            scale: 0.98
        }, {
            duration: 0.1,
            ease: "easeIn"
        });
    });
    
    generateBtn.addEventListener('mouseup', () => {
        animate(generateBtn, {
            scale: 1
        }, {
            duration: 0.2,
            ease: "easeOut"
        });
    });
    
    generateBtn.addEventListener('mouseleave', () => {
        animate(generateBtn, {
            scale: 1
        }, {
            duration: 0.2,
            ease: "easeOut"
        });
    });
    
    // Create New Story button
    createNewBtn.addEventListener('mousedown', () => {
        animate(createNewBtn, {
            scale: 0.98
        }, {
            duration: 0.1,
            ease: "easeIn"
        });
    });
    
    createNewBtn.addEventListener('mouseup', () => {
        animate(createNewBtn, {
            scale: 1
        }, {
            duration: 0.2,
            ease: "easeOut"
        });
    });
    
    createNewBtn.addEventListener('mouseleave', () => {
        animate(createNewBtn, {
            scale: 1
        }, {
            duration: 0.2,
            ease: "easeOut"
        });
    });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        setupButtonAnimations();
    });
} else {
    init();
    setupButtonAnimations();
}

