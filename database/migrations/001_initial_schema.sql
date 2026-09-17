BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Profiles and personalization
-- ============================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    language_code TEXT NOT NULL DEFAULT 'pt-PT',
    search_radius_km NUMERIC(6,2) NOT NULL DEFAULT 25
        CHECK (search_radius_km > 0 AND search_radius_km <= 500),
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES public.interests(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('theme','genre','style','topic','format')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_interests (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
    weight NUMERIC(4,2) NOT NULL DEFAULT 5
        CHECK (weight >= 0 AND weight <= 10),
    source TEXT NOT NULL DEFAULT 'user'
        CHECK (source IN ('user','behavior','system')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, interest_id)
);

-- ============================================================
-- Film catalogue
-- ============================================================

CREATE TABLE public.films (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    original_title TEXT,
    year INTEGER CHECK (year >= 1888 AND year <= 2200),
    duration_minutes INTEGER CHECK (duration_minutes > 0),
    synopsis TEXT,
    poster_url TEXT,
    trailer_url TEXT,
    imdb_id TEXT,
    tmdb_id TEXT,
    canonical_key TEXT,
    source_id UUID,
    source_external_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    birth_date DATE,
    country_code TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.film_people (
    film_id UUID NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    PRIMARY KEY (film_id, person_id, role)
);

CREATE TABLE public.genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
);

CREATE TABLE public.film_genres (
    film_id UUID NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
    PRIMARY KEY (film_id, genre_id)
);

CREATE TABLE public.themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES public.themes(id) ON DELETE SET NULL
);

CREATE TABLE public.film_themes (
    film_id UUID NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
    theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
    weight NUMERIC(4,3) NOT NULL DEFAULT 1
        CHECK (weight >= 0 AND weight <= 1),
    PRIMARY KEY (film_id, theme_id)
);

-- ============================================================
-- Venues
-- ============================================================

CREATE TABLE public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cinema','cultural_center','festival_venue','museum','theatre','other')),
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country_code TEXT NOT NULL DEFAULT 'PT',
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    website TEXT,
    source_id UUID,
    source_external_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Festivals
-- ============================================================

CREATE TABLE public.festivals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    website TEXT,
    country_code TEXT NOT NULL DEFAULT 'PT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.festival_editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    festival_id UUID NOT NULL REFERENCES public.festivals(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year >= 1888 AND year <= 2200),
    start_date DATE,
    end_date DATE,
    website TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (festival_id, year),
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- ============================================================
-- External sources / ingestion provenance
-- ============================================================

CREATE TABLE public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('website','rss','api','ical','csv','manual')),
    country_code TEXT,
    language_code TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    fetch_interval_minutes INTEGER NOT NULL DEFAULT 1440
        CHECK (fetch_interval_minutes >= 60),
    last_fetched_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,
    last_error TEXT,
    parser_key TEXT,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.source_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
    external_id TEXT,
    url TEXT,
    title TEXT,
    content TEXT,
    published_at TIMESTAMPTZ,
    content_hash TEXT,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','processing','processed','failed','ignored')),
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_id, external_id)
);

ALTER TABLE public.films
    ADD CONSTRAINT films_source_fk
    FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

ALTER TABLE public.venues
    ADD CONSTRAINT venues_source_fk
    FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;

-- ============================================================
-- Events and screenings
-- ============================================================

CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('screening','festival','debate','masterclass','exhibition','workshop','other')),
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    film_id UUID REFERENCES public.films(id) ON DELETE SET NULL,
    festival_id UUID REFERENCES public.festivals(id) ON DELETE SET NULL,
    festival_edition_id UUID REFERENCES public.festival_editions(id) ON DELETE SET NULL,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    source_external_id TEXT,
    source_url TEXT,
    canonical_key TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled','cancelled','postponed','completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_at IS NULL OR end_at >= start_at)
);

CREATE TABLE public.screenings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    ticket_url TEXT,
    price NUMERIC(10,2) CHECK (price IS NULL OR price >= 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    language TEXT,
    subtitle_language TEXT,
    format TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_at IS NULL OR end_at >= start_at)
);

-- Supports both single-film and compound cinema sessions.
CREATE TABLE public.screening_films (
    screening_id UUID NOT NULL REFERENCES public.screenings(id) ON DELETE CASCADE,
    film_id UUID NOT NULL REFERENCES public.films(id) ON DELETE RESTRICT,
    position INTEGER NOT NULL CHECK (position > 0),
    PRIMARY KEY (screening_id, film_id),
    UNIQUE (screening_id, position)
);

-- ============================================================
-- Television
-- ============================================================

CREATE TABLE public.tv_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'PT',
    website TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tv_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    film_id UUID REFERENCES public.films(id) ON DELETE SET NULL,
    channel_id UUID NOT NULL REFERENCES public.tv_channels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
    source_external_id TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_at IS NULL OR end_at >= start_at)
);

-- ============================================================
-- User actions and recommendation output
-- ============================================================

CREATE TABLE public.user_favorites (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    film_id UUID NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, film_id)
);

CREATE TABLE public.user_saved_events (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, event_id)
);

CREATE TABLE public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    film_id UUID REFERENCES public.films(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    score NUMERIC(6,5) NOT NULL CHECK (score >= 0 AND score <= 1),
    reason JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    CHECK (film_id IS NOT NULL OR event_id IS NOT NULL)
);

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    film_id UUID REFERENCES public.films(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_interests_interest ON public.user_interests(interest_id);
CREATE INDEX idx_films_canonical_key ON public.films(canonical_key);
CREATE INDEX idx_films_original_title ON public.films(original_title);
CREATE INDEX idx_films_source ON public.films(source_id);
CREATE INDEX idx_films_source_external_id ON public.films(source_id, source_external_id);
CREATE INDEX idx_venues_source ON public.venues(source_id);
CREATE INDEX idx_venues_source_external_id ON public.venues(source_id, source_external_id);
CREATE INDEX idx_festival_editions_period ON public.festival_editions(start_date, end_date);
CREATE INDEX idx_events_start_type ON public.events(start_at, type);
CREATE INDEX idx_events_film_date ON public.events(film_id, start_at);
CREATE INDEX idx_events_venue_date ON public.events(venue_id, start_at);
CREATE INDEX idx_events_festival_edition ON public.events(festival_edition_id);
CREATE INDEX idx_events_canonical_key ON public.events(canonical_key);
CREATE INDEX idx_events_source_external_id ON public.events(source_id, source_external_id);
CREATE INDEX idx_screenings_start_at ON public.screenings(start_at);
CREATE INDEX idx_screening_films_film ON public.screening_films(film_id);
CREATE INDEX idx_tv_programs_start_at ON public.tv_programs(start_at);
CREATE INDEX idx_tv_programs_film_date ON public.tv_programs(film_id, start_at);
CREATE INDEX idx_source_items_status ON public.source_items(status);
CREATE INDEX idx_source_items_source_seen ON public.source_items(source_id, last_seen_at);
CREATE INDEX idx_recommendations_user_expires ON public.recommendations(user_id, expires_at);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.films ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.film_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.film_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.film_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User-owned data
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY user_interests_select_own ON public.user_interests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_interests_insert_own ON public.user_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_interests_update_own ON public.user_interests FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_interests_delete_own ON public.user_interests FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY favorites_all_own ON public.user_favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY saved_events_all_own ON public.user_saved_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY recommendations_select_own ON public.recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public catalogue/event data for authenticated users.
CREATE POLICY interests_read_authenticated ON public.interests FOR SELECT TO authenticated USING (true);
CREATE POLICY films_read_authenticated ON public.films FOR SELECT TO authenticated USING (true);
CREATE POLICY people_read_authenticated ON public.people FOR SELECT TO authenticated USING (true);
CREATE POLICY film_people_read_authenticated ON public.film_people FOR SELECT TO authenticated USING (true);
CREATE POLICY genres_read_authenticated ON public.genres FOR SELECT TO authenticated USING (true);
CREATE POLICY film_genres_read_authenticated ON public.film_genres FOR SELECT TO authenticated USING (true);
CREATE POLICY themes_read_authenticated ON public.themes FOR SELECT TO authenticated USING (true);
CREATE POLICY film_themes_read_authenticated ON public.film_themes FOR SELECT TO authenticated USING (true);
CREATE POLICY venues_read_authenticated ON public.venues FOR SELECT TO authenticated USING (true);
CREATE POLICY festivals_read_authenticated ON public.festivals FOR SELECT TO authenticated USING (true);
CREATE POLICY festival_editions_read_authenticated ON public.festival_editions FOR SELECT TO authenticated USING (true);
CREATE POLICY events_read_authenticated ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY screenings_read_authenticated ON public.screenings FOR SELECT TO authenticated USING (true);
CREATE POLICY screening_films_read_authenticated ON public.screening_films FOR SELECT TO authenticated USING (true);
CREATE POLICY tv_channels_read_authenticated ON public.tv_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY tv_programs_read_authenticated ON public.tv_programs FOR SELECT TO authenticated USING (true);

-- Sources are readable only when active; source_items are ingestion-internal.
CREATE POLICY active_sources_read_authenticated ON public.sources FOR SELECT TO authenticated USING (active = true);

COMMIT;
