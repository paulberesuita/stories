'use strict';

// Main entry point - initialization and event handling

import { CONFIG, SAMPLE_STORIES, SCENE_COUNT, TEST_MODE, TEST_IMAGES, TEST_CAPTIONS } from './config.js';
import {
    state,
    setApiKey,
    setRunwayKey,
    resetGenerationState,
    setGenerating,
    setGeneratingVideo,
    setCurrentScene,
    setImage,
    setCaption,
    setVideo,
    setCurrentCardIndex,
    setError,
    clearError as clearStateError,
    clearCards,
    addReferenceImage,
    removeReferenceImage,
    clearReferenceImages
} from './state.js';
import { generateScenePrompts, generateSceneCaptions, generateImage, combineImages } from './api.js';
import { generateAllSceneVideos, concatenateVideos } from './video.js';
import { animateSectionTransition, setupButtonAnimations, animateEntrance } from './animations.js';
import {
    setCardStackElement,
    setCaptionElements,
    showLoadingCard,
    updateSceneCard,
    updateCardStackPosition,
    updateCaption,
    clearCaptionArea,
    dismissCard,
    resetCardPosition,
    clearCardStack
} from './cards.js';
import { setDragCallbacks } from './drag.js';

// DOM Elements
let apiKeyInput;
let storyPromptInput;
let generateBtn;
let errorMessage;
let inputSection;
let outputSection;
let cardStack;
let createNewBtn;
let saveStoryBtn;
let sampleStoriesContainer;
let sceneIndicator;
let sceneCaption;

// Navigation elements
let navCreate;
let navMyStories;
let navSettings;
let topNav;

// Section elements
let myStoriesSection;
let settingsSection;
let storiesGrid;
let storiesLoading;
let storiesEmpty;
let apiKeySettings;

// Photo upload elements
let referencePhotoInput1;
let referencePhotoInput2;
let uploadPhotoBtn;
let photoPreview1;
let photoPreview2;
let photoImg1;
let photoImg2;
let removePhotoBtn1;
let removePhotoBtn2;
let characterLabel;

// View toggle elements
let viewToggle;
let viewCardsBtn;
let viewComicBtn;
let cardView;
let comicView;
let comicStrip;

// Video elements
let makeVideoBtn;
let videoView;
let storyVideo;
let videoProgress;
let videoProgressText;
let videoProgressScene;
let runwayKeySettings;

// Track current story prompt for saving
let currentStoryPrompt = '';

// Track if viewing a saved story (don't show save button)
let isViewingSavedStory = false;

// Initialize DOM references
function initDomReferences() {
    apiKeyInput = document.getElementById('api-key-settings');
    storyPromptInput = document.getElementById('story-prompt');
    generateBtn = document.getElementById('generate-btn');
    errorMessage = document.getElementById('error-message');
    inputSection = document.getElementById('input-section');
    outputSection = document.getElementById('output-section');
    cardStack = document.getElementById('card-stack');
    createNewBtn = document.getElementById('create-new-btn');
    saveStoryBtn = document.getElementById('save-story-btn');
    sampleStoriesContainer = document.getElementById('sample-stories');
    sceneIndicator = document.getElementById('scene-indicator');
    sceneCaption = document.getElementById('scene-caption');

    // Navigation elements
    navCreate = document.getElementById('nav-create');
    navMyStories = document.getElementById('nav-my-stories');
    navSettings = document.getElementById('nav-settings');
    topNav = document.getElementById('top-nav');

    // Section elements
    myStoriesSection = document.getElementById('my-stories-section');
    settingsSection = document.getElementById('settings-section');
    storiesGrid = document.getElementById('stories-grid');
    storiesLoading = document.getElementById('stories-loading');
    storiesEmpty = document.getElementById('stories-empty');
    apiKeySettings = document.getElementById('api-key-settings');

    // Photo upload elements
    referencePhotoInput1 = document.getElementById('reference-photo-input-1');
    referencePhotoInput2 = document.getElementById('reference-photo-input-2');
    uploadPhotoBtn = document.getElementById('upload-photo-btn');
    photoPreview1 = document.getElementById('photo-preview-1');
    photoPreview2 = document.getElementById('photo-preview-2');
    photoImg1 = document.getElementById('photo-img-1');
    photoImg2 = document.getElementById('photo-img-2');
    removePhotoBtn1 = document.getElementById('remove-photo-1');
    removePhotoBtn2 = document.getElementById('remove-photo-2');
    characterLabel = document.getElementById('character-label');

    // View toggle elements
    viewToggle = document.getElementById('view-toggle');
    viewCardsBtn = document.getElementById('view-cards');
    viewComicBtn = document.getElementById('view-comic');
    cardView = document.getElementById('card-view');
    comicView = document.getElementById('comic-view');
    comicStrip = document.getElementById('comic-strip');

    // Video elements
    makeVideoBtn = document.getElementById('make-video-btn');
    videoView = document.getElementById('video-view');
    storyVideo = document.getElementById('story-video');
    videoProgress = document.getElementById('video-progress');
    videoProgressText = document.getElementById('video-progress-text');
    videoProgressScene = document.getElementById('video-progress-scene');
    runwayKeySettings = document.getElementById('runway-key-settings');

    // Set card stack element for cards module
    setCardStackElement(cardStack);

    // Set caption elements for cards module
    setCaptionElements(sceneIndicator, sceneCaption);

    // Set drag callbacks to avoid circular dependency
    setDragCallbacks(dismissCard, resetCardPosition);
}

// Initialize
function init() {
    initDomReferences();

    // Load API keys from localStorage
    if (state.apiKey && apiKeySettings) {
        apiKeySettings.value = state.apiKey;
    }
    if (state.runwayKey && runwayKeySettings) {
        runwayKeySettings.value = state.runwayKey;
    }

    // Event listeners
    if (apiKeySettings) {
        apiKeySettings.addEventListener('input', handleApiKeyChange);
    }
    if (runwayKeySettings) {
        runwayKeySettings.addEventListener('input', handleRunwayKeyChange);
    }
    generateBtn.addEventListener('click', handleGenerate);
    makeVideoBtn.addEventListener('click', handleMakeVideo);
    createNewBtn.addEventListener('click', handleCreateNew);
    saveStoryBtn.addEventListener('click', handleSaveStory);
    storyPromptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleGenerate();
        }
    });

    // Navigation event listeners
    navCreate.addEventListener('click', () => switchTab('create'));
    navMyStories.addEventListener('click', () => switchTab('my-stories'));
    navSettings.addEventListener('click', () => switchTab('settings'));

    // Photo upload event listeners
    uploadPhotoBtn.addEventListener('click', handleUploadClick);
    referencePhotoInput1.addEventListener('change', (e) => handlePhotoUpload(e, 0));
    referencePhotoInput2.addEventListener('change', (e) => handlePhotoUpload(e, 1));
    removePhotoBtn1.addEventListener('click', () => handleRemovePhoto(0));
    removePhotoBtn2.addEventListener('click', () => handleRemovePhoto(1));

    // View toggle event listeners
    viewCardsBtn.addEventListener('click', () => switchView('cards'));
    viewComicBtn.addEventListener('click', () => switchView('comic'));

    // Setup sample story pills
    setupSampleStories();

    // Setup button animations
    setupButtonAnimations(generateBtn, createNewBtn, saveStoryBtn);
}

// Switch between tabs
function switchTab(tab) {
    // Update nav active state
    navCreate.classList.remove('active');
    navMyStories.classList.remove('active');
    navSettings.classList.remove('active');

    // Hide all sections
    inputSection.classList.add('hidden');
    outputSection.classList.add('hidden');
    myStoriesSection.classList.add('hidden');
    settingsSection.classList.add('hidden');

    // Get main container for alignment adjustment
    const mainContainer = document.getElementById('main-container');

    // Show the selected section
    switch (tab) {
        case 'create':
            navCreate.classList.add('active');
            inputSection.classList.remove('hidden');
            mainContainer.classList.remove('align-top');
            break;
        case 'my-stories':
            navMyStories.classList.add('active');
            myStoriesSection.classList.remove('hidden');
            mainContainer.classList.add('align-top');
            loadSavedStories();
            break;
        case 'settings':
            navSettings.classList.add('active');
            settingsSection.classList.remove('hidden');
            mainContainer.classList.remove('align-top');
            break;
    }
}

// Switch between card and comic views
function switchView(view) {
    if (view === 'cards') {
        viewCardsBtn.classList.add('active');
        viewComicBtn.classList.remove('active');
        cardView.classList.remove('hidden');
        comicView.classList.add('hidden');
    } else if (view === 'comic') {
        viewComicBtn.classList.add('active');
        viewCardsBtn.classList.remove('active');
        comicView.classList.remove('hidden');
        cardView.classList.add('hidden');
    }
}

// Populate comic strip with images and captions
function populateComicStrip() {
    comicStrip.innerHTML = '';

    for (let i = 0; i < SCENE_COUNT; i++) {
        const panel = document.createElement('div');
        panel.className = `comic-panel comic-panel-${i + 1}`;

        const img = document.createElement('img');
        img.src = state.images[i] || '';
        img.alt = `Scene ${i + 1}`;

        panel.appendChild(img);

        // Add caption
        if (state.captions[i]) {
            const caption = document.createElement('div');
            caption.className = 'comic-caption';

            const captionText = document.createElement('p');
            captionText.className = 'comic-caption-text';
            // Truncate caption for comic panels (shorter format)
            const truncatedCaption = state.captions[i].length > 80
                ? state.captions[i].substring(0, 80) + '...'
                : state.captions[i];
            captionText.textContent = truncatedCaption;

            caption.appendChild(captionText);
            panel.appendChild(caption);
        }

        comicStrip.appendChild(panel);
    }
}

// Load saved stories from API
async function loadSavedStories() {
    storiesGrid.innerHTML = '';
    storiesLoading.classList.remove('hidden');
    storiesEmpty.classList.add('hidden');

    try {
        const response = await fetch('/api/stories');
        if (!response.ok) {
            throw new Error('Failed to load stories');
        }

        const data = await response.json();
        const stories = data.stories || [];

        storiesLoading.classList.add('hidden');

        if (stories.length === 0) {
            storiesEmpty.classList.remove('hidden');
            return;
        }

        // Render story cards
        stories.forEach(story => {
            const card = createStoryGridCard(story);
            storiesGrid.appendChild(card);
        });

    } catch (error) {
        storiesLoading.classList.add('hidden');
        storiesEmpty.classList.remove('hidden');
        storiesEmpty.querySelector('p').textContent = 'Failed to load stories.';
    }
}

// Create a story card for the grid with stacked card preview
function createStoryGridCard(story) {
    const card = document.createElement('div');
    card.className = 'story-grid-card';
    card.dataset.storyId = story.id;

    // Create stacked cards preview
    const stackPreview = document.createElement('div');
    stackPreview.className = 'stack-preview';

    // Add stacked images (reverse order so scene 1 is on top, show first 4 for visual)
    const maxStackedImages = Math.min(4, SCENE_COUNT);
    for (let i = maxStackedImages; i >= 1; i--) {
        const stackedImg = document.createElement('div');
        stackedImg.className = `stacked-img stacked-img-${i}`;

        const img = document.createElement('img');
        img.src = `/api/images/${story.id}/scene-${i}.png`;
        img.alt = `Scene ${i}`;
        img.loading = 'lazy';

        stackedImg.appendChild(img);
        stackPreview.appendChild(stackedImg);
    }

    // Create story info section
    const storyInfo = document.createElement('div');
    storyInfo.className = 'story-info';

    const promptText = document.createElement('div');
    promptText.className = 'story-prompt';
    promptText.textContent = story.prompt;

    const dateText = document.createElement('div');
    dateText.className = 'story-date';
    const date = new Date(story.created_at);
    dateText.textContent = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });

    storyInfo.appendChild(promptText);
    storyInfo.appendChild(dateText);

    card.appendChild(stackPreview);
    card.appendChild(storyInfo);

    // Click to view story
    card.addEventListener('click', () => loadStoryIntoViewer(story.id));

    return card;
}

// Load a saved story into the card stack viewer
async function loadStoryIntoViewer(storyId) {
    try {
        const response = await fetch(`/api/stories?id=${storyId}`);
        if (!response.ok) {
            throw new Error('Failed to load story');
        }

        const data = await response.json();
        const { story, scenes } = data;

        // Mark as viewing saved story
        isViewingSavedStory = true;
        currentStoryPrompt = story.prompt;

        // Reset state
        resetGenerationState();
        clearCardStack();

        // Hide My Stories section, show output section
        myStoriesSection.classList.add('hidden');
        outputSection.classList.remove('hidden');

        // Update nav to show we're viewing (not in any tab really)
        navCreate.classList.remove('active');
        navMyStories.classList.remove('active');
        navSettings.classList.remove('active');

        // Create cards for each scene
        scenes.forEach((scene, index) => {
            const imageUrl = scene.image_url || `/api/images/${scene.image_key}`;
            setImage(index, imageUrl);
            setCaption(index, scene.caption);
        });

        // Show loading cards first, then update with images
        for (let i = 0; i < scenes.length; i++) {
            showLoadingCard(i);
        }

        // Set first card as active
        setCurrentCardIndex(0);
        updateCardStackPosition();

        // Update cards with actual images
        scenes.forEach((scene, index) => {
            const imageUrl = scene.image_url || `/api/images/${scene.image_key}`;
            updateSceneCard(index, imageUrl, scene.caption);
        });

        // Update caption
        updateCaption();

        // Populate comic strip and show view toggle
        populateComicStrip();
        viewToggle.classList.remove('hidden');
        switchView('cards');

        // Show Make Video and Create New buttons (not save, since it's already saved)
        animateEntrance(makeVideoBtn);
        animateEntrance(createNewBtn);
        saveStoryBtn.classList.add('hidden');

    } catch (error) {
        showError('Failed to load story. Please try again.');
    }
}

// Setup sample story pills
function setupSampleStories() {
    SAMPLE_STORIES.forEach(story => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'px-4 py-2 text-sm font-medium text-[#525252] bg-white border border-[#e5e5e5] hover:border-[#a3a3a3] hover:text-[#171717] rounded-full transition-colors cursor-pointer';
        pill.textContent = story.label;
        pill.addEventListener('click', () => {
            storyPromptInput.value = story.prompt;
            storyPromptInput.focus();
        });
        sampleStoriesContainer.appendChild(pill);
    });
}

// Handle API key input change
function handleApiKeyChange(e) {
    const key = e.target.value.trim();
    setApiKey(key);
}

// Handle Runway API key input change
function handleRunwayKeyChange(e) {
    const key = e.target.value.trim();
    setRunwayKey(key);
}

// Handle upload button click - trigger the appropriate file input
function handleUploadClick() {
    const count = state.referenceImages.length;
    if (count === 0) {
        referencePhotoInput1.click();
    } else if (count === 1) {
        referencePhotoInput2.click();
    }
}

// Update the UI to reflect current photo state
function updatePhotoUI() {
    const count = state.referenceImages.length;

    // Show/hide upload button based on count
    if (count >= 2) {
        uploadPhotoBtn.classList.add('hidden');
    } else {
        uploadPhotoBtn.classList.remove('hidden');
    }

    // Update photo 1 preview
    if (count >= 1) {
        photoImg1.src = state.referenceImages[0];
        photoPreview1.classList.remove('hidden');
    } else {
        photoPreview1.classList.add('hidden');
        photoImg1.src = '';
    }

    // Update photo 2 preview
    if (count >= 2) {
        photoImg2.src = state.referenceImages[1];
        photoPreview2.classList.remove('hidden');
    } else {
        photoPreview2.classList.add('hidden');
        photoImg2.src = '';
    }

    // Update character label
    if (count === 1) {
        characterLabel.textContent = '1 character';
        characterLabel.classList.remove('hidden');
    } else if (count === 2) {
        characterLabel.textContent = '2 characters';
        characterLabel.classList.remove('hidden');
    } else {
        characterLabel.classList.add('hidden');
    }
}

// Handle photo upload
function handlePhotoUpload(e, index) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showError('Please upload an image file');
        return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('Image must be less than 10MB');
        return;
    }

    // Read and store the image
    const reader = new FileReader();
    reader.onload = (event) => {
        const imageData = event.target.result;
        addReferenceImage(imageData);
        updatePhotoUI();
    };
    reader.onerror = () => {
        showError('Failed to read image file');
    };
    reader.readAsDataURL(file);
}

// Handle remove photo
function handleRemovePhoto(index) {
    removeReferenceImage(index);
    // Clear file inputs
    referencePhotoInput1.value = '';
    referencePhotoInput2.value = '';
    updatePhotoUI();
}

// Handle generate button click
async function handleGenerate() {
    // Clear previous error
    clearError();

    // In test mode, skip API key validation
    if (!TEST_MODE && !state.apiKey) {
        showError('Please enter your OpenAI API key in Settings');
        return;
    }

    const userPrompt = storyPromptInput.value.trim();
    if (!userPrompt) {
        showError('Please enter a story idea');
        return;
    }

    // Mark as new story (not viewing saved)
    isViewingSavedStory = false;

    // Hide input section, show output section
    inputSection.classList.add('hidden');
    outputSection.classList.remove('hidden');

    // Hide nav during generation
    topNav.classList.add('hidden');

    // Store prompt for saving later
    currentStoryPrompt = userPrompt;

    // Reset state
    resetGenerationState();

    // Clear previous cards and caption area
    clearCardStack();
    clearCaptionArea();
    createNewBtn.classList.add('hidden');
    saveStoryBtn.classList.add('hidden');

    // Check if we have reference images
    const referenceImageCount = state.referenceImages.length;

    // Generate scene prompts and captions
    const scenePrompts = generateScenePrompts(userPrompt, referenceImageCount);
    const sceneCaptions = generateSceneCaptions(userPrompt);

    // Show all loading cards at once in stack
    for (let i = 0; i < SCENE_COUNT; i++) {
        showLoadingCard(i);
    }

    // Set first card as active initially
    setCurrentCardIndex(0);
    updateCardStackPosition();

    // TEST MODE: Use hardcoded images instead of API
    if (TEST_MODE) {
        // Simulate a small delay for realistic feel
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update each card with test images
        for (let i = 0; i < SCENE_COUNT; i++) {
            setImage(i, TEST_IMAGES[i]);
            setCaption(i, TEST_CAPTIONS[i]);
            updateSceneCard(i, TEST_IMAGES[i], TEST_CAPTIONS[i]);
        }

        // Update caption for first card
        updateCaption();

        // Populate comic strip and show view toggle
        populateComicStrip();
        viewToggle.classList.remove('hidden');
        switchView('cards');

        // Show buttons and nav
        topNav.classList.remove('hidden');
        animateEntrance(makeVideoBtn);
        animateEntrance(createNewBtn);
        animateEntrance(saveStoryBtn);
        setGenerating(false);
        setCurrentScene(0);
        return;
    }

    // PRODUCTION MODE: Generate all images in parallel via API
    try {
        // Combine reference images if we have any
        let combinedReferenceImage = null;
        if (state.referenceImages.length > 0) {
            combinedReferenceImage = await combineImages(state.referenceImages);
        }

        const imagePromises = scenePrompts.map((prompt, index) =>
            generateImage(prompt, combinedReferenceImage).then(imageData => ({
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
                setImage(index, imageData);
                setCaption(index, caption);
                updateSceneCard(index, imageData, caption);
            } else {
                throw new Error(`Failed to generate scene ${index + 1}`);
            }
        });

        // Update caption for first card
        updateCaption();

        // Populate comic strip and show view toggle
        populateComicStrip();
        viewToggle.classList.remove('hidden');
        switchView('cards');

        // All scenes complete - show buttons and nav with animation
        topNav.classList.remove('hidden');
        animateEntrance(makeVideoBtn);
        animateEntrance(createNewBtn);
        animateEntrance(saveStoryBtn);
    } catch (error) {
        showError(error.message || 'Failed to generate story. Please try again.');
        // Show input section again on error
        outputSection.classList.add('hidden');
        inputSection.classList.remove('hidden');
        topNav.classList.remove('hidden');
    } finally {
        setGenerating(false);
        setCurrentScene(0);
    }
}

// Handle "Create New Story" button click
function handleCreateNew() {
    // Clear story prompt (keep API key)
    storyPromptInput.value = '';
    currentStoryPrompt = '';
    isViewingSavedStory = false;

    // Show input section, hide output
    outputSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    topNav.classList.remove('hidden');

    // Set Create tab as active
    navCreate.classList.add('active');
    navMyStories.classList.remove('active');
    navSettings.classList.remove('active');

    // Clear card stack and hide view toggle
    clearCardStack();
    clearCards();
    viewToggle.classList.add('hidden');
    comicStrip.innerHTML = '';

    // Hide video elements
    videoView.classList.add('hidden');
    videoProgress.classList.add('hidden');
    makeVideoBtn.classList.add('hidden');
    storyVideo.src = '';

    // Focus on prompt input
    storyPromptInput.focus();
}

// Handle "Save Story" button click
async function handleSaveStory() {
    if (!currentStoryPrompt || state.images.some(img => !img)) {
        showError('Story is not complete. Please wait for all scenes to generate.');
        return;
    }

    // Update button state to show saving
    const originalText = saveStoryBtn.querySelector('span').textContent;
    saveStoryBtn.querySelector('span').textContent = 'Saving...';
    saveStoryBtn.disabled = true;

    try {
        // Prepare scenes data
        const scenes = state.images.map((imageData, index) => ({
            imageData: imageData,
            caption: state.captions[index] || ''
        }));

        // Send to API
        const response = await fetch('/api/stories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: currentStoryPrompt,
                scenes: scenes
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to save story');
        }

        const result = await response.json();

        // Show success - update button text temporarily
        saveStoryBtn.querySelector('span').textContent = 'Saved!';
        saveStoryBtn.classList.remove('border-[#e5e5e5]');
        saveStoryBtn.classList.add('border-green-500', 'text-green-600');

        // Mark as viewing saved story so button hides after reset
        isViewingSavedStory = true;

        // Reset button after delay
        setTimeout(() => {
            saveStoryBtn.querySelector('span').textContent = originalText;
            saveStoryBtn.classList.remove('border-green-500', 'text-green-600');
            saveStoryBtn.classList.add('border-[#e5e5e5]');
            saveStoryBtn.disabled = false;
            // Hide save button since story is now saved
            saveStoryBtn.classList.add('hidden');
        }, 2000);

    } catch (error) {
        showError(error.message || 'Failed to save story. Please try again.');
        saveStoryBtn.querySelector('span').textContent = originalText;
        saveStoryBtn.disabled = false;
    }
}

// Handle "Make Video" button click
async function handleMakeVideo() {
    // Check for Runway API key
    if (!state.runwayKey) {
        showError('Please add your Runway API key in Settings to generate videos.');
        return;
    }

    // Check that all images exist
    if (state.images.some(img => !img)) {
        showError('Story images are not complete. Please wait for all scenes to generate.');
        return;
    }

    // Hide other views, show progress
    cardView.classList.add('hidden');
    comicView.classList.add('hidden');
    videoView.classList.add('hidden');
    viewToggle.classList.add('hidden');
    videoProgress.classList.remove('hidden');
    makeVideoBtn.classList.add('hidden');
    saveStoryBtn.classList.add('hidden');
    createNewBtn.classList.add('hidden');

    setGeneratingVideo(true);

    try {
        // Generate videos for all scenes
        const videos = await generateAllSceneVideos(
            state.images,
            state.captions,
            (sceneIndex, status, progress, error) => {
                // Update progress UI
                if (status === 'starting' || status === 'PENDING' || status === 'RUNNING') {
                    videoProgressText.textContent = `Generating video for scene ${sceneIndex + 1}...`;
                    videoProgressScene.textContent = `Scene ${sceneIndex + 1} of ${SCENE_COUNT}`;
                } else if (status === 'completed') {
                    videoProgressText.textContent = `Scene ${sceneIndex + 1} complete!`;
                }

                // Store video URL
                if (status === 'completed' && videos && videos[sceneIndex]) {
                    setVideo(sceneIndex, videos[sceneIndex]);
                }
            }
        );

        // Store all videos in state
        videos.forEach((url, index) => {
            if (url) setVideo(index, url);
        });

        // For MVP, use the first video (or implement concatenation later)
        const finalVideoUrl = await concatenateVideos(videos);

        // Hide progress, show video
        videoProgress.classList.add('hidden');
        videoView.classList.remove('hidden');
        storyVideo.src = finalVideoUrl;
        storyVideo.load();

        // Show buttons
        animateEntrance(createNewBtn);

    } catch (error) {
        showError(error.message || 'Failed to generate video. Please try again.');
        // Restore views
        videoProgress.classList.add('hidden');
        cardView.classList.remove('hidden');
        viewToggle.classList.remove('hidden');
        animateEntrance(makeVideoBtn);
        animateEntrance(createNewBtn);
        if (!isViewingSavedStory) {
            animateEntrance(saveStoryBtn);
        }
    } finally {
        setGeneratingVideo(false);
    }
}

// Show error message
function showError(message) {
    setError(message);
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// Clear error message
function clearError() {
    clearStateError();
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
