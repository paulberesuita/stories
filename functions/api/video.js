// Runway ML API proxy - handles CORS and API calls server-side

const RUNWAY_API_URL = 'https://api.dev.runwayml.com/v1/image_to_video';
const RUNWAY_TASK_URL = 'https://api.dev.runwayml.com/v1/tasks';

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
            const { imageUrl, promptText, model, duration } = params;

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
