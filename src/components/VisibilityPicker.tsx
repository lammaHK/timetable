import { useI18n } from '../lib/i18n'
import type { TKey } from '../lib/i18n'
import type { Visibility } from '../lib/types'

export function VisibilityBadge({ v, lang }: { v: Visibility; lang?: 'en' | 'zh' }) {
  const { lang: l } = useI18n()
  const active = lang ?? l
  const label: Record<Visibility, string> = {
    private: active === 'en' ? 'Me' : '僅自己',
    members: active === 'en' ? 'Members' : '成員',
    public: active === 'en' ? 'Public' : '公開',
    specific: active === 'en' ? 'Specific' : '指定',
  }
  return <span className={`vbadge v-${v}`}>{label[v]}</span>
}

const VIS: { v: Visibility; key: TKey; hint: TKey }[] = [
  { v: 'public', key: 'vis_public', hint: 'vis_public_hint' },
  { v: 'members', key: 'vis_members', hint: 'vis_members_hint' },
  { v: 'specific', key: 'vis_specific', hint: 'vis_specific_hint' },
  { v: 'private', key: 'vis_private', hint: 'vis_private_hint' },
]

export default function VisibilityPicker({
  value,
  onChange,
}: {
  value: Visibility
  onChange: (v: Visibility) => void
}) {
  const { t } = useI18n()
  return (
    <div className="seg seg-4">
      {VIS.map(({ v, key, hint }) => (
        <button
          key={v}
          type="button"
          className={`seg-item ${value === v ? 'active' : ''}`}
          onClick={() => onChange(v)}
        >
          {t(key)}
          <span className="seg-hint">{t(hint)}</span>
        </button>
      ))}
    </div>
  )
}