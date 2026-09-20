// Backend route that proxies TMDB requests from the browser to the server.
// This keeps the API key out of the client code and centralizes the request logic.
export default async function handler(req, res) {
  const { endpoint } = req.query;
  // Rejects missing or malformed endpoints before the server calls TMDB.
  if (!endpoint || !endpoint.startsWith("/")) {
    return res.status(400).json({
      error: "Invalid endpoint"
    });
  }
  // Appends the TMDB API key to the request and forward the original endpoint query string.
  const separator = endpoint.includes("?") ? "&" : "?";
  try {
    const response = await fetch(`https://api.themoviedb.org/3${endpoint}${separator}api_key=${process.env.TMDB_API_KEY}`);
    const data = await response.json();
    if (!response.ok) {
        return res.status(response.status).json(data);
    } 
    // Successful TMDB response is passed straight back to the browser as JSON.
    return res.status(200).json(data);
  } 
catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Movie API request failed"
    });
}}