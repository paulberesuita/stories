// Configuration and constants

// Test mode - set to true to use hardcoded images for UI/UX iteration
export const TEST_MODE = false;

// Test images (Unsplash landscape photos)
export const TEST_IMAGES = [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&h=800&fit=crop'
];

export const TEST_CAPTIONS = [
    'Our hero sets out on an adventure. This opening scene introduces the setting and characters, establishing the world where our story unfolds.',
    'Challenges emerge along the way. Tension builds and propels the narrative forward as obstacles appear.',
    'The moment of truth arrives. The story reaches its peak moment of tension, where the central conflict comes to a dramatic head.',
    'Peace and understanding prevail. The story concludes, bringing closure and showing how the journey transforms the characters and their world.'
];

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
    OPENAI_API_EDIT_URL: 'https://api.openai.com/v1/images/edits',
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

export const SCENE_COUNT = 5;
