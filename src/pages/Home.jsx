import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Clock3,
  Database,
  ListMusic,
  Play,
  Radio,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { TRACKS, usePlayer } from '../PlayerContext';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import TrackCard from '../components/TrackCard';
import TrackRow from '../components/TrackRow';
import styles from './Home.module.css';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Nuit blanche,';
  if (h < 12) return 'Bonjour,';
  if (h < 18) return 'Bon apres-midi,';
  return 'Bonsoir,';
}

export default function Home() {
  const { play, currentTrack } = usePlayer();
  const { currentUser, isAuthenticated } = useAuth();
  const { settings } = useSiteSettings();
  const [history, setHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [discovery, setDiscovery] = useState({ hot: [], editors: [] });

  useEffect(() => {
    api
      .discover({ limit: 8 })
      .then(setDiscovery)
      .catch(() => {});
  }, [currentTrack.youtubeId]);

  useEffect(() => {
    if (!isAuthenticated) {
      setHistory([]);
      setRecommendations([]);
      return;
    }
    Promise.all([
      api.myHistory({ limit: 6 }),
      api.myRecommendations({ limit: 6 }),
    ])
      .then(([h, r]) => {
        setHistory((h.items || []).map((item) => item.track).filter(Boolean));
        setRecommendations(r.items || []);
      })
      .catch(() => {});
  }, [isAuthenticated, currentTrack.youtubeId]);

  const hot = discovery?.hot ?? [];
  const editors = discovery?.editors ?? [];
  const heroTrack = recommendations[0] || hot[0] || TRACKS[1];
  const trending = useMemo(
    () =>
      recommendations.length
        ? recommendations
        : hot.length
          ? hot
          : TRACKS.slice(0, 6),
    [recommendations, hot],
  );
  const recent = useMemo(
    () =>
      history.length ? history : editors.length ? editors : TRACKS.slice(0, 6),
    [history, editors],
  );
  const liveItems = hot.length + editors.length;
  const workspaceMode = isAuthenticated
    ? currentUser?.plan || 'Studio'
    : 'Public';
  const spotlightQueue = trending.slice(0, 4);
  const heroBg = heroTrack.thumbnail
    ? { backgroundImage: `url(${heroTrack.thumbnail})` }
    : {};
  const contentBlocks = useMemo(
    () =>
      (settings.contentBlocks || []).filter((block) => block.visible !== false),
    [settings.contentBlocks],
  );

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroMedia} style={heroBg}>
          <div className={styles.heroGlow} />
        </div>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            {getGreeting()} {currentUser?.name || 'Viewly'}
          </span>
          <h1 className={styles.heading}>
            Ta musique, tes playlists, ton workspace.
          </h1>
          <p className={styles.sub}>{settings.heroSubtitle}</p>
          <div className={styles.headerActions}>
            <button
              className={styles.primaryBtn}
              onClick={() => play(heroTrack, trending)}
            >
              <Play size={17} fill="currentColor" />
              Lancer la selection
            </button>
            <Link className={styles.secondaryBtn} to="/search">
              <Sparkles size={16} />
              Explorer
            </Link>
          </div>
        </div>

        <div className={styles.heroNow}>
          <span className={styles.nowLabel}>En rotation</span>
          <strong>{heroTrack.title}</strong>
          <p>{heroTrack.artist}</p>
          <div className={styles.miniQueue}>
            {spotlightQueue.map((track, index) => (
              <button
                key={`${track.youtubeId || track.id}-mini`}
                onClick={() => play(track, trending)}
              >
                <span>{index + 1}</span>
                <img src={track.thumbnail} alt="" />
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className={styles.kpiGrid} aria-label="Vue rapide">
        <div className={styles.kpi}>
          <Database size={17} />
          <span>Catalogue</span>
          <strong>{liveItems || TRACKS.length}</strong>
        </div>
        <div className={styles.kpi}>
          <Clock3 size={17} />
          <span>Reprises</span>
          <strong>{history.length || recent.length}</strong>
        </div>
        <div className={styles.kpi}>
          <Radio size={17} />
          <span>Plan</span>
          <strong>{workspaceMode}</strong>
        </div>
        <div className={styles.kpi}>
          <ShieldCheck size={17} />
          <span>Session</span>
          <strong>{isAuthenticated ? 'Sync' : 'Public'}</strong>
        </div>
      </section>

      {currentUser?.plan === 'Free' && settings.freeLimitBanner ? (
        <section className={styles.limitBanner}>
          <ShieldCheck size={18} />
          <span>{settings.freeLimitBanner}</span>
          <Link to="/subscriptions">Passer Studio</Link>
        </section>
      ) : null}

      {contentBlocks.length ? (
        <section className={styles.cmsBlocks}>
          {contentBlocks.map((block) => (
            <article
              key={block.id}
              className={styles.cmsBlock}
              data-type={block.type}
            >
              <span>{block.type}</span>
              <h2>{block.title}</h2>
              <p>{block.body}</p>
              {block.cta ? <strong>{block.cta}</strong> : null}
            </article>
          ))}
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionKicker}>
              <TrendingUp size={15} />
              Pour toi
            </span>
            <h2>Mix du moment</h2>
          </div>
          <button
            className={styles.textBtn}
            onClick={() => trending[0] && play(trending[0], trending)}
          >
            Tout lire
          </button>
        </div>
        <div className={styles.cardRail}>
          {trending.slice(0, 6).map((t) => (
            <TrackCard key={`${t.youtubeId || t.id}-rec`} track={t} size="md" />
          ))}
        </div>
      </section>

      <div className={styles.workspace}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.sectionKicker}>
                <ListMusic size={15} />
                File active
              </span>
              <h2>Prochaine ecoute</h2>
            </div>
          </div>

          <div className={styles.trackList}>
            {trending.slice(0, 7).map((t, index) => (
              <TrackRow
                key={`${t.youtubeId || t.id}-row`}
                track={t}
                index={index + 1}
              />
            ))}
          </div>
        </section>

        <aside className={styles.sideStack}>
          <section className={styles.nowPanel}>
            <div
              className={styles.currentCover}
              style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
            />
            <div>
              <span className={styles.nowLabel}>
                {currentTrack.tag || 'YouTube'}
              </span>
              <h2>{currentTrack.title}</h2>
              <p>{currentTrack.artist}</p>
            </div>
            <button
              className={styles.primaryBtn}
              onClick={() => play(currentTrack, trending)}
            >
              <Play size={16} fill="currentColor" />
              Reprendre
            </button>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span className={styles.sectionKicker}>
                  <Activity size={15} />
                  Historique
                </span>
                <h2>Reprise rapide</h2>
              </div>
            </div>
            <div className={styles.compactList}>
              {recent.slice(0, 4).map((t, index) => (
                <TrackRow
                  key={`${t.youtubeId || t.id}-recent`}
                  track={t}
                  index={index + 1}
                />
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
