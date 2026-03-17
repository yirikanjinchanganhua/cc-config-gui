import { useState } from 'react'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  /** 宽度类名，默认 w-72 */
  width?: string
}

export default function Tooltip({ content, children, width = 'w-72' }: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 ${width} pointer-events-none`}
          role="tooltip"
        >
          {/* 向上箭头 */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-theme-tooltip-bg border-l border-t border-theme-tooltip-border" />
          {/* 内容框 */}
          <div className="relative bg-theme-tooltip-bg border border-theme-tooltip-border rounded-lg px-3 py-2.5 text-xs text-theme-tooltip-text shadow-lg leading-relaxed">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}
