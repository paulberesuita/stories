'use strict';

// DOM Elements
const apiKeyInput = document.getElementById('api-key');
const storyPromptInput = document.getElementById('story-prompt');
const generateBtn = document.getElementById('generate-btn');
const errorMessage = document.getElementById('error-message');
const inputSection = document.getElementById('input-section');
const outputSection = document.getElementById('output-section');
const cardStack = document.getElementById('card-stack');
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
    error: null
};

// Animation control management - prevents conflicting animations
const cardAnimations = new WeakMap();

function cancelCardAnimation(card) {
    const controls = cardAnimations.get(card);
    if (controls && controls.stop) {
        controls.stop();
    }
}

function trackCardAnimation(card, controls) {
    cancelCardAnimation(card);
    cardAnimations.set(card, controls);
}

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

    // Clear card stack
    cardStack.innerHTML = '';
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
            <div class="w-full aspect-square rounded-xl overflow-hidden bg-[#e5e5e5] relative shadow-[0_8px_30px_rgba(0,0,0,0.12)]" id="loading-image-${index}">
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
    imageContainer.className = 'w-full aspect-square rounded-xl overflow-hidden bg-[#e5e5e5] shadow-[0_8px_30px_rgba(0,0,0,0.12)]';
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

// Update card stack positions (stack cards with alternating offsets and rotations)
function updateCardStackPosition() {
    state.cards.forEach((card, index) => {
        if (!card) return;
        
        const isActive = index === state.currentCardIndex;
        
        // Calculate position relative to current card
        let positionFromTop;
        if (index === state.currentCardIndex) {
            positionFromTop = 0; // On top
        } else if (index < state.currentCardIndex) {
            // Card is before current in array, goes behind
            positionFromTop = state.currentCardIndex - index;
        } else {
            // Card is after current in array, goes behind
            positionFromTop = index - state.currentCardIndex;
        }
        
        const zIndex = isActive ? state.cards.length + 10 : state.cards.length - positionFromTop;
        
        // Alternating offsets for natural "dropped deck" look
        const offsetDirection = positionFromTop % 2 === 0 ? -1 : 1;
        const stackOffsetY = positionFromTop * 14; // 14px vertical offset
        const stackOffsetX = positionFromTop * 8 * offsetDirection; // Alternating horizontal offset
        const rotation = positionFromTop * 2 * offsetDirection; // Alternating rotation
        
        card.style.zIndex = zIndex;
        card.style.display = 'block';
        
        // Set transform
        if (isActive) {
            // Top card: centered, no rotation
            card.style.transform = `translateX(-50%) translateY(${stackOffsetY}px)`;
            card.classList.add('active');
        } else {
            // Cards behind: offset and rotated
            card.style.transform = `translateX(calc(-50% + ${stackOffsetX}px)) translateY(${stackOffsetY}px) rotate(${rotation}deg)`;
            card.classList.remove('active');
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
        
        // Apply transform - top card is centered, so just add drag offset
        const stackOffsetY = (state.cards.length - 1 - index) * 14;
        const rotation = dragOffsetX * 0.15; // More rotation during drag
        card.style.transform = `translateX(calc(-50% + ${dragOffsetX}px)) translateY(${stackOffsetY}px) rotate(${rotation}deg)`;
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

// Move current card to back and reveal next/previous (swipe to cycle)
function dismissCard(currentIndex, nextIndex, direction) {
    if (nextIndex < 0 || nextIndex >= state.cards.length) return;

    const { animate, spring } = Motion;

    // Update current index first
    state.currentCardIndex = nextIndex;

    // Animate all cards to their new positions
    state.cards.forEach((card, index) => {
        if (!card) return;

        // Cancel any existing animation on this card
        cancelCardAnimation(card);

        const isActive = index === state.currentCardIndex;

        // Calculate position relative to current card
        let positionFromTop;
        if (index === state.currentCardIndex) {
            positionFromTop = 0; // On top
        } else if (index < state.currentCardIndex) {
            positionFromTop = state.currentCardIndex - index; // Behind
        } else {
            positionFromTop = index - state.currentCardIndex; // Behind
        }

        const zIndex = isActive ? state.cards.length + 10 : state.cards.length - positionFromTop;
        card.style.zIndex = zIndex;

        // Calculate target position
        const offsetDirection = positionFromTop % 2 === 0 ? -1 : 1;
        const stackOffsetY = positionFromTop * 14;
        const stackOffsetX = positionFromTop * 8 * offsetDirection;
        const rotation = positionFromTop * 2 * offsetDirection;

        // Get current transform values by parsing
        const currentTransform = card.style.transform || '';
        let currentX = 0, currentY = 0, currentRotate = 0;

        // Parse current transform
        const xMatch = currentTransform.match(/translateX\([^)]*([-\d.]+)px/);
        const yMatch = currentTransform.match(/translateY\(([-\d.]+)px/);
        const rMatch = currentTransform.match(/rotate\(([-\d.]+)deg/);

        if (xMatch) currentX = parseFloat(xMatch[1]) || 0;
        if (yMatch) currentY = parseFloat(yMatch[1]) || 0;
        if (rMatch) currentRotate = parseFloat(rMatch[1]) || 0;

        // Target values
        const targetX = isActive ? 0 : stackOffsetX;
        const targetY = stackOffsetY;
        const targetRotate = isActive ? 0 : rotation;

        // Update classes
        if (isActive) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }

        // Animate to new position with spring physics
        const controls = animate(card, {
            x: [currentX, targetX],
            y: [currentY, targetY],
            rotate: [currentRotate, targetRotate],
            scale: isActive ? [0.95, 1] : [1, 0.95]
        }, {
            duration: 0.5,
            ease: spring({ stiffness: 300, damping: 25 }),
            onUpdate: (latest) => {
                card.style.transform = `translateX(calc(-50% + ${latest.x}px)) translateY(${latest.y}px) rotate(${latest.rotate}deg) scale(${latest.scale})`;
            },
            onComplete: () => {
                // Set final transform
                if (isActive) {
                    card.style.transform = `translateX(-50%) translateY(${targetY}px)`;
                } else {
                    card.style.transform = `translateX(calc(-50% + ${targetX}px)) translateY(${targetY}px) rotate(${targetRotate}deg)`;
                }
            }
        });

        trackCardAnimation(card, controls);
    });
}

// Flip to a specific card (programmatic navigation)
function flipToCard(index) {
    if (index < 0 || index >= state.cards.length || index === state.currentCardIndex) return;

    const { animate, spring } = Motion;
    const oldIndex = state.currentCardIndex;

    // Update index immediately
    state.currentCardIndex = index;

    // Animate old card to back
    const oldCard = state.cards[oldIndex];
    if (oldCard) {
        cancelCardAnimation(oldCard);

        const oldStackOffsetY = (state.cards.length - 1 - oldIndex) * 14;
        const positionFromTop = state.cards.length - 1 - oldIndex;
        const offsetDirection = positionFromTop % 2 === 0 ? -1 : 1;
        const oldStackOffsetX = positionFromTop * 8 * offsetDirection;
        const oldRotation = positionFromTop * 2 * offsetDirection;

        oldCard.classList.remove('active');

        const oldControls = animate(oldCard, {
            x: [0, oldStackOffsetX],
            rotate: [0, oldRotation],
            scale: [1, 0.95]
        }, {
            duration: 0.4,
            ease: spring({ stiffness: 300, damping: 25 }),
            onUpdate: (latest) => {
                oldCard.style.transform = `translateX(calc(-50% + ${latest.x}px)) translateY(${oldStackOffsetY}px) rotate(${latest.rotate}deg) scale(${latest.scale})`;
            }
        });

        trackCardAnimation(oldCard, oldControls);
    }

    // Bring new card to front
    const newCard = state.cards[index];
    if (newCard) {
        cancelCardAnimation(newCard);

        const newStackOffsetY = (state.cards.length - 1 - index) * 14;
        const positionFromTop = state.cards.length - 1 - index;
        const offsetDirection = positionFromTop % 2 === 0 ? -1 : 1;
        const newStackOffsetX = positionFromTop * 8 * offsetDirection;
        const newRotation = positionFromTop * 2 * offsetDirection;

        newCard.classList.add('active');
        newCard.style.transform = `translateX(calc(-50% + ${newStackOffsetX}px)) translateY(${newStackOffsetY}px) rotate(${newRotation}deg) scale(0.95)`;

        requestAnimationFrame(() => {
            const newControls = animate(newCard, {
                x: [newStackOffsetX, 0],
                rotate: [newRotation, 0],
                scale: [0.95, 1]
            }, {
                duration: 0.5,
                ease: spring({ stiffness: 300, damping: 25 }),
                onUpdate: (latest) => {
                    newCard.style.transform = `translateX(calc(-50% + ${latest.x}px)) translateY(${newStackOffsetY}px) rotate(${latest.rotate}deg) scale(${latest.scale})`;
                },
                onComplete: () => {
                    updateCardStackPosition();
                }
            });

            trackCardAnimation(newCard, newControls);
        });
    } else {
        updateCardStackPosition();
    }
}

// Reset card position (snap back if not dismissed) - uses spring for natural feel
function resetCardPosition(card, index, currentOffsetX) {
    const { animate, spring } = Motion;
    const stackOffsetY = (state.cards.length - 1 - index) * 14;

    // Cancel any existing animation on this card
    cancelCardAnimation(card);

    const controls = animate(card, {
        x: [currentOffsetX, 0],
        rotate: [currentOffsetX * 0.15, 0]
    }, {
        duration: 0.5,
        ease: spring({ stiffness: 300, damping: 25 }),
        onUpdate: (latest) => {
            card.style.transform = `translateX(calc(-50% + ${latest.x}px)) translateY(${stackOffsetY}px) rotate(${latest.rotate}deg)`;
        },
        onComplete: () => {
            card.style.transform = `translateX(-50%) translateY(${stackOffsetY}px)`;
        }
    });

    trackCardAnimation(card, controls);
}

// Dots removed - navigation is swipe-only


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

// Add button press animations using motion.dev press()
function setupButtonAnimations() {
    const { press, animate } = Motion;

    // Generate button - press() handles mousedown/mouseup/mouseleave automatically
    press(generateBtn, (element) => {
        animate(element, { scale: 0.98 }, { duration: 0.1, ease: "easeIn" });
        // Return cleanup function that runs on release
        return () => animate(element, { scale: 1 }, { duration: 0.2, ease: "easeOut" });
    });

    // Create New Story button
    press(createNewBtn, (element) => {
        animate(element, { scale: 0.98 }, { duration: 0.1, ease: "easeIn" });
        return () => animate(element, { scale: 1 }, { duration: 0.2, ease: "easeOut" });
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

