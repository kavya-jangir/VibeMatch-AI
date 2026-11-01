from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor

from database import get_connection
from agent import movie_agent, vibebuddy_chat
from services.watchmode import get_omdb_details


app = FastAPI(title="VibeMatch AI API")


# CORS Configuration    
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "VibeMatch AI Python Backend is running!"}


# Get all movies
@app.get("/api/movies")
def get_movies():

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT * FROM movies")
    movies = cursor.fetchall()

    cursor.close()
    connection.close()

    return movies


# Movie Recommendation API
class RecommendationRequest(BaseModel):
    message: str


@app.post("/api/movies/recommend")
def recommend_movies(request: RecommendationRequest):

    movies = movie_agent(request.message)

    return movies


# VibeBuddy Chat API
class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = None


@app.post("/api/chat")
def chat_with_buddy(request: ChatRequest):

    response = vibebuddy_chat(
        request.message,
        request.history
    )

    return response


# Request model for Discover posters
class PosterRequest(BaseModel):
    id: str
    title: str
    year: Optional[int] = None


class PostersRequest(BaseModel):
    movies: List[PosterRequest]


# Fetch OMDb posters for Discover page
@app.post("/api/movies/posters")
def get_movie_posters(request: PostersRequest):

    def fetch_poster(movie):

        try:
            details = get_omdb_details(
                movie.title,
                movie.year
            )

            return {
                "id": movie.id,
                "title": movie.title,
                "poster": details.get("poster")
            }

        except Exception as e:

            print(f"Poster error for {movie.title}: {e}")

            return {
                "id": movie.id,
                "title": movie.title,
                "poster": None
            }

    with ThreadPoolExecutor(max_workers=8) as executor:

        results = list(
            executor.map(fetch_poster, request.movies)
        )

    return results