export default async function handler(req, res) {
    const { endpoint } = req.query;
    if (!endpoint) {
        return res.status(400).json({
            error: "Missing TMDB endpoint"
        });
    }
    try {
        const separator = endpoint.includes("?") ? "&" : "?";
        const response = await fetch(`https://api.themoviedb.org/3${endpoint}${separator}api_key=${process.env.TMDB_API_KEY}`);
        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error) {
        return res.status(500).json({
            error: "Failed to contact TMDB"
        });
    }
}