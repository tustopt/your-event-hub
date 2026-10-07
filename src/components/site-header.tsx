import { Search, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";

type SiteHeaderProps = {
  search?: boolean;
};

export function SiteHeader({ search = false }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="docradar — início">
          <span className="brand__main">doc</span><span className="brand__muted">radar</span>
        </Link>

        <nav className="site-nav" aria-label="Navegação principal">
          <Link to="/explorar">Filmes</Link>
          <Link to="/explorar">Agenda</Link>
          <a href="/#fontes">Fontes</a>
        </nav>

        {search && (
          <Link to="/explorar" className="header-search">
            <Search className="size-4" />
            <span>Pesquisar</span>
          </Link>
        )}

        <div className="site-header__actions">
          <Link to="/login" className="header-icon" aria-label="Perfil">
            <UserRound className="size-4" />
          </Link>
          <Link to="/login" className="header-login">Entrar</Link>
        </div>
      </div>
    </header>
  );
}
