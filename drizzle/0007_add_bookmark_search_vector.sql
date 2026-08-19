-- IMMUTABLE wrapper: to_tsvector('english', text) is STABLE (regconfig lookup), which
-- Postgres rejects inside a GENERATED ALWAYS AS STORED expression. Pinning the config
-- inside a SQL function marked IMMUTABLE is the standard workaround.
CREATE FUNCTION bookmark_search_vector_immutable(title text, archived_text text)
RETURNS tsvector
LANGUAGE sql IMMUTABLE
AS $$
  SELECT
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(archived_text, '')), 'B')
$$;

ALTER TABLE "bookmarks" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (bookmark_search_vector_immutable(title, archived_text)) STORED;

CREATE INDEX "bookmark_search_vector_idx" ON "bookmarks" USING GIN ("search_vector");

-- Rollback (run by hand if this needs to be undone):
-- DROP INDEX "bookmark_search_vector_idx";
-- ALTER TABLE "bookmarks" DROP COLUMN "search_vector";
-- DROP FUNCTION bookmark_search_vector_immutable(text, text);
