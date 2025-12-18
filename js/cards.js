// Card rendering and stack management

import { CONFIG } from './config.js';
import { state, setCard, setCurrentCardIndex } from './state.js';
import { setupCardDrag } from './drag.js';
import { playSwipeSound } from './sounds.js';

// DOM element references (set during initialization)
let cardStackElement = null;
let sceneIndicatorElement = null;
let sceneCaptionElement = null;

export function setCardStackElement(element) {
    cardStackElement = element;
}

export function setCaptionElements(indicator, caption) {
    sceneIndicatorElement = indicator;
    sceneCaptionElement = caption;
}

// Update the caption area below cards (and on-card caption)
export function updateCaption() {
    if (!sceneIndicatorElement || !sceneCaptionElement) return;

    const currentCaption = state.captions[state.currentCardIndex];
    sceneIndicatorElement.textContent = `Scene ${state.currentCardIndex + 1} of ${state.cards.length}`;
    sceneCaptionElement.textContent = currentCaption || '';

    // Also update on-card caption if it exists
    const activeCard = state.cards[state.currentCardIndex];
    if (activeCard) {
        const cardCaption = activeCard.querySelector('.card-caption-text');
        if (cardCaption && currentCaption) {
            cardCaption.textContent = currentCaption;
        }
    }
}

// Clear the caption area (used when starting new generation)
export function clearCaptionArea() {
    if (!sceneIndicatorElement || !sceneCaptionElement) return;

    sceneIndicatorElement.textContent = '';
    sceneCaptionElement.textContent = '';
}

// Calculate card stack position values
function getStackPositionValues(index, currentCardIndex) {
    const isActive = index === currentCardIndex;
    let positionFromTop;

    if (index === currentCardIndex) {
        positionFromTop = 0;
    } else if (index < currentCardIndex) {
        positionFromTop = currentCardIndex - index;
    } else {
        positionFromTop = index - currentCardIndex;
    }

    // Alternate left/right for X offset
    const xDirection = positionFromTop % 2 === 0 ? -1 : 1;
    // Alternate up/down for Y offset (odd positions go up, even go down)
    const yDirection = positionFromTop % 2 === 0 ? 1 : -1;

    const stackOffsetX = positionFromTop * CONFIG.CARD_OFFSET_X * xDirection;
    const stackOffsetY = positionFromTop * CONFIG.CARD_OFFSET_Y * yDirection;
    const rotation = positionFromTop * CONFIG.CARD_ROTATION * xDirection;

    return { isActive, positionFromTop, stackOffsetX, stackOffsetY, rotation };
}

// Show loading card for a scene
export function showLoadingCard(index) {
    const card = document.createElement('div');
    card.className = 'story-card w-[85vw] max-w-[340px] sm:max-w-[400px]';
    card.dataset.index = index;
    card.innerHTML = `
        <div class="card-content w-full bg-white rounded-2xl p-3">
            <div class="w-full aspect-square rounded-xl overflow-hidden bg-[#f0f0f0] relative" id="loading-image-${index}">
                <div class="absolute inset-0 flex items-center justify-center">
                    <p class="text-sm text-[#a3a3a3] font-medium">Generating Scene ${index + 1}...</p>
                </div>
            </div>
        </div>
    `;

    // Set initial state before adding to DOM
    card.style.opacity = '0';
    card.style.transform = 'translateX(-50%) translateY(20px) scale(0.95)';

    cardStackElement.appendChild(card);
    setCard(index, card);

    // Position card in stack
    updateCardStackPosition();

    // Get the target position from stack
    const { isActive, positionFromTop, stackOffsetX, stackOffsetY, rotation } = getStackPositionValues(index, state.currentCardIndex);

    // Animate card entrance using Motion API
    const { animate } = Motion;
    animate(card, {
        opacity: [0, 1],
        y: [stackOffsetY + 20, stackOffsetY],
        scale: [0.95, 1]
    }, {
        duration: 0.35,
        ease: "easeOut",
        onUpdate: (latest) => {
            if (isActive) {
                card.style.transform = `translateX(-50%) translateY(${latest.y}px) scale(${latest.scale})`;
            } else {
                card.style.transform = `translateX(calc(-50% + ${stackOffsetX}px)) translateY(${latest.y}px) rotate(${rotation}deg) scale(${latest.scale})`;
            }
        },
        onComplete: () => {
            if (isActive) {
                card.style.transform = `translateX(-50%) translateY(${stackOffsetY}px)`;
            } else {
                card.style.transform = `translateX(calc(-50% + ${stackOffsetX}px)) translateY(${stackOffsetY}px) rotate(${rotation}deg)`;
            }
        }
    });

    // Animate loading pulse
    const loadingImage = document.getElementById(`loading-image-${index}`);
    animate(loadingImage, {
        opacity: [0.5, 1, 0.5]
    }, {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
    });

    // Setup drag for this card
    setupCardDrag(card, index);
}

// Update scene card with image and comic-book style caption overlay
export function updateSceneCard(index, imageData, caption) {
    if (!state.cards[index]) return;

    const card = state.cards[index];
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content w-full bg-white rounded-2xl p-3';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'w-full aspect-square rounded-xl overflow-hidden bg-[#f0f0f0] relative';

    const img = document.createElement('img');
    img.src = imageData;
    img.alt = `Scene ${index + 1}`;
    img.className = 'w-full h-full object-cover';
    img.style.opacity = '0';

    // Create comic-book style caption overlay
    const captionOverlay = document.createElement('div');
    captionOverlay.className = 'card-caption-overlay';

    const captionText = document.createElement('p');
    captionText.className = 'card-caption-text';
    captionText.textContent = caption || '';

    captionOverlay.appendChild(captionText);
    imageContainer.appendChild(img);
    imageContainer.appendChild(captionOverlay);
    cardContent.appendChild(imageContainer);

    card.innerHTML = '';
    card.appendChild(cardContent);

    // Ensure card maintains its classes
    card.className = 'story-card w-[85vw] max-w-[340px] sm:max-w-[400px]';
    card.dataset.index = index;

    // Update stack position
    updateCardStackPosition();

    // Update caption if this is the active card
    if (index === state.currentCardIndex) {
        updateCaption();
    }

    // Note: Don't re-setup drag - the card element is the same,
    // so event listeners from showLoadingCard are still attached

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

// Update card stack positions
export function updateCardStackPosition() {
    state.cards.forEach((card, index) => {
        if (!card) return;

        const { isActive, positionFromTop, stackOffsetX, stackOffsetY, rotation } = getStackPositionValues(index, state.currentCardIndex);
        const zIndex = isActive ? state.cards.length + 10 : state.cards.length - positionFromTop;

        card.style.zIndex = zIndex;
        card.style.display = 'block';

        if (isActive) {
            card.style.transform = `translateX(-50%) translateY(${stackOffsetY}px)`;
            card.classList.add('active');
        } else {
            card.style.transform = `translateX(calc(-50% + ${stackOffsetX}px)) translateY(${stackOffsetY}px) rotate(${rotation}deg)`;
            card.classList.remove('active');
        }
    });
}

// Move current card to back and reveal next/previous (swipe to cycle)
export function dismissCard(currentIndex, nextIndex, direction) {
    if (nextIndex < 0 || nextIndex >= state.cards.length) return;

    // Play swipe sound
    playSwipeSound();

    // Update current index first
    setCurrentCardIndex(nextIndex);

    // Update caption for new active card
    updateCaption();

    // Animate all cards to their new positions using CSS transitions
    state.cards.forEach((card, index) => {
        if (!card) return;

        const { isActive, positionFromTop, stackOffsetX, stackOffsetY, rotation } = getStackPositionValues(index, state.currentCardIndex);
        const zIndex = isActive ? state.cards.length + 10 : state.cards.length - positionFromTop;
        card.style.zIndex = zIndex;

        if (isActive) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }

        // Add transition for smooth animation
        card.style.transition = 'transform 0.3s ease-out';

        // Set final transform
        if (isActive) {
            card.style.transform = `translateX(-50%) translateY(0px)`;
        } else {
            card.style.transform = `translateX(calc(-50% + ${stackOffsetX}px)) translateY(${stackOffsetY}px) rotate(${rotation}deg)`;
        }
    });

    // Remove transitions after animation completes
    setTimeout(() => {
        state.cards.forEach((card) => {
            if (card) card.style.transition = '';
        });
    }, 300);
}

// Flip to a specific card (programmatic navigation)
export function flipToCard(index) {
    if (index < 0 || index >= state.cards.length || index === state.currentCardIndex) return;

    setCurrentCardIndex(index);

    // Use CSS transitions for all cards
    state.cards.forEach((card, cardIndex) => {
        if (!card) return;

        const { isActive, positionFromTop, stackOffsetX, stackOffsetY, rotation } = getStackPositionValues(cardIndex, state.currentCardIndex);
        const zIndex = isActive ? state.cards.length + 10 : state.cards.length - positionFromTop;

        card.style.zIndex = zIndex;
        card.style.transition = 'transform 0.3s ease-out';

        if (isActive) {
            card.classList.add('active');
            card.style.transform = `translateX(-50%) translateY(0px)`;
        } else {
            card.classList.remove('active');
            card.style.transform = `translateX(calc(-50% + ${stackOffsetX}px)) translateY(${stackOffsetY}px) rotate(${rotation}deg)`;
        }
    });

    // Remove transitions after animation completes
    setTimeout(() => {
        state.cards.forEach((card) => {
            if (card) card.style.transition = '';
        });
    }, 300);
}

// Reset card position (snap back if not dismissed)
export function resetCardPosition(card) {
    // Use CSS transition for reliable snap back
    card.style.transition = 'transform 0.3s ease-out';
    card.style.transform = `translateX(-50%) translateY(0px)`;

    // Remove transition after animation completes
    setTimeout(() => {
        card.style.transition = '';
    }, 300);
}

// Clear all cards from the stack
export function clearCardStack() {
    if (cardStackElement) {
        cardStackElement.innerHTML = '';
    }
}
