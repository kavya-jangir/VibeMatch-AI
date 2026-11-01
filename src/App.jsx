import { useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { getMovie, movies } from './data/movies';

const moods = [
  '😊 Happy',
  '😌 Relaxed',
  '😂 Fun',
  '❤️ Romantic',
  '🥹 Emotional',
  '🌿 Peaceful',
  '🔥 Excited',
  '🧠 Thoughtful',
  '🌙 Cozy',
  '😴 Tired',
];

const times = [
  '⏱️ Under 1 hour',
  '🍿 1–2 hours',
  '🌙 2+ hours',
  '✨ No time limit',
];

const watches = [
  '🎬 Movie',
  '📺 Series',
  '😂 Comedy',
  '❤️ Romance',
  '😱 Thriller',
  '✨ Feel-good',
  '🧠 Thought-provoking',
  '🌸 Comfort watch',
];

const languages = [
  'Hindi',
  'English',
  'Korean',
  'Punjabi',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Any',
];

const genres = [
  'Romance',
  'Comedy',
  'Drama',
  'Thriller',
  'Action',
  'Sci-Fi',
  'Animation',
  'Any',
];

const cleanChoice = (choice) => choice?.replace(/^\S+\s/, '');

const API_URL = 'http://127.0.0.1:8000/api/movies/recommend';
const CHAT_API_URL = 'http://127.0.0.1:8000/api/chat';
const POSTER_API_URL = 'http://127.0.0.1:8000/api/movies/posters';

/* OMDb POSTER HELPER */

async function fetchMoviePosters(movieList) {
  if (!movieList?.length) return movieList;

  try {
    const response = await fetch(POSTER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movies: movieList.map((movie) => ({
          id: String(movie.id),
          title: movie.title,
          year: Number(movie.year) || null,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Poster API error: ${response.status}`);
    }

    const data = await response.json();
    const posterMap = {};

    data.forEach((item) => {
      posterMap[String(item.id)] = item.poster;
    });

    return movieList.map((movie) => {
      const omdbPoster = posterMap[String(movie.id)];

      return {
        ...movie,
        poster:
          typeof omdbPoster === 'string' && /^https?:\/\//i.test(omdbPoster)
            ? omdbPoster
            : movie.poster || '',
      };
    });
  } catch (error) {
    console.error('Poster loading error:', error);
    return movieList;
  }
}

/* WATCHLIST */

function useWatchlist() {
  const [savedMovies, setSavedMovies] = useState(() => {
    const stored = JSON.parse(
      localStorage.getItem('vibewatch-saved-movies') || 'null',
    );

    if (Array.isArray(stored)) return stored;

    const oldIds = JSON.parse(
      localStorage.getItem('vibewatch-watchlist') || '[]',
    );

    return movies.filter((movie) => oldIds.includes(movie.id));
  });

  useEffect(() => {
    localStorage.setItem('vibewatch-saved-movies', JSON.stringify(savedMovies));
    localStorage.setItem(
      'vibewatch-watchlist',
      JSON.stringify(savedMovies.map((movie) => movie.id)),
    );
  }, [savedMovies]);

  const savedIds = savedMovies.map((movie) => movie.id);

  const toggleSaved = (movie) => {
    setSavedMovies((current) =>
      current.some((item) => item.id === movie.id)
        ? current.filter((item) => item.id !== movie.id)
        : [...current, movie],
    );
  };

  return { savedIds, savedMovies, toggleSaved };
}

/* NAVBAR AND FOOTER */

function Navbar() {
  return (
    <header className="navbar">
      <Link className="brand" to="/">
        VibeWatch <span>AI ✨</span>
      </Link>

      <nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/discover">Discover</NavLink>
        <NavLink to="/watchlist">Watchlist</NavLink>
      </nav>

      <div className="nav-actions">
        <button
          className="buddy-link"
          onClick={() => window.dispatchEvent(new Event('open-buddy'))}>
          ✨ VibeBuddy
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer>
      <div className="brand">
        VibeWatch <span>AI ✨</span>
      </div>
      <p>Your friendly movie buddy, here to make choosing easy.</p>
      <small>Made for cozy nights and curious hearts.</small>
    </footer>
  );
}

/* COMMON COMPONENTS */

function ChoiceButton({ label, selected, onClick, multiple = false }) {
  return (
    <button
      className={`choice ${selected ? 'selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}>
      <span>{label}</span>
      {selected && <b>{multiple ? '✓' : '•'}</b>}
    </button>
  );
}

function MoodSelector({ selected, setSelected }) {
  return (
    <section className="question">
      <div className="question-title">
        <span>01</span>
        <div>
          <p>How are you feeling today?</p>
          <small>Pick one or a few. There are no wrong vibes.</small>
        </div>
      </div>

      <div className="choices">
        {moods.map((mood) => (
          <ChoiceButton
            key={mood}
            label={mood}
            selected={selected.includes(cleanChoice(mood))}
            multiple
            onClick={() =>
              setSelected((current) =>
                current.includes(cleanChoice(mood))
                  ? current.filter((item) => item !== cleanChoice(mood))
                  : [...current, cleanChoice(mood)],
              )
            }
          />
        ))}
      </div>
    </section>
  );
}

function TimeSelector({ selected, setSelected }) {
  return (
    <section className="question">
      <div className="question-title">
        <span>02</span>
        <div>
          <p>How much time do you have?</p>
          <small>We’ll find something that fits your evening.</small>
        </div>
      </div>

      <div className="choices time-choices">
        {times.map((time) => (
          <ChoiceButton
            key={time}
            label={time}
            selected={selected === cleanChoice(time)}
            onClick={() => setSelected(cleanChoice(time))}
          />
        ))}
      </div>
    </section>
  );
}

function PreferenceSelector({ selected, setSelected }) {
  const update = (value) => {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  return (
    <section className="question">
      <div className="question-title">
        <span>03</span>
        <div>
          <p>What do you want to watch?</p>
          <small>Tell us what sounds good right now.</small>
        </div>
      </div>

      <div className="choices">
        {watches.map((watch) => (
          <ChoiceButton
            key={watch}
            label={watch}
            selected={selected.includes(cleanChoice(watch))}
            multiple
            onClick={() => update(cleanChoice(watch))}
          />
        ))}
      </div>
    </section>
  );
}

function MorePreferences({ preferences, setPreferences }) {
  const [open, setOpen] = useState(false);

  const set = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className={`more-preferences ${open ? 'open' : ''}`}>
      <button className="more-trigger" onClick={() => setOpen(!open)}>
        <span>{open ? '−' : '+'} More preferences</span>
        <small>Optional</small>
      </button>

      {open && (
        <div className="preference-grid">
          <label>
            Language
            <select
              value={preferences.language}
              onChange={(event) => set('language', event.target.value)}>
              {languages.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Genre
            <select
              value={preferences.genre}
              onChange={(event) => set('genre', event.target.value)}>
              {genres.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Rating
            <select
              value={preferences.rating}
              onChange={(event) => set('rating', event.target.value)}>
              <option>Any</option>
              <option>7+</option>
              <option>8+</option>
            </select>
          </label>
        </div>
      )}
    </section>
  );
}

function WatchlistButton({ saved, onClick }) {
  return (
    <button
      className={`save-button ${saved ? 'saved' : ''}`}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      aria-label={saved ? 'Remove from watchlist' : 'Save to watchlist'}>
      {saved ? '♥' : '♡'}
      <span>{saved ? 'Saved' : 'Save'}</span>
    </button>
  );
}

/* STREAMING HELPERS - DUPLICATE FIX */

function getUniqueSources(sources = []) {
  const unique = new Map();

  sources
    .filter((source) => source?.name)
    .forEach((source) => {
      const key = source.name.trim().toLowerCase();
      const existing = unique.get(key);

      if (!existing || (!existing.web_url && source.web_url)) {
        unique.set(key, source);
      }
    });

  return [...unique.values()];
}

function getPlatformNames(sources = []) {
  return getUniqueSources(sources).map((source) => source.name);
}

/* MOVIE CARD */

function MovieCard({ movie, savedIds, toggleSaved, compact = false }) {
  const sources = movie.sources || [];

  const platforms = movie.sources
    ? getPlatformNames(sources)
    : movie.streamingPlatforms || [];

  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => {
    setPosterFailed(false);
  }, [movie.poster]);

  return (
    <article className={`movie-card ${compact ? 'compact' : ''}`}>
      <Link to={`/movie/${movie.id}`} state={{ movie }} className="poster-wrap">
        {movie.poster && !posterFailed ? (
          <img
            src={movie.poster}
            alt={`${movie.title} poster`}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onError={() => setPosterFailed(true)}
          />
        ) : (
          <div className="poster-placeholder">
            <span>✦</span>
            <small>{movie.title}</small>
          </div>
        )}

        <span className="type-pill">{movie.type || 'Movie'}</span>
      </Link>

      <div className="movie-card-body">
        <div className="movie-card-heading">
          <Link to={`/movie/${movie.id}`} state={{ movie }}>
            <h3>{movie.title}</h3>
          </Link>

          <WatchlistButton
            saved={savedIds.includes(movie.id)}
            onClick={() => toggleSaved(movie)}
          />
        </div>

        <p>
          {(movie.genres || []).slice(0, 2).join(' · ') ||
            'Genre not available'}
          <span>•</span> {movie.year || 'Year unavailable'}
        </p>

        <div className="rating">
          <span>★</span> {movie.rating || '—'}
          <em>·</em> {movie.runtime || 'Runtime unavailable'}
        </div>

        {!compact && movie.moods?.length > 0 && (
          <div className="tags">
            {movie.moods.slice(0, 2).map((mood) => (
              <span key={mood}>{mood}</span>
            ))}
          </div>
        )}

        <div className="streaming">
          <b>Watch on</b>

          {platforms.length ? (
            platforms
              .slice(0, 3)
              .map((platform) => <span key={platform}>{platform}</span>)
          ) : (
            <span>Availability not found in India</span>
          )}
        </div>

        {getUniqueSources(sources).some((source) => source.web_url) && (
          <div className="streaming-links">
            {getUniqueSources(sources)
              .filter((source) => source.web_url)
              .map((source) => (
                <a
                  key={source.name}
                  href={source.web_url}
                  target="_blank"
                  rel="noreferrer">
                  Open {source.name} ↗
                </a>
              ))}
          </div>
        )}
      </div>
    </article>
  );
}

function StreamingDetails({ movie }) {
  const sources = movie.sources || [];

  const platforms = movie.sources
    ? getPlatformNames(sources)
    : movie.streamingPlatforms || [];

  return (
    <div className="streaming">
      <b>Watch on</b>

      {platforms.length ? (
        platforms.map((platform) => <span key={platform}>{platform}</span>)
      ) : (
        <span>No streaming availability found in India</span>
      )}

      {getUniqueSources(sources)
        .filter((source) => source.web_url)
        .map((source) => (
          <a
            key={source.name}
            href={source.web_url}
            target="_blank"
            rel="noreferrer">
            Open {source.name} ↗
          </a>
        ))}
    </div>
  );
}

/* LOADING AND EMPTY STATES */

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-orbit">
        <span>✦</span>
      </div>
      <p>Finding something that matches your vibe...</p>
      <small>
        Gemini is understanding your vibe and searching the movies ✨
      </small>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <span>✦</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

/* LOCAL FALLBACK */

function recommendationFor({ mood, time, chosenWatches, preferences }) {
  let results = movies.filter((movie) => {
    const moodMatch =
      !mood.length || movie.moods.some((item) => mood.includes(item));

    const type = chosenWatches.find((item) =>
      ['Movie', 'Series'].includes(item),
    );

    const typeMatch = !type || movie.type === type;

    const genreMatch =
      preferences.genre === 'Any' || movie.genres.includes(preferences.genre);

    const languageMatch =
      preferences.language === 'Any' || movie.language === preferences.language;

    const ratingMatch =
      preferences.rating === 'Any' ||
      movie.rating >= Number(preferences.rating.replace('+', ''));

    const timeMatch =
      time === 'Under 1 hour'
        ? parseInt(movie.runtime) < 1
        : time !== '1–2 hours' ||
          (parseInt(movie.runtime) <= 2 && movie.type === 'Movie');

    return (
      moodMatch &&
      typeMatch &&
      genreMatch &&
      languageMatch &&
      ratingMatch &&
      timeMatch
    );
  });

  if (results.length < 3) {
    results = [
      ...results,
      ...movies
        .filter((movie) => !results.includes(movie))
        .sort((a, b) => b.rating - a.rating),
    ];
  }

  return results.slice(0, 4);
}

function vibeMessage(mood, time) {
  if (time === 'Under 1 hour' || time === '1–2 hours') {
    return 'Short on time? I found watches that fit right into your evening.';
  }

  if (
    mood.includes('Relaxed') ||
    mood.includes('Peaceful') ||
    mood.includes('Cozy')
  ) {
    return 'You’re looking for something calm and easy tonight. Here are a few cozy picks.';
  }

  if (mood.includes('Happy') || mood.includes('Fun')) {
    return 'You’re already in a good mood — let’s keep it going! ✨';
  }

  if (mood.includes('Emotional')) {
    return 'Sometimes you just need a movie that understands the feeling. 💜';
  }

  return 'A few lovely picks for the vibe you’re carrying today.';
}

/* HOME PAGE */

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Your friendly movie buddy
            </div>

            <h1>
              What’s your <i>vibe</i> today?
            </h1>

            <p>
              Tell me how you’re feeling and how much time you have. I’ll find
              something perfect to watch.
            </p>

            <button
              className="primary-button"
              onClick={() => navigate('/vibe')}>
              Find My Watch <span>✦</span>
            </button>
          </div>

          <div className="hero-art">
            <div className="sparkle sparkle-one">✦</div>
            <div className="sparkle sparkle-two">✧</div>
            <div className="sun-disc" />

            <div className="hero-ticket">
              <span>Tonight’s plan</span>
              <strong>
                Something
                <br />
                <i>lovely.</i>
              </strong>
              <small>⌁ curated just for you</small>
            </div>

            <div className="hero-sticker">
              ✦
              <br />
              <small>
                good vibes
                <br />
                only
              </small>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

/* VIBE PAGE - PYTHON + GEMINI */

function VibePage({ savedIds, toggleSaved }) {
  const navigate = useNavigate();

  const [mood, setMood] = useState([]);
  const [time, setTime] = useState('');
  const [chosenWatches, setChosenWatches] = useState([]);

  const [preferences, setPreferences] = useState({
    language: 'Any',
    genre: 'Any',
    rating: 'Any',
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [aiRecommendation, setAiRecommendation] = useState('');

  const nextStep = () => {
    if (step === 1 && !mood.length) return;
    if (step === 2 && !time) return;

    if (step < 3) {
      setStep(step + 1);
    } else {
      findMovies();
    }
  };

  const previousStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const findMovies = async () => {
    setLoading(true);
    setStep(4);
    setAiRecommendation('');
    setRecommendations([]);

    const message = `
I am feeling ${mood.join(' and ') || 'any mood'}.
I have ${time || 'no time limit'}.
I want to watch ${chosenWatches.join(', ') || 'something good'}.
My preferred language is ${preferences.language}.
My preferred genre is ${preferences.genre}.
My minimum rating preference is ${preferences.rating}.
`;

    try {
      console.log('Sending to VibeMatch AI:', message);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      console.log('VibeMatch AI response:', data);

      const recommendation = data.recommendation || '';
      setAiRecommendation(recommendation);

      const aiMovies = (data.movies || []).map((backendMovie) => {
        const localMovie = movies.find(
          (item) =>
            item.title?.toLowerCase() === backendMovie.title?.toLowerCase(),
        );

        return {
          ...(localMovie || {}),
          id:
            localMovie?.id ||
            `watchmode-${backendMovie.id || backendMovie.title}`,
          title: backendMovie.title || localMovie?.title,
          year: backendMovie.year || localMovie?.year,
          type: backendMovie.type || localMovie?.type || 'Movie',
          poster: backendMovie.poster || localMovie?.poster || '',
          sources: backendMovie.sources || [],
          genres: backendMovie.genres?.length
            ? backendMovie.genres
            : localMovie?.genres || [],
          moods: localMovie?.moods || [],
          rating: backendMovie.rating || localMovie?.rating || '',
          runtime: backendMovie.runtime || localMovie?.runtime || '',
          language:
            backendMovie.language ||
            localMovie?.language ||
            preferences.language,
          description: localMovie?.description || '',
          director: localMovie?.director || '',
          cast: localMovie?.cast || [],
          streamingPlatforms: localMovie?.streamingPlatforms || [],
        };
      });

      const topPickMatch = recommendation.match(
        /TOP PICK:\s*["'*]*([^"\n*]+)/i,
      );

      const topPick = topPickMatch?.[1]?.trim();

      if (topPick) {
        const selectedIndex = aiMovies.findIndex(
          (movie) => movie.title?.toLowerCase() === topPick.toLowerCase(),
        );

        if (selectedIndex > 0) {
          const selectedMovie = aiMovies[selectedIndex];
          aiMovies.splice(selectedIndex, 1);
          aiMovies.unshift(selectedMovie);
        }
      }

      const moviesWithPosters = await fetchMoviePosters(aiMovies.slice(0, 4));

      setRecommendations(moviesWithPosters);
    } catch (error) {
      console.error('Backend error:', error);

      const result = recommendationFor({
        mood,
        time,
        chosenWatches,
        preferences,
      });

      const moviesWithPosters = await fetchMoviePosters(result);
      setRecommendations(moviesWithPosters);

      setAiRecommendation(
        'I could not connect to the AI right now, so I showed some local recommendations instead. ✨',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="vibe-page">
        {step < 4 && (
          <>
            <div className="page-header">
              <span className="kicker">A tiny conversation</span>
              <h1>Your Vibe Knows What to Watch</h1>
              <p>
                Tell me a little about tonight, and I’ll do the browsing for
                you.
              </p>
            </div>

            <div className="vibe-progress">
              <span className={step >= 1 ? 'active' : ''}>1</span>
              <div />
              <span className={step >= 2 ? 'active' : ''}>2</span>
              <div />
              <span className={step >= 3 ? 'active' : ''}>3</span>
            </div>

            <div className="vibe-card">
              {step === 1 && (
                <MoodSelector selected={mood} setSelected={setMood} />
              )}

              {step === 2 && (
                <TimeSelector selected={time} setSelected={setTime} />
              )}

              {step === 3 && (
                <>
                  <PreferenceSelector
                    selected={chosenWatches}
                    setSelected={setChosenWatches}
                  />
                  <MorePreferences
                    preferences={preferences}
                    setPreferences={setPreferences}
                  />
                </>
              )}

              <div className="vibe-navigation">
                {step > 1 && (
                  <button className="text-button" onClick={previousStep}>
                    ← Back
                  </button>
                )}

                <button className="find-button" onClick={nextStep}>
                  {step === 3 ? 'Find My Perfect Watch' : 'Next'}
                  <span>✨</span>
                </button>
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            {loading ? (
              <LoadingState />
            ) : (
              <section className="recommendations">
                <div className="section-heading">
                  <span className="kicker">Curated by VibeMatch AI</span>
                  <h2>
                    Your vibe, your watch <span>✦</span>
                  </h2>
                  <p>{vibeMessage(mood, time)}</p>
                </div>

                {aiRecommendation && (
                  <div className="mock-answer">
                    <span>✨</span>
                    <p>{aiRecommendation}</p>
                  </div>
                )}

                {recommendations.length ? (
                  <div className="recommendation-grid">
                    {recommendations.map((movie, index) => (
                      <div className="recommendation-item" key={movie.id}>
                        <MovieCard
                          movie={movie}
                          savedIds={savedIds}
                          toggleSaved={toggleSaved}
                        />

                        <div className="why-picked">
                          <span>✦</span>
                          <div>
                            <strong>Why we picked this</strong>
                            <p>
                              {index === 0
                                ? aiRecommendation ||
                                  `You wanted something ${mood[0]?.toLowerCase() || 'just right'} and this has a warm, memorable vibe.`
                                : 'A lovely match for your mood, with plenty of heart and a little something extra.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No exact match found"
                    text="Try changing your mood or preferences and let VibeMatch AI search again."
                  />
                )}

                <div className="vibe-result-actions">
                  <button className="text-button" onClick={() => setStep(1)}>
                    ← Try another vibe
                  </button>

                  <button
                    className="text-button"
                    onClick={() => navigate('/discover')}>
                    Explore more picks →
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </>
  );
}

/* PAGE HEADER */

function PageHeader({ eyebrow, title, text }) {
  return (
    <div className="page-header">
      <span className="kicker">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}

/* DISCOVER PAGE - OMDb POSTERS */

function Discover({ savedIds, toggleSaved }) {
  const [posterMovies, setPosterMovies] = useState(movies);
  const [posterLoading, setPosterLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPosters = async () => {
      try {
        const updatedMovies = await fetchMoviePosters(movies);

        if (!cancelled) {
          setPosterMovies(updatedMovies);
        }
      } catch (error) {
        console.error('Discover poster error:', error);
      } finally {
        if (!cancelled) {
          setPosterLoading(false);
        }
      }
    };

    loadPosters();

    return () => {
      cancelled = true;
    };
  }, []);

  const getByLanguage = (languageList) =>
    posterMovies.filter((movie) => languageList.includes(movie.language));

  const trending = posterMovies
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  const sections = [
    { title: '🔥 Trending Now', items: trending },
    { title: '🇮🇳 Bollywood', items: getByLanguage(['Hindi']) },
    { title: '🇺🇸 Hollywood', items: getByLanguage(['English']) },
    { title: '🇰🇷 Korean', items: getByLanguage(['Korean']) },
    { title: '🪕 Punjabi', items: getByLanguage(['Punjabi']) },
    {
      title: '🌴 South Indian',
      items: getByLanguage(['Tamil', 'Telugu', 'Malayalam', 'Kannada']),
    },
    {
      title: '🇯🇵 Japanese / Anime',
      items: getByLanguage(['Japanese']),
    },
    {
      title: '✨ Feel-Good Picks',
      items: posterMovies.filter((movie) =>
        (movie.moods || []).includes('Feel-good'),
      ),
    },
  ];

  return (
    <>
      <main className="inner-page">
        <PageHeader
          eyebrow="A little something for everyone"
          title="Discover your next favorite"
          text="Browse movies and series by language, region and vibe."
        />

        {posterLoading && (
          <p className="poster-loading">✨ Loading movie posters...</p>
        )}

        {sections.map((section) => {
          if (!section.items.length) return null;

          return (
            <section className="collection" key={section.title}>
              <div className="collection-title">
                <h2>{section.title}</h2>
                <span>{section.items.length} watches</span>
              </div>

              <div className="compact-grid">
                {section.items.map((movie) => (
                  <MovieCard
                    compact
                    key={movie.id}
                    movie={movie}
                    savedIds={savedIds}
                    toggleSaved={toggleSaved}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <Footer />
    </>
  );
}

/* WATCHLIST PAGE */

function Watchlist({ savedMovies, savedIds, toggleSaved }) {
  return (
    <>
      <main className="inner-page watchlist-page">
        <PageHeader
          eyebrow="Your little shelf"
          title="Your Watchlist"
          text="Save anything that feels like your kind of watch. It’ll be here when you’re ready."
        />

        {savedMovies.length ? (
          <div className="watchlist-grid">
            {savedMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                savedIds={savedIds}
                toggleSaved={toggleSaved}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your watchlist is waiting for its first vibe ✨"
            text="Save anything that feels like your kind of watch."
          />
        )}
      </main>

      <Footer />
    </>
  );
}

/* SEARCH PAGE */

function SearchPage({ savedIds, toggleSaved }) {
  const [query, setQuery] = useState('');

  const result = movies.filter((movie) =>
    movie.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <main className="inner-page search-page">
        <PageHeader
          eyebrow="Find your next thing"
          title="Search the good stuff"
          text="Search by title and see where the mood takes you."
        />

        <div className="large-search">
          <span>⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try a title, like About Time..."
          />
          <kbd>ESC</kbd>
        </div>

        {query && (
          <p className="result-count">
            {result.length} {result.length === 1 ? 'watch' : 'watches'} found
          </p>
        )}

        {result.length ? (
          <div className="watchlist-grid">
            {result.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                savedIds={savedIds}
                toggleSaved={toggleSaved}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No movies found"
            text="Try another title or take a little browse through Discover."
          />
        )}
      </main>

      <Footer />
    </>
  );
}

/* MOVIE DETAILS */

function MovieDetails({ savedIds, savedMovies, toggleSaved }) {
  const { id } = useParams();
  const location = useLocation();

  const movie =
    location.state?.movie ||
    savedMovies.find((item) => String(item.id) === String(id)) ||
    getMovie(id);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [posterFailed, setPosterFailed] = useState(false);

  useEffect(() => {
    setPosterFailed(false);
  }, [movie?.poster]);

  if (!movie) {
    return (
      <EmptyState
        title="That watch wandered off"
        text="Try another movie from Discover."
      />
    );
  }

  const ask = (text) => {
    if (!text.trim()) return;

    setQuestion(text);

    setAnswer(
      text.toLowerCase().includes('happy')
        ? 'It has a hopeful ending that should leave you feeling lighter.'
        : text.toLowerCase().includes('scary')
          ? 'It has suspense, but it is more clever than scary.'
          : text.toLowerCase().includes('family')
            ? 'It is a lovely choice for a grown-up family movie night.'
            : text.toLowerCase().includes('similar')
              ? 'Try Past Lives or Little Women next for another thoughtful, tender watch.'
              : 'There is just enough romance to keep things warm without taking over the story.',
    );
  };

  return (
    <>
      <main className="details-page">
        <div className="details-back">
          <Link to="/">← Back to your vibe</Link>
        </div>

        <section className="details-hero">
          <div className="details-poster">
            {movie.poster && !posterFailed ? (
              <img
                src={movie.poster}
                alt={`${movie.title} poster`}
                loading="lazy"
                decoding="async"
                onError={() => setPosterFailed(true)}
              />
            ) : (
              <div className="poster-placeholder">
                <span>✦</span>
                <small>{movie.title}</small>
              </div>
            )}
          </div>

          <div className="details-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              {movie.type || 'Movie'} · {movie.year || 'Year unavailable'}
            </div>

            <h1>{movie.title}</h1>

            <div className="details-meta">
              <span>★ {movie.rating || '—'}</span>
              <span>{movie.runtime || 'Runtime unavailable'}</span>
              <span>{movie.language || 'Language unavailable'}</span>
            </div>

            <div className="tags">
              {(movie.moods || []).map((mood) => (
                <span key={mood}>{mood}</span>
              ))}
            </div>

            <p className="overview">
              {movie.description || 'Movie details are not available yet.'}
            </p>

            <div className="credit-line">
              <span>
                <b>Director</b>
                {movie.director || 'Not available'}
              </span>

              <span>
                <b>Cast</b>
                {(movie.cast || []).join(', ') || 'Not available'}
              </span>
            </div>

            <StreamingDetails movie={movie} />

            <WatchlistButton
              saved={savedIds.includes(movie.id)}
              onClick={() => toggleSaved(movie)}
            />
          </div>
        </section>

        <section className="ask-vibe">
          <div>
            <span className="kicker">Curious?</span>
            <h2>
              Ask VibeWatch <span>✦</span>
            </h2>
            <p>A tiny movie buddy in your pocket.</p>
          </div>

          <div className="quick-questions">
            {[
              'Does it have a happy ending?',
              'Is it family friendly?',
              'Is it scary?',
              'How much romance is there?',
              'What should I watch next?',
              'Suggest something similar.',
            ].map((item) => (
              <button key={item} onClick={() => ask(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="ask-input">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask me anything about this movie..."
              onKeyDown={(event) => event.key === 'Enter' && ask(question)}
            />
            <button onClick={() => ask(question)}>→</button>
          </div>

          {answer && (
            <div className="mock-answer">
              <span>✨</span>
              <p>{answer}</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}

/* VIBEBUDDY - GEMINI AI CHAT */

function VibeBuddy() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      from: 'buddy',
      text: 'Hey! What are you in the mood for today? 💜',
    },
  ]);

  useEffect(() => {
    const openBuddy = () => setOpen(true);

    window.addEventListener('open-buddy', openBuddy);

    return () => {
      window.removeEventListener('open-buddy', openBuddy);
    };
  }, []);

  const send = async () => {
    if (!input.trim() || loading) return;

    const text = input.trim();
    const previousMessages = messages;

    setMessages((current) => [...current, { from: 'user', text }]);

    setInput('');
    setLoading(true);

    try {
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: previousMessages.slice(-10),
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      const data = await response.json();

      const reply =
        data.reply || "I'm here with you! Tell me a little more. 💜";

      let movieText = '';

      if (data.movies?.length) {
        movieText =
          '\n\n✨ Here are some movies you might like:\n\n' +
          data.movies
            .map((movie, index) => {
              const year = movie.year ? ` (${movie.year})` : '';
              return `${index + 1}. ${movie.title}${year}`;
            })
            .join('\n');
      }

      setMessages((current) => [
        ...current,
        {
          from: 'buddy',
          text: reply + movieText,
        },
      ]);
    } catch (error) {
      console.error('VibeBuddy error:', error);

      setMessages((current) => [
        ...current,
        {
          from: 'buddy',
          text: 'Sorry, I am having trouble connecting right now. Please check if the Python backend is running. 💜',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="buddy">
      <button className="buddy-fab" onClick={() => setOpen(!open)}>
        ✨ VibeBuddy
      </button>

      {open && (
        <div className="buddy-window">
          <div className="buddy-head">
            <span className="buddy-avatar">✦</span>

            <div>
              <strong>VibeBuddy</strong>
              <small>Powered by VibeMatch AI</small>
            </div>

            <button onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                className={`chat-bubble ${message.from}`}
                key={`${index}-${message.text}`}>
                {message.text}
              </div>
            ))}

            {loading && (
              <div className="chat-bubble buddy">
                Thinking about your vibe... ✨
              </div>
            )}
          </div>

          <div className="chat-input">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && send()}
              placeholder="Tell me your vibe..."
              disabled={loading}
            />

            <button onClick={send} disabled={loading || !input.trim()}>
              {loading ? '...' : '↑'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* MAIN APP */

function App() {
  const { savedIds, savedMovies, toggleSaved } = useWatchlist();
  const location = useLocation();

  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/vibe"
          element={<VibePage savedIds={savedIds} toggleSaved={toggleSaved} />}
        />

        <Route
          path="/discover"
          element={<Discover savedIds={savedIds} toggleSaved={toggleSaved} />}
        />

        <Route
          path="/watchlist"
          element={
            <Watchlist
              savedMovies={savedMovies}
              savedIds={savedIds}
              toggleSaved={toggleSaved}
            />
          }
        />

        <Route
          path="/search"
          element={<SearchPage savedIds={savedIds} toggleSaved={toggleSaved} />}
        />

        <Route
          path="/movie/:id"
          element={
            <MovieDetails
              savedIds={savedIds}
              savedMovies={savedMovies}
              toggleSaved={toggleSaved}
            />
          }
        />

        <Route path="*" element={<Home />} />
      </Routes>

      {location.pathname !== '/search' && <VibeBuddy />}
    </>
  );
}

export default App;
