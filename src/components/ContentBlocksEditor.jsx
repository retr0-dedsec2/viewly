import { useEffect, useState } from 'react'
import { Eye, EyeOff, GripVertical, Plus, Save, Trash2 } from 'lucide-react'
import styles from './ContentBlocksEditor.module.css'

const TYPES = [
 { value: 'feature', label: 'Feature' },
 { value: 'workflow', label: 'Workflow' },
 { value: 'notice', label: 'Notice' },
 { value: 'metric', label: 'Metric' },
]

function moveItem(list, fromIndex, toIndex) {
 const next = [...list]
 const [item] = next.splice(fromIndex, 1)
 next.splice(toIndex, 0, item)
 return next
}

function createBlock() {
 return {
 id: `block-${Date.now()}`,
 type: 'feature',
 title: 'Nouveau bloc',
 body: 'Texte visible sur la home.',
 cta: 'Action',
 visible: true,
 }
}

export default function ContentBlocksEditor({ settings, onSave, saving = false }) {
 const [blocks, setBlocks] = useState(settings?.contentBlocks || [])
 const [dragIndex, setDragIndex] = useState(null)
 const [message, setMessage] = useState('')

 useEffect(() => {
 setBlocks(settings?.contentBlocks || [])
 }, [settings?.contentBlocks])

 function updateBlock(id, patch) {
 setBlocks(prev => prev.map(block => block.id === id ? { ...block, ...patch } : block))
 }

 function handleDrop(index) {
 if (dragIndex === null || dragIndex === index) return
 setBlocks(prev => moveItem(prev, dragIndex, index))
 setDragIndex(null)
 }

 async function save() {
 await onSave({ ...settings, contentBlocks: blocks })
 setMessage('Ordre et contenus publies.')
 }

 return (
 <section className={styles.editor}>
 <div className={styles.head}>
 <div>
 <span className={styles.kicker}>Editeur associes</span>
 <h2>Blocs de la home</h2>
 <p>Glisse les blocs pour changer l'ordre, masque un bloc ou modifie son texte sans toucher au code.</p>
 </div>
 <button className={styles.addBtn} type="button" onClick={() => setBlocks(prev => [...prev, createBlock()])}>
 <Plus size={16} />Ajouter
 </button>
 </div>

 <div className={styles.blocks}>
 {blocks.map((block, index) => (
 <article
 key={block.id}
 className={`${styles.block} ${dragIndex === index ? styles.dragging : ''}`}
 draggable
 onDragStart={() => setDragIndex(index)}
 onDragOver={event => event.preventDefault()}
 onDrop={() => handleDrop(index)}
 >
 <div className={styles.blockTop}>
 <button className={styles.iconBtn} type="button" aria-label="Deplacer le bloc"><GripVertical size={17} /></button>
 <span className={styles.position}>{index + 1}</span>
 <select value={block.type} onChange={event => updateBlock(block.id, { type: event.target.value })}>
 {TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
 </select>
 <button className={styles.iconBtn} type="button" onClick={() => updateBlock(block.id, { visible: !block.visible })} aria-label={block.visible ? 'Masquer le bloc' : 'Afficher le bloc'}>
 {block.visible ? <Eye size={16} /> : <EyeOff size={16} />}
 </button>
 <button className={styles.iconBtn} type="button" onClick={() => setBlocks(prev => prev.filter(item => item.id !== block.id))} aria-label="Supprimer le bloc">
 <Trash2 size={16} />
 </button>
 </div>
 <label>
 <span>Titre</span>
 <input value={block.title} onChange={event => updateBlock(block.id, { title: event.target.value })} />
 </label>
 <label>
 <span>Texte</span>
 <textarea rows="3" value={block.body} onChange={event => updateBlock(block.id, { body: event.target.value })} />
 </label>
 <label>
 <span>CTA court</span>
 <input value={block.cta} onChange={event => updateBlock(block.id, { cta: event.target.value })} />
 </label>
 </article>
 ))}
 </div>

 {message ? <div className={styles.message}>{message}</div> : null}
 <button className={styles.saveBtn} type="button" onClick={save} disabled={saving}>
 <Save size={16} />{saving ? 'Publication...' : 'Publier les blocs'}
 </button>
 </section>
 )
}
