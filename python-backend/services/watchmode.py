
import os
import requests
import re

from dotenv import load_dotenv
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

WATCHMODE_API_KEY = os.getenv("WATCHMODE_API_KEY")
OMDB_API_KEY = os.getenv("OMDB_API_KEY")

BASE_URL = "https://api.watchmode.com/v1"
REQUEST_TIMEOUT = 10

WATCHMODE_HEADERS = {
    "X-API-Key": WATCHMODE_API_KEY
}

# Alternative movie titles
MOVIE_ALIASES = {
    "taare zameen par": [
        "Taare Zameen Par",
        "Like Stars on Earth"
    ],
    "laapataa ladies": [
        "Laapataa Ladies",
        "Lost Ladies"
    ]
}


def normalize_title(title):
    return re.sub(
        r"[^a-z0-9]",
        "",
        str(title).lower()
    )


def get_title_variations(movie_name):
    normalized = normalize_title(movie_name)

    for key, aliases in MOVIE_ALIASES.items():
        if normalized == normalize_title(key):
            return aliases

    return [movie_name]


# Watchmode request
def make_request(url, params=None):
    response = requests.get(
        url,
        headers=WATCHMODE_HEADERS,
        params=params,
        timeout=REQUEST_TIMEOUT
    )

    response.raise_for_status()
    return response.json()


def test_watchmode_connection():
    if not WATCHMODE_API_KEY:
        return {"error": "Watchmode API key not found."}

    return make_request(f"{BASE_URL}/status/")


# Search Watchmode
@lru_cache(maxsize=256)
def search_movie(movie_name):
    params = {
        "search_field": "name",
        "search_value": movie_name
    }

    data = make_request(
        f"{BASE_URL}/search/",
        params
    )

    return data.get("title_results", [])


@lru_cache(maxsize=256)
def get_movie_details(watchmode_id):
    return make_request(
        f"{BASE_URL}/title/{watchmode_id}/details/"
    )


@lru_cache(maxsize=256)
def get_movie_sources(watchmode_id):
    params = {
        "regions": "IN"
    }

    return make_request(
        f"{BASE_URL}/title/{watchmode_id}/sources/",
        params
    )


# OMDb request
def omdb_request(params):
    if not OMDB_API_KEY:
        return {}

    response = requests.get(
        "https://www.omdbapi.com/",
        params={
            **params,
            "apikey": OMDB_API_KEY
        },
        timeout=REQUEST_TIMEOUT
    )

    response.raise_for_status()
    return response.json()


# Find the best OMDb movie match
@lru_cache(maxsize=256)
def get_omdb_details(movie_name, year=None):

    if not OMDB_API_KEY:
        print("OMDb API key not found.")
        return {}

    try:
        variations = get_title_variations(movie_name)

        selected_data = {}

        for title in variations:

            params = {
                "t": title,
                "type": "movie"
            }

            if year:
                params["y"] = year

            # First try exact title
            data = omdb_request(params)

            if data.get("Response") == "True":
                selected_data = data

                if data.get("Poster") not in (
                    None, "", "N/A"
                ):
                    break

            # Search fallback
            search_data = omdb_request({
                "s": title,
                "type": "movie"
            })

            if search_data.get("Response") != "True":
                continue

            results = search_data.get("Search", [])

            target_title = normalize_title(title)
            selected = None

            # Exact title and year
            for item in results:
                result_title = normalize_title(
                    item.get("Title", "")
                )

                result_year = str(item.get("Year", ""))

                if (
                    result_title == target_title
                    and (
                        not year
                        or result_year.startswith(str(year))
                    )
                ):
                    selected = item
                    break

            # Exact title without year
            if not selected:
                for item in results:
                    if normalize_title(
                        item.get("Title", "")
                    ) == target_title:
                        selected = item
                        break

            # Use first result only as last fallback
            if not selected and results:
                selected = results[0]

            if selected:
                imdb_id = selected.get("imdbID")

                if imdb_id:
                    detail_data = omdb_request({
                        "i": imdb_id
                    })

                    if detail_data.get("Response") == "True":
                        selected_data = detail_data

                if (
                    selected_data.get("Poster")
                    in (None, "", "N/A")
                ):
                    selected_data["Poster"] = selected.get(
                        "Poster"
                    )

            if selected_data.get("Poster") not in (
                None, "", "N/A"
            ):
                break

        if selected_data.get("Response") != "True":
            print("OMDb movie not found:", movie_name)
            return {}

        poster = selected_data.get("Poster")

        if poster in (None, "", "N/A"):
            poster = None

        rating = selected_data.get("imdbRating")

        if rating == "N/A":
            rating = None

        runtime = selected_data.get("Runtime")

        if runtime and runtime != "N/A":
            runtime = runtime.replace(" min", "")
        else:
            runtime = None

        genres = selected_data.get("Genre", "")

        if genres and genres != "N/A":
            genres = [
                item.strip()
                for item in genres.split(",")
            ]
        else:
            genres = []

        language = selected_data.get("Language")

        if language == "N/A":
            language = None

        print(
            f"OMDb poster for {movie_name}: {poster}"
        )

        return {
            "poster": poster,
            "rating": rating,
            "runtime": runtime,
            "genres": genres,
            "language": language,
            "imdb_id": selected_data.get("imdbID")
        }

    except Exception as e:
        print(f"OMDb error for {movie_name}: {e}")
        return {}


# Search Watchmode using title variations
def find_watchmode_movie(movie_name, year=None):

    variations = get_title_variations(movie_name)

    all_movies = []

    for title in variations:
        try:
            results = search_movie(title)
            all_movies.extend(results)
        except Exception as e:
            print("Watchmode search error:", e)

    target_titles = [
        normalize_title(title)
        for title in variations
    ]

    # Exact title and year
    for item in all_movies:
        item_name = normalize_title(item.get("name", ""))

        same_year = (
            not year
            or str(item.get("year")) == str(year)
        )

        if item_name in target_titles and same_year:
            return item

    # Exact title without year
    for item in all_movies:
        item_name = normalize_title(item.get("name", ""))

        if item_name in target_titles:
            return item

    return None


# Combine Watchmode and OMDb data
@lru_cache(maxsize=256)
def get_movie_with_sources(movie_name, year=None):

    # Fetch OMDb independently.
    # Poster can still be found if Watchmode has no match.
    with ThreadPoolExecutor(max_workers=2) as executor:

        omdb_task = executor.submit(
            get_omdb_details,
            movie_name,
            str(year) if year else None
        )

        watchmode_task = executor.submit(
            find_watchmode_movie,
            movie_name,
            year
        )

        try:
            omdb = omdb_task.result()
        except Exception as e:
            print("OMDb error:", e)
            omdb = {}

        try:
            selected_movie = watchmode_task.result()
        except Exception as e:
            print("Watchmode search error:", e)
            selected_movie = None

    # If neither API finds the movie
    if not selected_movie and not omdb:
        return None

    details = {}
    sources = []
    movie_id = None

    # Fetch Watchmode details and sources
    if selected_movie:

        movie_id = selected_movie.get("id")

        if movie_id:

            with ThreadPoolExecutor(max_workers=2) as executor:

                details_task = executor.submit(
                    get_movie_details,
                    movie_id
                )

                sources_task = executor.submit(
                    get_movie_sources,
                    movie_id
                )

                try:
                    details = details_task.result()
                except Exception as e:
                    print("Watchmode details error:", e)

                try:
                    sources = sources_task.result()
                except Exception as e:
                    print("Watchmode sources error:", e)

    # Final combined response
    return {
        "id": movie_id,

        "title": (
            details.get("title")
            or (
                selected_movie.get("name")
                if selected_movie else movie_name
            )
        ),

        "year": (
            details.get("year")
            or (
                selected_movie.get("year")
                if selected_movie else year
            )
        ),

        "type": (
            details.get("type")
            or (
                selected_movie.get("type")
                if selected_movie else "movie"
            )
        ),

        "poster": (
            omdb.get("poster")
            or details.get("poster")
            or details.get("image_url")
        ),

        "rating": (
            omdb.get("rating")
            or details.get("user_rating")
        ),

        "runtime": (
            omdb.get("runtime")
            or details.get("runtime_minutes")
        ),

        "genres": (
            omdb.get("genres")
            or details.get("genre_names", [])
        ),

        "language": omdb.get("language"),

        "imdb_id": omdb.get("imdb_id"),

        "sources": sources
    }
