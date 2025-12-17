// Configuration and constants

export const CONFIG = {
    // Drag/swipe thresholds
    SWIPE_THRESHOLD: 80,
    VELOCITY_THRESHOLD: 3,

    // Card stack positioning
    CARD_OFFSET_Y: 14,
    CARD_OFFSET_X: 8,
    CARD_ROTATION: 2,

    // Animation settings
    SPRING_STIFFNESS: 300,
    SPRING_DAMPING: 25,

    // Drag rotation multiplier
    DRAG_ROTATION_FACTOR: 0.15,

    // API settings
    OPENAI_API_URL: 'https://api.openai.com/v1/images/generations',
    IMAGE_MODEL: 'gpt-image-1.5',
    IMAGE_SIZE: '1024x1024',
    IMAGE_QUALITY: 'medium',

    // Storage keys
    STORAGE_KEY_API: 'openai_key'
};

export const SAMPLE_STORIES = [
    { label: 'Robot painter', prompt: 'A robot learning to paint in Paris' },
    { label: 'Lost astronaut', prompt: 'An astronaut stranded on a beautiful alien planet' },
    { label: 'Tiny dragon', prompt: 'A tiny dragon befriends a lonely child' },
    { label: 'Time traveler', prompt: 'A time traveler accidentally changes history' },
    { label: 'Underwater city', prompt: 'Discovering a hidden city beneath the ocean' }
];

export const SCENE_COUNT = 4;
