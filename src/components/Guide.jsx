import { marked } from 'marked'
import guideMd from '../../docs/GUIDE.md?raw'

export default function Guide({ onClose }) {
  const html = marked.parse(guideMd)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal guide-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>How to Play</h2>
          <button className="ghost" onClick={onClose}>
            Close ✕
          </button>
        </div>
        <div
          className="guide-body markdown"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
