// icsProxy.js
import fetch from "node-fetch";

export async function handler(event) {
    const url = event.queryStringParameters.url;

    if (!url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "No URL provided" }),
        };
    }

    try {
        const response = await fetch(url);
        const data = await response.text();

        return {
            statusCode: response.status,
            headers: {
                "Content-Type": "text/calendar",
                "Access-Control-Allow-Origin": "*",
            },
            body: data,
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch data", details: error.message }),
        };
    }
}
