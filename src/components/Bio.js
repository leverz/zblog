import React from 'react'

import { rhythm } from '../utils/typography'
import GlitchText from './GlitchText'

// 直接使用静态头像路径
function Bio() {
  return (
    <div className="cyberpunk-bio">
      <div className="corner-decoration corner--tl" />
      <div className="corner-decoration corner--tr" />
      <div className="corner-decoration corner--bl" />
      <div className="corner-decoration corner--br" />
      
      <div className="cyberpunk-avatar">
        <img
          src="/profile-pic.jpg"
          alt="Lever"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            // 如果图片加载失败，显示默认占位
            e.target.style.display = 'none';
            e.target.parentElement.style.background = 'var(--neon-cyan)';
            e.target.parentElement.style.display = 'flex';
            e.target.parentElement.style.alignItems = 'center';
            e.target.parentElement.style.justifyContent = 'center';
            e.target.parentElement.innerHTML = '<span style="color: var(--dark-bg); font-weight: bold; font-size: 24px;">L</span>';
          }}
        />
      </div>
      
      <div className="bio-content">
        <div className="bio-title">
          <GlitchText text="IDENTITY //" />
        </div>
        <p className="bio-text">
          痕迹<br/>
          没有过去，就没法认定现在的自己
        </p>
      </div>
    </div>
  )
}

export default Bio
