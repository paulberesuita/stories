// Card rendering and stack management

import { CONFIG } from './config.js';
import { state, setCard, setCurrentCardIndex } from './state.js';
import { cancelCardAnimation, trackCardAnimation, getSpringConfig } from './animations.js';
import { setupCardDrag } from './drag.js';

// DOM element reference (set during initialization)
let cardStackElement = null;

export function setCardStackElement(element) {
    cardStackElement = element;
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

    const offsetDirection = positionFromTop % 2 === 0 ? -1 : 1;
    const stackOffsetY = positionFromTop * CONFIG.CARD_OFFSET_Y;
    const stackOffsetX = positionFromTop * CONFIG.CARD_OFFSET_X * offsetDirection;
    const rotation = positionFromTop * CONFIG.CARD_ROTATION * offsetDirection;

    return { isActive, positionFromTop, stackOffsetX, stackOffsetY, rotation };
}

// Show loading card for a scene
export function showLoadingCard(index) {
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
export function updateSceneCard(index, imageData, caption) {
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

    const { animate, spring } = Motion;
    const springConfig = getSpringConfig();

    // Update current index first
    setCurrentCardIndex(nextIndex);

    // Animate all cards to their new positions
    state.cards.forEach((card, index) => {
        if (!card) return;

        cancelCardAnimation(card);

        const { isActive, positionFromTop, stackOffsetX, stackOffsetY, rotation } = getStackPositionValues(index, state.currentCardIndex);
        const zIndex = isActive ? state.cards.length + 10 : state.cards.length - positionFromTop;
        card.style.zIndex = zIndex;

        // Get current transform values by parsing
        const currentTransform = card.style.transform || '';
        let currentX = 0, currentY = 0, currentRotate = 0;

        const xMatch = currentTransform.match(/translateX\([^)]*([-\d.]+)px/);
        const yMatch = currentTransform.match(/translateY\(([-\d.]+)px/);
        const rMatch = currentTransform.match(/rotate\(([-\d.]+)deg/);

        if (xMatch) currentX = parseFloat(xMatch[1]) || 0;
        if (yMatch) currentY = parseFloat(yMatch[1]) || 0;
        if (rMatch) currentRotate = parseFloat(rMatch[1]) || 0;

        const targetX = isActive ? 0 : stackOffsetX;
        const targetY = isActive ? 0 : stackOffsetY;
        const targetRotate = isActive ? 0 : rotation;

        if (isActive) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }

        const controls = animate(card, {
            x: [currentX, targetX],
            y: [currentY, targetY],
            rotate: [currentRotate, targetRotate]
        }, {
            duration: 0.5,
            ease: spring(springConfig),
            onUpdate: (latest) => {
                card.style.transform = `translateX(calc(-50% + ${latest.x}px)) translateY(${latest.y}px) rotate(${latest.rotate}deg)`;
            },
            onComplete: () => {
                if (isActive) {
                    card.style.transform = `translateX(-50%) translateY(0px)`;
                } else {
                    card.style.transform = `translateX(calc(-50% + ${targetX}px)) translateY(${targetY}px) rotate(${targetRotate}deg)`;
                }
            }
        });

        trackCardAnimation(card, controls);
    });
}

// Flip to a specific card (programmatic navigation)
export function flipToCard(index) {
    if (index < 0 || index >= state.cards.length || index === state.currentCardIndex) return;

    const { animate, spring } = Motion;
    const springConfig = getSpringConfig();
    const oldIndex = state.currentCardIndex;

    setCurrentCardIndex(index);

    // Animate old card to back
    const oldCard = state.cards[oldIndex];
    if (oldCard) {
        cancelCardAnimation(oldCard);

        const { positionFromTop, stackOffsetX, stackOffsetY, rotation } = getStackPositionValues(oldIndex, state.currentCardIndex);

        oldCard.classList.remove('active');
        oldCard.style.zIndex = state.cards.length - positionFromTop;

        const oldControls = animate(oldCard, {
            x: [0, stackOffsetX],
            y: [0, stackOffsetY],
            rotate: [0, rotation]
        }, {
            duration: 0.4,
            ease: spring(springConfig),
            onUpdate: (latest) => {
                oldCard.style.transform = `translateX(calc(-50% + ${latest.x}px)) translateY(${latest.y}px) rotate(${latest.rotate}deg)`;
            },
            onComplete: () => {
                oldCard.style.transform = `translateX(calc(-50% + ${stackOffsetX}px)) translateY(${stackOffsetY}px) rotate(${rotation}deg)`;
            }
        });

        trackCardAnimation(oldCard, oldControls);
    }

    // Bring new card to front
    const newCard = state.cards[index];
    if (newCard) {
        cancelCardAnimation(newCard);

        const currentTransform = newCard.style.transform || '';
        let currentX = 0, currentY = 0, currentRotate = 0;
        const xMatch = currentTransform.match(/translateX\([^)]*([-\d.]+)px/);
        const yMatch = currentTransform.match(/translateY\(([-\d.]+)px/);
        const rMatch = currentTransform.match(/rotate\(([-\d.]+)deg/);
        if (xMatch) currentX = parseFloat(xMatch[1]) || 0;
        if (yMatch) currentY = parseFloat(yMatch[1]) || 0;
        if (rMatch) currentRotate = parseFloat(rMatch[1]) || 0;

        newCard.classList.add('active');
        newCard.style.zIndex = state.cards.length + 10;

        const newControls = animate(newCard, {
            x: [currentX, 0],
            y: [currentY, 0],
            rotate: [currentRotate, 0]
        }, {
            duration: 0.5,
            ease: spring(springConfig),
            onUpdate: (latest) => {
                newCard.style.transform = `translateX(calc(-50% + ${latest.x}px)) translateY(${latest.y}px) rotate(${latest.rotate}deg)`;
            },
            onComplete: () => {
                newCard.style.transform = `translateX(-50%) translateY(0px)`;
            }
        });

        trackCardAnimation(newCard, newControls);
    }
}

// Reset card position (snap back if not dismissed)
export function resetCardPosition(card, index, currentOffsetX) {
    const { animate, spring } = Motion;
    const springConfig = getSpringConfig();

    cancelCardAnimation(card);

    const controls = animate(card, {
        x: [currentOffsetX, 0],
        rotate: [currentOffsetX * CONFIG.DRAG_ROTATION_FACTOR, 0]
    }, {
        duration: 0.5,
        ease: spring(springConfig),
        onUpdate: (latest) => {
            card.style.transform = `translateX(calc(-50% + ${latest.x}px)) translateY(0px) rotate(${latest.rotate}deg)`;
        },
        onComplete: () => {
            card.style.transform = `translateX(-50%) translateY(0px)`;
        }
    });

    trackCardAnimation(card, controls);
}

// Clear all cards from the stack
export function clearCardStack() {
    if (cardStackElement) {
        cardStackElement.innerHTML = '';
    }
}
