interface ConfirmDialogProps {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-theme-bg border border-theme-border rounded-xl shadow-2xl w-96 p-6">
        <h2 className="text-base font-semibold text-theme-text mb-2">{title}</h2>
        <div className="text-sm text-theme-text-muted mb-6">{message}</div>
        <div className="flex gap-3 justify-end">
          <button
            className="px-4 py-2 text-sm rounded-lg border border-theme-border text-theme-text hover:bg-theme-selected-bg transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
