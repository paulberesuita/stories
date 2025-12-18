// Runway ML API proxy - handles CORS and API calls server-side

const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1/image_to_video';
const RUNWAY_TASK_URL = 'https://api.dev.runwayml.com/v1/tasks';

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Fetch image and convert to base64 data URL
async function fetchImageAsBase64(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    return `data:${contentType};base64,${base64}`;
}

export async function onRequestPost(context) {
    const { request } = context;

    try {
        const body = await request.json();
        const { action, runwayKey, ...params } = body;

        if (!runwayKey) {
            return new Response(JSON.stringify({ error: 'Runway API key is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (action === 'start') {
            // Start a new video generation task
            let { imageUrl, promptText, model, duration } = params;

            // If the image URL is not already a data URL, fetch and convert it
            if (imageUrl && !imageUrl.startsWith('data:')) {
                console.log('Fetching image from URL:', imageUrl);
                try {
                    imageUrl = await fetchImageAsBase64(imageUrl);
                    console.log('Converted image to base64, length:', imageUrl.length);
                } catch (fetchError) {
                    console.error('Failed to fetch image:', fetchError);
                    return new Response(JSON.stringify({
                        error: `Failed to fetch image: ${fetchError.message}`
                    }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }

            const response = await fetch(RUNWAY_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${runwayKey}`,
                    'X-Runway-Version': '2024-11-06'
                },
                body: JSON.stringify({
                    model: model || 'gen4_turbo',
                    promptImage: imageUrl,
                    promptText: promptText || '',
                    duration: duration || 5,
                    ratio: '1024:1024'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return new Response(JSON.stringify({
                    error: errorData.error || `Runway API error: ${response.status}`
                }), {
                    status: response.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const data = await response.json();
            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json' }
            });

        } else if (action === 'status') {
            // Check task status
            const { taskId } = params;

            if (!taskId) {
                return new Response(JSON.stringify({ error: 'Task ID is required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const response = await fetch(`${RUNWAY_TASK_URL}/${taskId}`, {
                headers: {
                    'Authorization': `Bearer ${runwayKey}`,
                    'X-Runway-Version': '2024-11-06'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return new Response(JSON.stringify({
                    error: errorData.error || `Failed to check task status: ${response.status}`
                }), {
                    status: response.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const data = await response.json();
            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json' }
            });

        } else {
            return new Response(JSON.stringify({ error: 'Invalid action. Use "start" or "status".' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Video API error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
