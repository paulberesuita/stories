// Animation utilities and control management

import { CONFIG } from './config.js';

// Animation control management - prevents conflicting animations
const cardAnimations = new WeakMap();

export function cancelCardAnimation(card) {
    const controls = cardAnimations.get(card);
    if (controls && controls.stop) {
        controls.stop();
    }
}

export function trackCardAnimation(card, controls) {
    cancelCardAnimation(card);
    cardAnimations.set(card, controls);
}

// Get spring configuration
export function getSpringConfig() {
    return {
        stiffness: CONFIG.SPRING_STIFFNESS,
        damping: CONFIG.SPRING_DAMPING
    };
}

// Animate section transitions
export function animateSectionTransition(hideSection, showSection) {
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

// Setup button press animations using motion.dev press()
export function setupButtonAnimations(generateBtn, createNewBtn) {
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

// Animate element entrance (fade in and slide up)
export function animateEntrance(element, delay = 0) {
    const { animate } = Motion;

    element.classList.remove('hidden');
    element.style.opacity = '0';
    element.style.transform = 'translateY(10px)';

    requestAnimationFrame(() => {
        animate(element, {
            opacity: [0, 1],
            y: [10, 0]
        }, {
            duration: 0.3,
            ease: "easeOut",
            delay
        });
    });
}
