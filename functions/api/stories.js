// API endpoint for saving and retrieving stories
// POST /api/stories - Save a new story
// GET /api/stories - List all stories
// GET /api/stories?id=xxx - Get a specific story

function generateId() {
    return crypto.randomUUID();
}

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: corsHeaders(),
    });
}

export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const storyId = url.searchParams.get('id');

    try {
        if (storyId) {
            // Get specific story with scenes
            const story = await env.DB.prepare(
                'SELECT * FROM stories WHERE id = ?'
            ).bind(storyId).first();

            if (!story) {
                return new Response(JSON.stringify({ error: 'Story not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
                });
            }

            const scenes = await env.DB.prepare(
                'SELECT * FROM scenes WHERE story_id = ? ORDER BY scene_number'
            ).bind(storyId).all();

            // Generate signed URLs for images
            const scenesWithUrls = await Promise.all(
                scenes.results.map(async (scene) => {
                    const imageObject = await env.IMAGES.get(scene.image_key);
                    let imageUrl = null;
                    if (imageObject) {
                        // For public bucket, construct the URL
                        imageUrl = `/api/images/${scene.image_key}`;
                    }
                    return {
                        ...scene,
                        image_url: imageUrl,
                    };
                })
            );

            return new Response(JSON.stringify({ story, scenes: scenesWithUrls }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders() },
            });
        } else {
            // List all stories
            const stories = await env.DB.prepare(
                'SELECT * FROM stories ORDER BY created_at DESC'
            ).all();

            return new Response(JSON.stringify({ stories: stories.results }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders() },
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        const body = await request.json();
        const { prompt, scenes } = body;

        if (!prompt || !scenes || !Array.isArray(scenes) || scenes.length === 0) {
            return new Response(JSON.stringify({ error: 'Invalid request body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders() },
            });
        }

        const storyId = generateId();
        const createdAt = new Date().toISOString();

        // Insert story
        await env.DB.prepare(
            'INSERT INTO stories (id, prompt, created_at) VALUES (?, ?, ?)'
        ).bind(storyId, prompt, createdAt).run();

        // Process each scene
        const sceneResults = [];
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const sceneId = generateId();
            const imageKey = `${storyId}/scene-${i + 1}.png`;

            // Upload image to R2
            // Image data should be base64 encoded (data:image/png;base64,...)
            let imageData = scene.imageData;
            if (imageData.startsWith('data:')) {
                // Extract base64 part
                const base64Part = imageData.split(',')[1];
                imageData = base64Part;
            }

            const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
            await env.IMAGES.put(imageKey, imageBuffer, {
                httpMetadata: {
                    contentType: 'image/png',
                },
            });

            // Insert scene record
            await env.DB.prepare(
                'INSERT INTO scenes (id, story_id, scene_number, caption, image_key, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(sceneId, storyId, i + 1, scene.caption, imageKey, createdAt).run();

            sceneResults.push({
                id: sceneId,
                scene_number: i + 1,
                caption: scene.caption,
                image_key: imageKey,
            });
        }

        return new Response(JSON.stringify({
            success: true,
            story: {
                id: storyId,
                prompt,
                created_at: createdAt,
            },
            scenes: sceneResults,
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
    }
}
