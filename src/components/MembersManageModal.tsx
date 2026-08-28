import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { useI18n } from '../lib/i18n'
import { fetchAllProfiles, adminUpdateMember } from '../lib/data'
import { useAuth } from '../context/AuthContext'
import type { Profile } from '../lib/types'

export default function MembersManageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const { profile: me } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const list = await fetchAllProfiles()
    setMembers(list)
  }, [])

  useEffect(() => {
    if (open) {
      setErr('')
      load()
    }
  }, [open, load])

  const canManage = (m: Profile) => m.id !== me?.id // can't deactivate yourself

  const toggleActive = async (m: Profile) => {
    if (!canManage(m)) return
    setBusy(true)
    setErr('')
    const ok = await adminUpdateMember(m.id, { is_active: !m.is_active })
    setBusy(false)
    if (!ok) {
      setErr(t('actionFailed'))
      return
    }
    // update local list
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_active: !m.is_active } : x)))
  }

  const toggleRole = async (m: Profile) => {
    if (!canManage(m)) return
    setBusy(true)
    setErr('')
    const newRole = m.role === 'admin' ? 'member' : 'admin'
    const ok = await adminUpdateMember(m.id, { role: newRole })
    setBusy(false)
    if (!ok) {
      setErr(t('actionFailed'))
      return
    }
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, role: newRole } : x)))
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div className="modal" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 60, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            >
              <div className="modal-head">
                <div>
                  <div className="modal-title">{t('membersTitle')}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 3 }}>
                    {t('membersSubtitle')} · {members.length}
                  </div>
                </div>
                <button className="icon-btn" onClick={onClose} aria-label={t('close')}>
                  <X size={20} />
                </button>
              </div>

              {err && (
                <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12, background: 'var(--danger-soft)', padding: '10px 12px', borderRadius: 10 }}>
                  {err}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.map((m) => (
                  <div key={m.id} className="event-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar" style={{ width: 38, height: 38, fontSize: 15 }}>
                      {(m.full_name || m.email || '?')[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.full_name || m.email}
                        {m.role === 'admin' && (
                          <span className="vbadge v-public" style={{ marginLeft: 8 }}>{t('roleAdmin')}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.email}
                      </div>
                    </div>
                    {canManage(m) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => toggleRole(m)} disabled={busy} title={t('toggleRole')}>
                          {m.role === 'admin' ? 'member' : 'admin'}
                        </button>
                        <button
                          className={`btn btn-sm ${m.is_active ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => toggleActive(m)}
                          disabled={busy}
                          style={{ minWidth: 64 }}
                        >
                          {m.is_active ? t('deactivate') : t('activate')}
                        </button>
                      </div>
                    )}
                    {!m.is_active && (
                      <span className="vbadge v-private" style={{ flexShrink: 0 }}>{t('inactive')}</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}