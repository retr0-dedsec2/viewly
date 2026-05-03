import { useState } from 'react'
import { useSiteSettings } from '../context/SiteSettingsContext'
import ContentBlocksEditor from '../components/ContentBlocksEditor'
import styles from './Editor.module.css'

export default function Editor() {
 const { settings, saveAdminSettings } = useSiteSettings()
 const [saving, setSaving] = useState(false)

 async function save(payload) {
 setSaving(true)
 try {
 await saveAdminSettings(payload)
 } finally {
 setSaving(false)
 }
 }

 return (
 <div className={styles.page}>
 <header className={styles.header}>
 <div>
 <span className={styles.eyebrow}>workspace equipe</span>
 <h1>Edition rapide</h1>
 <p>Un espace simple pour tes associes: ordre des blocs, textes publics et publication immediate.</p>
 </div>
 </header>

 <div className={styles.panel}>
 <ContentBlocksEditor settings={settings} onSave={save} saving={saving} />
 </div>
 </div>
 )
}
