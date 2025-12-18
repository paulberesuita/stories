// Runway ML video generation API integration (via server-side proxy)

import { CONFIG } from './config.js';
import { state } from './state.js';

// Convert relative URLs to absolute URLs for Runway API
function toAbsoluteUrl(url) {
    if (!url) return url;

    // If it's already a data URL or absolute URL, return as-is
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Convert relative URL to absolute
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Start a video generation task via our proxy
async function startVideoTask(imageUrl, promptText = '') {
    if (!state.runwayKey) {
        throw new Error('Runway API key is required. Please add it in Settings.');
    }

    // Ensure we have an absolute URL
    const absoluteImageUrl = toAbsoluteUrl(imageUrl);
    console.log('Starting video generation for image:', absoluteImageUrl.substring(0, 100) + '...');

    const response = await fetch('/api/video', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'start',
            runwayKey: state.runwayKey,
            imageUrl: absoluteImageUrl,
            promptText: promptText,
            model: CONFIG.RUNWAY_MODEL,
            duration: CONFIG.RUNWAY_VIDEO_DURATION
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Video task start error:', data);
        throw new Error(data.error || `Failed to start video generation: ${response.status}`);
    }

    console.log('Video task started:', data.id);
    return data.id;
}

// Check task status via our proxy
async function checkTaskStatus(taskId) {
    const response = await fetch('/api/video', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'status',
            runwayKey: state.runwayKey,
            taskId: taskId
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Task status check error:', data);
        throw new Error(data.error || `Failed to check task status: ${response.status}`);
    }

    return data;
}

// Poll for task completion and return the video URL
export async function waitForVideoTask(taskId, onProgress = null) {
    const maxAttempts = 120; // 6 minutes max (120 * 3s)
    let attempts = 0;

    console.log('Waiting for video task:', taskId);

    while (attempts < maxAttempts) {
        const task = await checkTaskStatus(taskId);

        console.log(`Task ${taskId} status:`, task.status, task.progress || 0);

        if (onProgress) {
            onProgress(task.status, task.progress || 0);
        }

        if (task.status === 'SUCCEEDED') {
            // Return the video URL from the output
            if (task.output && task.output.length > 0) {
                console.log('Video generated:', task.output[0]);
                return task.output[0];
            }
            throw new Error('Video generation succeeded but no output URL found');
        }

        if (task.status === 'FAILED') {
            console.error('Video task failed:', task);
            throw new Error(task.error || task.failure || 'Video generation failed');
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, CONFIG.RUNWAY_POLL_INTERVAL));
        attempts++;
    }

    throw new Error('Video generation timed out');
}

// Generate video for a single scene (combines start task + polling)
export async function generateSceneVideo(imageUrl, caption, onProgress = null) {
    // Create a short prompt from the caption for video movement
    const videoPrompt = caption.length > 200
        ? caption.substring(0, 200) + '...'
        : caption;

    const taskId = await startVideoTask(imageUrl, videoPrompt);
    const videoUrl = await waitForVideoTask(taskId, onProgress);
    return videoUrl;
}

// Generate videos for all scenes sequentially
export async function generateAllSceneVideos(images, captions, onSceneProgress = null) {
    const videos = [];

    console.log('Starting video generation for', images.length, 'scenes');

    for (let i = 0; i < images.length; i++) {
        if (!images[i]) {
            console.log('Skipping scene', i + 1, '- no image');
            continue;
        }

        console.log('Generating video for scene', i + 1);

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
            console.error('Video generation failed for scene', i + 1, ':', error);
            if (onSceneProgress) {
                onSceneProgress(i, 'failed', 0, error.message);
            }
            throw error;
        }
    }

    console.log('All videos generated:', videos);
    return videos;
}

// Concatenate video URLs into a single video
// For MVP, returns the first video. Full concatenation requires server-side FFmpeg.
export async function concatenateVideos(videoUrls) {
    const validVideos = videoUrls.filter(url => url);
    console.log('Concatenating videos:', validVideos.length, 'videos');
    return validVideos[0];
}
