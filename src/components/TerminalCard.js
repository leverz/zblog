import React from 'react'

/**
 * 终端卡片组件 - 赛博朋克风格
 * @param {string} title - 卡片标题
 * @param {string} variant - 变体样式 (default, pink)
 * @param {ReactNode} children - 卡片内容
 * @param {string} className - 额外的CSS类
 */
const TerminalCard = ({ 
  title = 'SYSTEM.READY', 
  variant = 'default',
  children, 
  className = '' 
}) => {
  const variantClass = variant === 'pink' ? 'terminal-card--pink' : ''

  return (
    <div className={`terminal-card ${variantClass} ${className}`} style={{ paddingTop: '35px' }}>
      <div className="corner-decoration corner--tl" />
      <div className="corner-decoration corner--tr" />
      <div className="corner-decoration corner--bl" />
      <div className="corner-decoration corner--br" />
      {children}
    </div>
  )
}

export default TerminalCard
