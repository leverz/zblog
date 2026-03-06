import React, { useEffect, useState, useRef } from 'react'

/**
 * 自定义光标组件 - 赛博朋克风格
 * 提供霓虹光晕跟随效果
 */
const CustomCursor = () => {
  const cursorRef = useRef(null)
  const cursorDotRef = useRef(null)
  const [isHovering, setIsHovering] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 检测是否为触摸设备
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
    if (isTouchDevice) return

    const cursor = cursorRef.current
    const cursorDot = cursorDotRef.current
    if (!cursor || !cursorDot) return

    let mouseX = 0
    let mouseY = 0
    let cursorX = 0
    let cursorY = 0
    let rafId = null

    const handleMouseMove = (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
      setIsVisible(true)
    }

    const handleMouseEnter = () => setIsVisible(true)
    const handleMouseLeave = () => setIsVisible(false)

    // 平滑跟随动画
    const animate = () => {
      const ease = 0.15
      cursorX += (mouseX - cursorX) * ease
      cursorY += (mouseY - cursorY) * ease

      cursor.style.left = `${cursorX - 10}px`
      cursor.style.top = `${cursorY - 10}px`
      cursorDot.style.left = `${mouseX - 2}px`
      cursorDot.style.top = `${mouseY - 2}px`

      rafId = requestAnimationFrame(animate)
    }

    // 检测悬停元素
    const handleElementHover = () => {
      const hoverElements = document.querySelectorAll('a, button, [role="button"], input, textarea')
      
      hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => setIsHovering(true))
        el.addEventListener('mouseleave', () => setIsHovering(false))
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseleave', handleMouseLeave)
    
    rafId = requestAnimationFrame(animate)
    
    // 延迟执行以确保DOM已加载
    setTimeout(handleElementHover, 1000)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(rafId)
    }
  }, [])

  // 触摸设备不显示
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null
  }

  return (
    <>
      <div
        ref={cursorRef}
        className={`cyberpunk-cursor ${isHovering ? 'cursor-hover' : ''}`}
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
      <div
        ref={cursorDotRef}
        className="cyberpunk-cursor-dot"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
    </>
  )
}

export default CustomCursor
