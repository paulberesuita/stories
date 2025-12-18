// Serve images from R2 bucket
// GET /api/images/:storyId/scene-:n.png

export async function onRequestGet(context) {
    const { env, params } = context;
    const imageKey = params.path.join('/');

    try {
        const object = await env.IMAGES.get(imageKey);

        if (!object) {
            return new Response('Image not found', { status: 404 });
        }

        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new Response(object.body, { headers });
    } catch (error) {
        return new Response('Error fetching image: ' + error.message, { status: 500 });
    }
}
