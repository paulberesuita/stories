// OpenAI API integration and prompt generation

import { CONFIG } from './config.js';
import { state } from './state.js';

// Generate scene prompts from user prompt
export function generateScenePrompts(userPrompt) {
    return [
        `Scene 1 of 4 - The beginning: ${userPrompt}. Show the opening scene that introduces the setting and characters.`,
        `Scene 2 of 4 - Rising action: ${userPrompt}. Show a development or challenge emerging.`,
        `Scene 3 of 4 - Climax: ${userPrompt}. Show the peak moment of tension or action.`,
        `Scene 4 of 4 - Resolution: ${userPrompt}. Show how the story concludes.`
    ];
}

// Generate scene captions from user prompt
export function generateSceneCaptions(userPrompt) {
    const coreIdea = userPrompt;

    return [
        `${coreIdea}. This opening scene introduces the setting and characters, establishing the world where our story unfolds.`,
        `${coreIdea}. A challenge emerges, creating tension and propelling the narrative forward as obstacles appear.`,
        `${coreIdea}. The story reaches its peak moment of tension, where the central conflict comes to a dramatic head.`,
        `${coreIdea}. The story concludes, bringing closure and showing how the journey transforms the characters and their world.`
    ];
}

// Generate image using OpenAI API
export async function generateImage(prompt) {
    try {
        const response = await fetch(CONFIG.OPENAI_API_URL, {
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
