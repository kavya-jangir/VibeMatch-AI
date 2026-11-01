const API_URL = 'http://127.0.0.1:8000';

export async function getMovies() {
  const response = await fetch(`${API_URL}/api/movies`);

  if (!response.ok) {
    throw new Error('Failed to fetch movies');
  }

  return await response.json();
}
