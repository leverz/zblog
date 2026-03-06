import React, { useEffect, useRef } from 'react'

/**
 * 数字雨背景效果 - 赛博朋克风格
 * 轻量级版本，用于header背景
 */
const DigitalRain = () => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationId = null
    let isActive = true

    // 设置画布尺寸
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // 字符集
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789'
    const charArray = chars.split('')
    
    // 列设置
    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)
    const drops = new Array(columns).fill(1)

    // 绘制函数
    const draw = () => {
      if (!isActive) return

      // 半透明黑色背景形成拖尾效果
      ctx.fillStyle = 'rgba(10, 10, 15, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${fontSize}px 'Share Tech Mono', monospace`

      for (let i = 0; i < drops.length; i++) {
        // 随机字符
        const char = charArray[Math.floor(Math.random() * charArray.length)]
        
        // 随机颜色（青色或粉色）
        const isPink = Math.random() > 0.95
        ctx.fillStyle = isPink ? '#ff00ff' : '#00f3ff'
        
        // 绘制字符
        ctx.fillText(char, i * fontSize, drops[i] * fontSize)

        // 重置或下移
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    // 页面不可见时暂停
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isActive = false
      } else {
        isActive = true
        draw()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isActive = false
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        opacity: 0.15,
        pointerEvents: 'none'
      }}
    />
  )
}

export default DigitalRain
