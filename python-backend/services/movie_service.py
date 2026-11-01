from database import get_connection


def search_movies(
    moods,
    time="No time limit",
    movie_type="",
    language="Any",
    genre="Any",
    rating="Any"
):
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    query = "SELECT * FROM movies WHERE 1=1"
    values = []

    # Mood filter
    if moods:
        placeholders = ", ".join(["%s"] * len(moods))
        query += f" AND mood IN ({placeholders})"
        values.extend(moods)

    # Type filter
    if movie_type and movie_type != "Any":
        query += " AND type = %s"
        values.append(movie_type)

    # Language filter
    if language != "Any":
        query += " AND language = %s"
        values.append(language)

    # Genre filter
    if genre != "Any":
        query += " AND genre = %s"
        values.append(genre)

    # Rating filter
    if rating != "Any":
        minimum_rating = float(rating.replace("+", ""))
        query += " AND rating >= %s"
        values.append(minimum_rating)

    # Time filter
    if time == "Under 1 hour":
        query += " AND runtime < 60"

    elif time == "1–2 hours":
        query += " AND runtime BETWEEN 60 AND 120"

    elif time == "2+ hours":
        query += " AND runtime > 120"

    cursor.execute(query, values)

    movies = cursor.fetchall()

    cursor.close()
    connection.close()

    return movies