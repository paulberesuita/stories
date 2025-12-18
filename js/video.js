// Runway ML video generation API integration

import { CONFIG } from './config.js';
import { state } from './state.js';

// Generate a video from an image using Runway's image-to-video API
export async function generateVideoFromImage(imageDataUrl, promptText = '') {
    if (!state.runwayKey) {
        throw new Error('Runway API key is required. Please add it in Settings.');
    }

    // Start the video generation task
    const response = await fetch(CONFIG.RUNWAY_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.runwayKey}`,
            'X-Runway-Version': '2024-11-06'
        },
        body: JSON.stringify({
            model: CONFIG.RUNWAY_MODEL,
            promptImage: imageDataUrl,
            promptText: promptText,
            duration: CONFIG.RUNWAY_VIDEO_DURATION,
            ratio: '1024:1024'
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Runway API error: ${response.status}`);
    }

    const data = await response.json();
    return data.id;
}

// Poll for task completion and return the video URL
export async function waitForVideoTask(taskId, onProgress = null) {
    const maxAttempts = 120; // 6 minutes max (120 * 3s)
    let attempts = 0;

    while (attempts < maxAttempts) {
        const response = await fetch(`${CONFIG.RUNWAY_TASK_URL}/${taskId}`, {
            headers: {
                'Authorization': `Bearer ${state.runwayKey}`,
                'X-Runway-Version': '2024-11-06'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to check task status: ${response.status}`);
        }

        const task = await response.json();

        if (onProgress) {
            onProgress(task.status, task.progress || 0);
        }

        if (task.status === 'SUCCEEDED') {
            // Return the video URL from the output
            if (task.output && task.output.length > 0) {
                return task.output[0];
            }
            throw new Error('Video generation succeeded but no output URL found');
        }

        if (task.status === 'FAILED') {
            throw new Error(task.error || 'Video generation failed');
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, CONFIG.RUNWAY_POLL_INTERVAL));
        attempts++;
    }

    throw new Error('Video generation timed out');
}

// Generate video for a single scene (combines start task + polling)
export async function generateSceneVideo(imageDataUrl, caption, onProgress = null) {
    // Create a short prompt from the caption for video movement
    const videoPrompt = caption.length > 200
        ? caption.substring(0, 200) + '...'
        : caption;

    const taskId = await generateVideoFromImage(imageDataUrl, videoPrompt);
    const videoUrl = await waitForVideoTask(taskId, onProgress);
    return videoUrl;
}

// Generate videos for all scenes sequentially
export async function generateAllSceneVideos(images, captions, onSceneProgress = null) {
    const videos = [];

    for (let i = 0; i < images.length; i++) {
        if (!images[i]) continue;

        if (onSceneProgress) {
            onSceneProgress(i, 'starting');
        }

        try {
            const videoUrl = await generateSceneVideo(
                images[i],
                captions[i] || '',
                (status, progress) => {
                    if (onSceneProgress) {
                        onSceneProgress(i, status, progress);
                    }
                }
            );
            videos[i] = videoUrl;

            if (onSceneProgress) {
                onSceneProgress(i, 'completed');
            }
        } catch (error) {
            if (onSceneProgress) {
                onSceneProgress(i, 'failed', 0, error.message);
            }
            throw error;
        }
    }

    return videos;
}

// Concatenate video URLs into a single video using canvas/MediaRecorder
// This is a client-side approach - for production, consider server-side FFmpeg
export async function concatenateVideos(videoUrls) {
    // For now, return the first video or implement basic concatenation
    // Full video concatenation would require either:
    // 1. Server-side FFmpeg processing
    // 2. WebCodecs API (limited browser support)
    // 3. MediaRecorder with canvas playback

    // Return first video for MVP, can enhance later
    return videoUrls.filter(url => url)[0];
}
