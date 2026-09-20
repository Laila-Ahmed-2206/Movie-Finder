export default async function handler(req, res) {
  const { endpoint } = req.query;
  if (!endpoint || !endpoint.startsWith("/")) {
    return res.status(400).json({
      error: "Invalid endpoint"
    });
  }
  const separator = endpoint.includes("?") ? "&" : "?";
  try {
    const response = await fetch(`https://api.themoviedb.org/3${endpoint}${separator}api_key=${process.env.TMDB_API_KEY}`);
    const data = await response.json();
    if (!response.ok) {
        return res.status(response.status).json(data);
    } 
    return res.status(200).json(data);
  } 
catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Movie API request failed"
    });
}}