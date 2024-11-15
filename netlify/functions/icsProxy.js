import fetch from 'node-fetch';

export async function handler(event) {
    const url = event.queryStringParameters.url;

    if (!url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'No URL provided' }),
        };
    }

    try {
        const response = await fetch(url, {
            headers: {
                Accept: 'text/calendar',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/calendar')) {
            throw new Error(`Unexpected content type: ${contentType}`);
        }

        const data = await response.text();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/calendar',
                'Access-Control-Allow-Origin': '*',
            },
            body: data,
        };
    } catch (error) {
        console.error('Proxy error:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to fetch data from the specified URL',
                details: error.message,
            }),
        };
    }
}
