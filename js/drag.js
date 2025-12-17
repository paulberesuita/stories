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
export function setupCardDrag(card, cardIndex) {
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let dragOffsetX = 0;

    const handleStart = (clientX) => {
        // Only allow dragging the top card - check using data attribute at drag time
        const thisCardIndex = parseInt(card.dataset.index, 10);
        if (thisCardIndex !== state.currentCardIndex) return;

        isDragging = true;
        startX = clientX;
        currentX = 0;
        dragOffsetX = 0;
        card.style.transition = 'none'; // Disable transitions during drag
        card.classList.add('dragging');
    };

    const handleMove = (clientX) => {
        if (!isDragging) return;

        currentX = clientX - startX;
        dragOffsetX = currentX;

        // Apply transform with rotation
        const rotation = dragOffsetX * CONFIG.DRAG_ROTATION_FACTOR;
        card.style.transform = `translateX(calc(-50% + ${dragOffsetX}px)) translateY(0px) rotate(${rotation}deg)`;
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        card.classList.remove('dragging');

        if (Math.abs(dragOffsetX) > CONFIG.SWIPE_THRESHOLD) {
            // Dismiss card and reveal next/previous (infinite wrap)
            if (dragOffsetX < 0) {
                // Swiped left - show next card (wrap to first if at end)
                const nextIndex = (state.currentCardIndex + 1) % state.cards.length;
                dismissCardFn(state.currentCardIndex, nextIndex, -1);
            } else {
                // Swiped right - show previous card (wrap to last if at start)
                const prevIndex = (state.currentCardIndex - 1 + state.cards.length) % state.cards.length;
                dismissCardFn(state.currentCardIndex, prevIndex, 1);
            }
        } else {
            // Below threshold, snap back
            resetCardPositionFn(card);
        }

        dragOffsetX = 0;
    };

    // Mouse events on card
    card.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handleStart(e.clientX);
    });

    // Global mouse events for dragging
    const onMouseMove = (e) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Touch events on card
    card.addEventListener('touchstart', (e) => {
        if (!e.touches || !e.touches[0]) return;
        handleStart(e.touches[0].clientX);
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
        if (!isDragging || !e.touches || !e.touches[0]) return;
        handleMove(e.touches[0].clientX);
    }, { passive: true });

    card.addEventListener('touchend', handleEnd, { passive: true });
    card.addEventListener('touchcancel', handleEnd, { passive: true });
}
