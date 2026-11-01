import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

from google import genai
from dotenv import load_dotenv

from services.watchmode import get_movie_with_sources

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = (
    genai.Client(api_key=GEMINI_API_KEY)
    if GEMINI_API_KEY
    else None
)

MODEL_NAME = "gemini-3.5-flash"

MAX_MOVIES = 4
CANDIDATE_COUNT = 15


HINDI_MOVIES = {
    "comedy": [
        "Hera Pheri", "Andaz Apna Apna", "3 Idiots",
        "Chupke Chupke", "Munna Bhai M.B.B.S.",
        "Welcome", "Dhamaal", "Fukrey",
        "Chup Chup Ke", "Bhool Bhulaiyaa"
    ],

    "drama": [
        "Taare Zameen Par", "Kal Ho Naa Ho", "October",
        "Barfi!", "Anand", "Udaan", "The Sky Is Pink",
        "Masaan", "Dear Zindagi", "Swades"
    ],

    "romance": [
        "Jab We Met", "Yeh Jawaani Hai Deewani",
        "Sita Ramam", "Veer-Zaara", "96",
        "Barfi!", "Kal Ho Naa Ho",
        "Aashiqui 2", "Rockstar", "Hasee Toh Phasee"
    ],

    "action": [
        "War", "Dangal", "RRR", "Baby",
        "Drishyam", "Jawan", "Pathaan",
        "URI: The Surgical Strike", "Bang Bang", "Shershaah"
    ],

    "thriller": [
        "Andhadhun", "Drishyam", "Kahaani",
        "Talaash", "Badla", "A Wednesday",
        "Special 26", "Ratsasan", "Ittefaq"
    ]
}


FALLBACK_MOVIES = {
    "happy": [
        "Zindagi Na Milegi Dobara", "3 Idiots",
        "Queen", "Yeh Jawaani Hai Deewani",
        "Jab We Met", "The Intern", "Paddington 2",
        "Little Miss Sunshine", "Chef", "The Secret Life of Walter Mitty"
    ],

    "fun": [
        "Hera Pheri", "Welcome", "Bhool Bhulaiyaa",
        "Chup Chup Ke", "Jumanji", "Dhamaal",
        "Andaz Apna Apna", "Fukrey", "Johnny English"
    ],

    "relaxed": [
        "Karwaan", "Wake Up Sid", "Piku",
        "The Lunchbox", "Little Forest",
        "Julie and Julia", "Our Little Sister",
        "The Intern", "Chef"
    ],

    "romantic": [
        "Jab We Met", "Yeh Jawaani Hai Deewani",
        "The Notebook", "Sita Ramam", "Before Sunrise",
        "Hasee Toh Phasee", "Veer-Zaara",
        "About Time", "The Holiday", "Notting Hill"
    ],

    "emotional": [
        "Taare Zameen Par", "Kal Ho Naa Ho",
        "October", "Barfi!", "The Pursuit of Happyness",
        "The Fault in Our Stars", "Me Before You",
        "Wonder", "A Man Called Otto", "Hachi: A Dog's Tale"
    ],

    "peaceful": [
        "The Lunchbox", "Karwaan", "Piku",
        "Little Forest", "Our Little Sister",
        "The Secret Life of Walter Mitty",
        "The Intern", "Chef"
    ],

    "thoughtful": [
        "The Truman Show", "Inception", "Arrival",
        "Swades", "12 Angry Men", "Interstellar",
        "The Martian", "The Prestige"
    ],

    "excited": [
        "RRR", "Dangal", "War",
        "Mad Max: Fury Road", "Top Gun: Maverick",
        "Jawan", "Pathaan", "Mission Impossible",
        "Edge of Tomorrow"
    ],

    "cozy": [
        "The Intern", "Paddington 2",
        "Julie and Julia", "English Vinglish",
        "The Holiday", "Chef",
        "Little Forest", "Piku"
    ],

    "tired": [
        "Piku", "The Intern", "Paddington 2",
        "The Lunchbox", "Karwaan",
        "Julie and Julia", "Chef", "Little Forest"
    ]
}


# Step 1: Understand user preferences
def understand_request(user_message):

    message = user_message.lower()

    preferences = {
        "moods": [],
        "language": "Any",
        "movie_type": "Any",
        "genre": "Any",
        "time": "No time limit"
    }

    mood_keywords = {
        "happy": ["happy", "happiness", "cheerful"],
        "fun": ["fun", "funny", "entertaining"],
        "relaxed": ["relaxed", "relax", "calm"],
        "romantic": ["romantic", "romance", "love"],
        "emotional": ["sad", "emotional", "cry", "heartbroken"],
        "peaceful": ["peaceful", "peace", "soothing"],
        "excited": ["excited", "thrilling", "adventurous"],
        "thoughtful": ["thoughtful", "deep", "meaningful"],
        "cozy": ["cozy", "comfort"],
        "tired": ["tired", "exhausted", "sleepy"]
    }

    for mood, keywords in mood_keywords.items():
        if any(
            re.search(r"\b" + re.escape(word) + r"\b", message)
            for word in keywords
        ):
            preferences["moods"].append(mood.capitalize())

    if re.search(r"\bhindi\b", message):
        preferences["language"] = "Hindi"
    elif re.search(r"\benglish\b", message):
        preferences["language"] = "English"

    if re.search(r"\b(series|web series|tv show)\b", message):
        preferences["movie_type"] = "Series"
    elif re.search(r"\b(movie|film)\b", message):
        preferences["movie_type"] = "Movie"

    genre_keywords = {
        "Comedy": ["comedy", "comedies", "funny"],
        "Romance": ["romance", "romantic"],
        "Drama": ["drama"],
        "Adventure": ["adventure"],
        "Sci-Fi": ["sci-fi", "science fiction"],
        "Thriller": ["thriller", "suspense"],
        "Action": ["action"],
        "Horror": ["horror", "scary"]
    }

    for genre, keywords in genre_keywords.items():
        if any(
            re.search(r"\b" + re.escape(word) + r"\b", message)
            for word in keywords
        ):
            preferences["genre"] = genre
            break

    if (
        preferences["genre"] == "Any"
        and "Emotional" in preferences["moods"]
    ):
        preferences["genre"] = "Drama"

    if re.search(r"under\s*(1|one)\s*hour|less than\s*(1|one)\s*hour", message):
        preferences["time"] = "Under 1 hour"

    elif re.search(r"1\s*[-–to]+\s*2\s*hours", message):
        preferences["time"] = "1-2 hours"

    elif re.search(r"2\+\s*hours|more than\s*2\s*hours", message):
        preferences["time"] = "2+ hours"

    print("\nDetected preferences:", preferences)

    return preferences


# Step 2: Get fallback titles
def get_fallback_movies(preferences):

    selected_movies = []

    language = preferences["language"]
    genre = preferences["genre"]

    if language == "Hindi" and genre != "Any":
        selected_movies.extend(
            HINDI_MOVIES.get(genre.lower(), [])
        )

    for mood in preferences["moods"]:
        selected_movies.extend(
            FALLBACK_MOVIES.get(mood.lower(), [])
        )

    if not selected_movies:
        selected_movies.extend(FALLBACK_MOVIES["happy"])
        selected_movies.extend(FALLBACK_MOVIES["excited"])

    return list(dict.fromkeys(selected_movies))


# Step 3: Generate candidate titles
def generate_movie_titles(user_message, preferences):

    fallback_movies = get_fallback_movies(preferences)

    if len(fallback_movies) >= 8:
        print("\nUsing fallback candidates. Gemini call skipped.")
        return fallback_movies[:CANDIDATE_COUNT]

    prompt = f"""
You are VibeMatch AI.

Suggest {CANDIDATE_COUNT} real movie titles.

User request: {user_message}

Preferences:
Mood: {preferences['moods']}
Language: {preferences['language']}
Movie type: {preferences['movie_type']}
Genre: {preferences['genre']}
Time: {preferences['time']}

Follow the user's language and genre.
Suggest relevant movies only.
Return one title per line.
Do not add numbering or explanations.
"""

    titles = list(fallback_movies)

    try:
        if client:

            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )

            for line in (response.text or "").splitlines():

                title = re.sub(
                    r"^\s*(?:\d+[\.\)]\s*|[-*•]\s*)",
                    "",
                    line
                ).strip().strip("\"'`*")

                if title and title.lower() not in [
                    item.lower() for item in titles
                ]:
                    titles.append(title)

        else:
            print("Gemini API key not found.")

    except Exception as e:
        print("Gemini suggestion error:", e)

    return titles[:CANDIDATE_COUNT]


# Step 4: Check movie preferences
def movie_matches_preferences(movie, preferences, relaxed=False):

    requested_language = preferences["language"]

    if requested_language != "Any":

        movie_language = str(
            movie.get("language") or ""
        ).lower()

        if requested_language.lower() not in movie_language:
            return False

    requested_type = preferences["movie_type"]

    if requested_type != "Any":

        actual_type = str(
            movie.get("type") or ""
        ).lower()

        if requested_type == "Movie" and actual_type != "movie":
            return False

        if requested_type == "Series" and actual_type not in [
            "tv_series", "series", "tv"
        ]:
            return False

    if relaxed:
        return True

    requested_genre = preferences["genre"]

    if requested_genre != "Any":

        movie_genres = movie.get("genres") or []

        if isinstance(movie_genres, str):
            movie_genres = movie_genres.split(",")

        movie_genres = [
            str(g).strip().lower()
            for g in movie_genres
        ]

        if requested_genre.lower() not in movie_genres:
            return False

    runtime = movie.get("runtime")

    try:
        runtime = int(runtime)

        if 30 <= runtime <= 300:

            if preferences["time"] == "Under 1 hour" and runtime >= 60:
                return False

            if preferences["time"] == "1-2 hours" and not 60 <= runtime <= 120:
                return False

            if preferences["time"] == "2+ hours" and runtime < 120:
                return False

    except (ValueError, TypeError):
        pass

    return True


# Step 5: Verify movies with parallel API calls
def verify_movie_titles(titles, preferences):

    found_movies = []
    seen_titles = set()
    seen_ids = set()

    def search_one_movie(title):

        print("Searching:", title)

        try:
            return get_movie_with_sources(title)
        except Exception as e:
            print(f"Watchmode error for {title}: {e}")
            return None

    executor = ThreadPoolExecutor(max_workers=8)

    try:

        futures = {
            executor.submit(search_one_movie, title): title
            for title in titles
        }

        for future in as_completed(futures):

            movie = future.result()

            if not movie:
                continue

            title = str(movie.get("title") or "").strip()
            movie_id = movie.get("id")

            if not title:
                continue

            if title.lower() in seen_titles:
                continue

            if movie_id is not None and movie_id in seen_ids:
                continue

            found_movies.append(movie)
            seen_titles.add(title.lower())

            if movie_id is not None:
                seen_ids.add(movie_id)

    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    exact_matches = [
        movie for movie in found_movies
        if movie_matches_preferences(movie, preferences)
    ]

    if len(exact_matches) < MAX_MOVIES:

        exact_titles = {
            movie.get("title", "").lower()
            for movie in exact_matches
        }

        for movie in found_movies:

            title = str(movie.get("title") or "").lower()

            if title in exact_titles:
                continue

            if movie_matches_preferences(
                movie, preferences, relaxed=True
            ):
                exact_matches.append(movie)
                exact_titles.add(title)

            if len(exact_matches) >= MAX_MOVIES:
                break

    return exact_matches[:MAX_MOVIES]


# Step 6: Generate top pick
def generate_final_recommendation(user_message, preferences, movies):

    first_movie = movies[0]
    title = first_movie.get("title")

    moods = preferences["moods"]

    if "Emotional" in moods:
        reason = "It has an emotional story that may suit your mood."

    elif "Happy" in moods or "Fun" in moods:
        reason = "It can be a fun and enjoyable choice for your mood."

    elif "Romantic" in moods:
        reason = "Its romantic story may be a good match for your mood."

    elif "Relaxed" in moods or "Peaceful" in moods:
        reason = "It may be a nice, relaxing movie to watch."

    elif "Excited" in moods:
        reason = "It can be an exciting choice for your mood."

    else:
        reason = "It matches your selected movie preferences."

    platforms = list(dict.fromkeys(
        source.get("name")
        for source in first_movie.get("sources", [])
        if source.get("name")
    ))

    recommendation = f"TOP PICK: {title}\n\n{reason}"

    if platforms:
        recommendation += "\n\nAvailable on: " + ", ".join(platforms)
    else:
        recommendation += "\n\nNo India streaming sources are currently listed."

    return recommendation


# Step 7: Main VibeMatch AI Agent
def movie_agent(user_message):

    print("\n================================")
    print("VibeMatch AI Agent started")
    print("================================")

    preferences = understand_request(user_message)

    titles = generate_movie_titles(
        user_message,
        preferences
    )

    print("\nMovie candidates:", titles)

    movies = verify_movie_titles(
        titles,
        preferences
    )

    if not movies:

        return {
            "movies": [],
            "recommendation": (
                "Sorry, no verified movies were found. "
                "Try changing your language or preferences."
            )
        }

    recommendation = generate_final_recommendation(
        user_message,
        preferences,
        movies
    )

    print("\nVerified movies:")
    for movie in movies:
        print("-", movie.get("title"))

    print("\nVibeMatch AI Agent completed")

    return {
        "movies": movies[:MAX_MOVIES],
        "recommendation": recommendation
    }


# Step 8: VibeBuddy Natural Conversation
def vibebuddy_chat(user_message, history=None):

    message = user_message.strip()

    if not message:
        return {
            "reply": "Tell me what's on your mind. I'm listening. 💜",
            "movies": []
        }

    # Detect actual movie recommendation requests.
    movie_intent = re.search(
        r"\b(recommend|suggest|find me|search for|"
        r"what should i watch|want to watch|"
        r"something to watch|movie recommendation|"
        r"movies like|similar movies)\b",
        message.lower()
    )

    # Movie recommendations use the existing movie agent.
    if movie_intent:

        result = movie_agent(message)

        return {
            "reply": result.get(
                "recommendation",
                "I couldn't find a suitable movie. Try another preference."
            ),
            "movies": result.get("movies", [])
        }

    # Check Gemini connection.
    if not client:
        return {
            "reply": (
                "My AI connection isn't set up right now. "
                "Please check the Gemini API key in your backend. 💜"
            ),
            "movies": []
        }

    # Prepare previous conversation.
    conversation = ""

    for item in (history or [])[-10:]:

        role = (
            "User"
            if item.get("from") == "user"
            else "VibeBuddy"
        )

        old_message = str(
            item.get("text", "")
        ).strip()

        if old_message:
            conversation += f"{role}: {old_message}\n"

    prompt = f"""
You are VibeBuddy, a friendly and caring AI companion
inside the VibeMatch AI movie website.

Your personality:
- Talk naturally like a real chatbot.
- Be friendly, warm, supportive and understanding.
- Understand the user's feelings and emotions.
- If someone feels sad, stressed, lonely or tired,
  respond with empathy.
- Ask gentle follow-up questions when appropriate.
- Do not recommend movies unless the user asks.
- Do not automatically generate TOP PICK.
- Keep replies short and conversational.
- Use simple, natural English.
- Use occasional emojis, but do not overuse them.
- Remember the previous conversation.

Previous conversation:
{conversation}

Latest user message:
{message}

Reply naturally as VibeBuddy.
"""

    try:

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        reply = (
            response.text or ""
        ).strip()

        if not reply:
            reply = (
                "I'm here with you 💜 "
                "Tell me a little more about what's on your mind."
            )

        return {
            "reply": reply,
            "movies": []
        }

    except Exception as e:

        print("VibeBuddy Gemini error:", e)

        return {
            "reply": (
                "I'm having a little trouble connecting right now. "
                "Please try again in a moment. 💜"
            ),
            "movies": []
        }