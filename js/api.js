// OpenAI API integration and prompt generation

import { CONFIG } from './config.js';
import { state } from './state.js';

// Art style prefix for all image generations
const ART_STYLE = 'In the style of a Disney Pixar animated movie, colorful and whimsical 3D cartoon style with expressive characters and vibrant lighting.';

// Reference image instruction (when a photo is uploaded)
const REFERENCE_INSTRUCTION_SINGLE = 'Use the person in the reference photo as the main character. Transform them into the Disney Pixar cartoon style while maintaining their likeness, features, and characteristics.';
const REFERENCE_INSTRUCTION_DUAL = 'Use both people shown in the reference photo as the main characters. Transform them into the Disney Pixar cartoon style while maintaining their likenesses, features, and characteristics. Both characters should appear together in each scene.';

// Generate scene prompts from user prompt
export function generateScenePrompts(userPrompt, referenceImageCount = 0) {
    let referencePrefix = '';
    if (referenceImageCount === 1) {
        referencePrefix = `${REFERENCE_INSTRUCTION_SINGLE} `;
    } else if (referenceImageCount >= 2) {
        referencePrefix = `${REFERENCE_INSTRUCTION_DUAL} `;
    }

    return [
        `${ART_STYLE} ${referencePrefix}Scene 1 of 5 - The beginning: ${userPrompt}. Show the opening scene that introduces the setting and characters.`,
        `${ART_STYLE} ${referencePrefix}Scene 2 of 5 - Rising action: ${userPrompt}. Show a development or challenge emerging.`,
        `${ART_STYLE} ${referencePrefix}Scene 3 of 5 - Climax: ${userPrompt}. Show the peak moment of tension or action.`,
        `${ART_STYLE} ${referencePrefix}Scene 4 of 5 - Falling action: ${userPrompt}. Show the aftermath and consequences of the climax.`,
        `${ART_STYLE} ${referencePrefix}Scene 5 of 5 - Resolution: ${userPrompt}. Show how the story concludes with a satisfying ending.`
    ];
}

// Generate scene captions from user prompt - tells a cohesive story
export function generateSceneCaptions(userPrompt) {
    // Create story-driven captions that flow as a narrative
    return [
        `Once upon a time, a new adventure began: ${userPrompt}. Little did they know what excitement awaited them...`,
        `But then, something unexpected happened! A challenge appeared that would test their courage and determination.`,
        `The moment of truth arrived. With hearts pounding, they faced their greatest challenge head-on!`,
        `Against all odds, they pushed through! The tide began to turn in their favor...`,
        `And so, the adventure came to a wonderful end. They had grown, learned, and made memories that would last forever. The end.`
    ];
}

// Combine multiple images side by side into a single image
export async function combineImages(imageDataURLs) {
    if (imageDataURLs.length === 0) return null;
    if (imageDataURLs.length === 1) return imageDataURLs[0];

    return new Promise((resolve, reject) => {
        const images = [];
        let loadedCount = 0;

        imageDataURLs.forEach((dataURL, index) => {
            const img = new Image();
            img.onload = () => {
                images[index] = img;
                loadedCount++;
                if (loadedCount === imageDataURLs.length) {
                    // All images loaded, combine them
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Calculate combined dimensions (side by side)
                    const totalWidth = images.reduce((sum, img) => sum + img.width, 0);
                    const maxHeight = Math.max(...images.map(img => img.height));

                    canvas.width = totalWidth;
                    canvas.height = maxHeight;

                    // Draw images side by side
                    let xOffset = 0;
                    images.forEach(img => {
                        // Center vertically if heights differ
                        const yOffset = (maxHeight - img.height) / 2;
                        ctx.drawImage(img, xOffset, yOffset);
                        xOffset += img.width;
                    });

                    resolve(canvas.toDataURL('image/png'));
                }
            };
            img.onerror = () => reject(new Error('Failed to load image for combining'));
            img.src = dataURL;
        });
    });
}

// Convert base64 data URL to Blob
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Generate image using OpenAI API (with optional reference image)
export async function generateImage(prompt, referenceImage = null) {
    try {
        let response;

        if (referenceImage) {
            // Use the images/edits endpoint with reference image
            const formData = new FormData();

            // Convert reference image to blob and add to form
            const imageBlob = dataURLtoBlob(referenceImage);
            formData.append('image', imageBlob, 'reference.png');

            formData.append('prompt', prompt);
            formData.append('model', CONFIG.IMAGE_MODEL);
            formData.append('n', '1');
            formData.append('size', CONFIG.IMAGE_SIZE);

            response = await fetch(CONFIG.OPENAI_API_EDIT_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.apiKey}`
                },
                body: formData
            });
        } else {
            // Standard image generation without reference
            response = await fetch(CONFIG.OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.apiKey}`
                },
                body: JSON.stringify({
                    model: CONFIG.IMAGE_MODEL,
                    prompt: prompt,
                    n: 1,
                    size: CONFIG.IMAGE_SIZE,
                    quality: CONFIG.IMAGE_QUALITY
                })
            });
        }

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
