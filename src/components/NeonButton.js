import React from 'react'
import { Link } from 'gatsby'

/**
 * 霓虹按钮组件 - 赛博朋克风格
 * @param {string} to - 链接地址
 * @param {string} href - 外部链接
 * @param {string} variant - 变体样式 (default, pink, green)
 * @param {string} children - 按钮内容
 * @param {function} onClick - 点击事件
 * @param {string} className - 额外的CSS类
 */
const NeonButton = ({ 
  to, 
  href, 
  variant = 'default', 
  children, 
  onClick, 
  className = '',
  ...props 
}) => {
  const variantClass = {
    default: '',
    pink: 'neon-button--pink',
    green: 'neon-button--green'
  }[variant] || ''

  const buttonClass = `neon-button ${variantClass} ${className}`

  if (to) {
    return (
      <Link to={to} className={buttonClass} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={buttonClass} {...props}>
        {children}
      </a>
    )
  }

  return (
    <button onClick={onClick} className={buttonClass} {...props}>
      {children}
    </button>
  )
}

export default NeonButton
