// Mouse and touch drag/swipe logic

import { CONFIG } from './config.js';
import { state } from './state.js';

// These will be set by cards.js to avoid circular dependency
let dismissCardFn = null;
let resetCardPositionFn = null;

export function setDragCallbacks(dismissCard, resetCardPosition) {
    dismissCardFn = dismissCard;
    resetCardPositionFn = resetCardPosition;
}

// Setup drag interaction for a card
export function setupCardDrag(card, index) {
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

        // Apply transform - active card is at Y=0, just add drag offset
        const rotation = dragOffsetX * CONFIG.DRAG_ROTATION_FACTOR;
        card.style.transform = `translateX(calc(-50% + ${dragOffsetX}px)) translateY(0px) rotate(${rotation}deg)`;
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        card.classList.remove('dragging');

        const velocity = Math.abs(currentX);

        if (Math.abs(dragOffsetX) > CONFIG.SWIPE_THRESHOLD || velocity > CONFIG.VELOCITY_THRESHOLD) {
            // Dismiss card and reveal next/previous
            if (dragOffsetX < 0 && state.currentCardIndex < state.cards.length - 1) {
                // Swiped left - dismiss current, show next card
                dismissCardFn(state.currentCardIndex, state.currentCardIndex + 1, -1);
            } else if (dragOffsetX > 0 && state.currentCardIndex > 0) {
                // Swiped right - dismiss current, show previous card
                dismissCardFn(state.currentCardIndex, state.currentCardIndex - 1, 1);
            } else {
                // Snap back
                resetCardPositionFn(card, index, dragOffsetX);
            }
        } else {
            // Snap back
            resetCardPositionFn(card, index, dragOffsetX);
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
        if (!e.touches || !e.touches[0]) return;
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        if (!e.touches || !e.touches[0]) return;
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    }, { passive: true });

    card.addEventListener('touchend', () => {
        handleEnd();
    }, { passive: true });

    card.addEventListener('touchcancel', () => {
        handleEnd();
    }, { passive: true });
}
