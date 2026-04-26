import { usePlayer } from '../PlayerContext'
import { Music, Play, Trash2, X } from 'lucide-react'
import styles from './QueueDrawer.module.css'

export default function QueueDrawer({ isOpen, onClose }) {
  const { queue, queueIndex, currentTrack, removeFromQueue, clearQueue, play } = usePlayer()

  if (!isOpen) return null

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.drawer}>
        <div className={styles.header}>
          <h2>File de lecture</h2>
          <div className={styles.actions}>
            <span className={styles.count}>{queue.length} titres</span>
            {queue.length > 0 && (
              <button className={styles.clearBtn} onClick={clearQueue} aria-label="Vider la file">
                <Trash2 size={14} />
                Tout effacer
              </button>
            )}
          </div>
        </div>

        <div className={styles.list}>
          {queue.length === 0 ? (
            <div className={styles.empty}>
              <Music className={styles.emptyIcon} size={44} />
              <p>La file de lecture est vide</p>
              <span className={styles.emptySub}>Ajoute des titres pour créer ta file</span>
            </div>
          ) : (
            queue.map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                className={`${styles.item} ${index === queueIndex ? styles.active : ''}`}
                onClick={() => play(track)}
              >
                <div className={styles.index}>{index === queueIndex ? <Play size={12} fill="currentColor" /> : index + 1}</div>
                <div className={styles.art} style={{ backgroundImage: `url(${track.thumbnail})` }} />
                <div className={styles.info}>
                  <span className={styles.title}>{track.title}</span>
                  <span className={styles.artist}>{track.artist}</span>
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFromQueue(index)
                  }}
                  aria-label={`Retirer ${track.title} de la file`}
                >
                  <X size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
