import { CalendarDays, Clapperboard, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";

type FilmCardProps = {
  id: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  screening?: {
    startAt: string;
    venueName?: string | null;
    city?: string | null;
  };
};

export function FilmCard({ id, title, year, posterUrl, screening }: FilmCardProps) {
  return (
    <Link
      to="/filmes/$id"
      params={{ id }}
      className="film-card group"
    >
      <div className="film-card__poster">
        {posterUrl ? (
          <img src={posterUrl} alt="" loading="lazy" />
        ) : (
          <div className="film-card__placeholder">
            <Clapperboard className="size-8" />
            <span>Imagem indisponível</span>
          </div>
        )}
        {screening && <span className="film-card__badge">Em exibição</span>}
      </div>

      <div className="film-card__body">
        <h3>{title}</h3>
        {year && <p className="film-card__year">{year}</p>}
        {screening && (
          <div className="film-card__screening">
            <div><CalendarDays className="size-3.5" />{new Date(screening.startAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}</div>
            {screening.venueName && (
              <div><MapPin className="size-3.5" />{screening.venueName}{screening.city ? ` · ${screening.city}` : ""}</div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
