import React from 'react'

/**
 * 故障文字组件 - 赛博朋克风格
 * @param {string} text - 显示的文本
 * @param {string} className - 额外的CSS类
 * @param {string} as - 渲染的HTML标签 (h1, h2, span, etc.)
 */
const GlitchText = ({ text, className = '', as: Component = 'span' }) => {
  return (
    <Component
      className={`glitch-text ${className}`}
      data-text={text}
    >
      {text}
    </Component>
  )
}

export default GlitchText
