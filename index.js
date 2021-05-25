"use strict";

import config from './config.js'
import Fuse from 'fuse.js'

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

/**
 * Parse the GET parameters and trigger the appropriate function.
 */
async function handleRequest(request) {
    const url   = new URL(request.url);
    const query = url.searchParams.get("q");
    
    if (url.pathname.endsWith("refresh")) {
        if (isAuthenticated(request)) {
            return refreshContent();
        } else {
            return new Response("403 Forbidden", { status: 403 });
        }
    } else if (url.pathname.endsWith("api")) {
        return search(query);
    } else if (url.searchParams.get("q")) {
        let response = await fetch(url.href)
        response = new Response(response.body, response)
        response.headers.set("Link", "<" + config.baseURL + "/api?q=" + query + ">; rel='preload'; as='fetch'")
        return response
    } else {
        return fetch(url.href)
    }
}

/**
 * Checks if the request is authenticated by looking for a "Authentication"
 * header with the value specified as AUTH_KEY.
*/
function isAuthenticated(request) {
    return request.headers.get("Authentication") === config.authKey;
}

/**
 * Update the site content stored in Workers KV.
*/
async function refreshContent() {
    const response = await fetch(config.contentURL + Date.now(), {
        headers: { "Content-Type": "application/json;charset=UTF-8" }
    });
    
    if (!response.ok) {
        console.error("Failed to get content JSON file. Status code was " + response.status);
        return new Response("500 Internal Server Error", { status: 500 });
    }
    
    let json;
    try {
        json = await response.json();
    } catch (error) {
        console.error(error);
        return new Response("500 Internal Server Error", { status: 500 });
    }
    
    let jsonString  = JSON.stringify(json);
    CONTENT.put("content", jsonString);
    
    let index       = Fuse.createIndex(config.fuseOptions.keys, json);
    let indexString = JSON.stringify(index);
    CONTENT.put("index",   indexString);
    
    return new Response("200 OK", { status: 200 });
}

/**
 * Perform a search for the given query.
*/
async function search(query) {
    if (!query) return new Response("400 Bad Request", { status: 400 }); 
    
    let content   = await CONTENT.get("content");
    content       = JSON.parse(content);
    
    let index     = await CONTENT.get("index")
    index         = JSON.parse(index)
    index         = Fuse.parseIndex(index)
    
    const fuse    = new Fuse(content, config.fuseOptions, index);
    const results = fuse.search(query);
    
    if (results.length > 0)
        for (const result of results)
            for (const key of config.keysToRemove)
                delete result["item"][key]

    return new Response(JSON.stringify(results), {
        headers: { 
            "Content-Type":  "application/json;charset=UTF-8",
            "Cache-Control": "private, max-age=1800" // cache result in browser only, for 30 mins
        }
    }) 
}