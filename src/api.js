const API_URL =
  import.meta.env.VITE_API_URL || 'https://vibematch-ai-backend.onrender.com';

export async function getMovies() {
  const response = await fetch(`${API_URL}/api/movies`);

  if (!response.ok) {
    throw new Error('Failed to fetch movies');
  }

  return await response.json();
}
