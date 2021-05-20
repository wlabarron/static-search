# Static Search
This is a super simple search API for static websites. It pulls data from a JSON file, created as part of the static website's build process, and stores this search index in Workers KV. You can then query the index using GET requests.

The search is configurable and done using [Fuse.js](https://fusejs.io/), and the system runs serverlessly on [Cloudflare Workers](https://workers.cloudflare.com).

## Usage
There's probably a nice way to do this using `wrangler generate`. The following instructions are mostly notes to myself. Contributions to improve this and make it better for others are welcome, in case I never get around to it.

1. Structure your website data. For a Jekyll site where you're only looking to search through blog posts, this might look like the `jekyll.json` file renamed and put into your site's root. Effectively, the goal is to get everything you wish to be searchable as a big JSON array somewhere on the internet.
2. Copy `config.js.template` to `config.js`, and fill in your details.
3. Copy `wrangler.toml.template` to `wrangler.toml`, and fill in your details. You can find out more about configuring for deployment in [Cloudflare's documentation](https://developers.cloudflare.com/workers/get-started/guide#7-configure-your-project-for-deployment). Remember to [create a KV Namespace](https://developers.cloudflare.com/workers/cli-wrangler/commands#getting-started) and put the ID into the `wrangler.toml` file, with the binding `CONTENT`.
4. Deploy your updated static site and Worker.
5. As part of your static site deployment process, include a request to your Worker with the query parameter `refresh=true`, and the authentication header you set in `config.js`. For example, `curl "https://search-worker-url/?refresh=true" --header "Authentication: Secure_Password"`. That will update the Worker's search index.
6. Build your front end. You can make search queries to `https://search-worker-url/?q=<query text>`, for example `curl "https://search-worker-url/?q=installation%20instructions"` would return the results of a search for "installation instructions".