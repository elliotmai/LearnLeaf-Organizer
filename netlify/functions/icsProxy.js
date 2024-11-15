// icsProxy.js
import fetch from "node-fetch";

export async function handler(event) {
    const url = event.queryStringParameters.url;

    if (!url || !url.endsWith(".ics")) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid or missing .ics URL" }),
        };
    }

    try {
        const response = await fetch(url);
        const contentType = response.headers.get("content-type");

        // Ensure the response is a valid calendar file
        if (!contentType || !contentType.includes("text/calendar")) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Invalid .ics file response" }),
            };
        }

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
