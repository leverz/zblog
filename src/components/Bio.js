import React from 'react'
import { useStaticQuery, graphql } from 'gatsby'
import { GatsbyImage, getImage } from 'gatsby-plugin-image'

import GlitchText from './GlitchText'

function Bio() {
  const data = useStaticQuery(graphql`
    query BioQuery {
      avatar: file(absolutePath: { regex: "/profile-pic.jpg/" }) {
        childImageSharp {
          gatsbyImageData(width: 56, height: 56, layout: FIXED)
        }
      }
      site {
        siteMetadata {
          author
        }
      }
    }
  `)

  const { author } = data.site.siteMetadata
  const avatarImage = getImage(data.avatar)

  return (
    <div className="cyberpunk-bio">
      <div className="corner-decoration corner--tl" />
      <div className="corner-decoration corner--tr" />
      <div className="corner-decoration corner--bl" />
      <div className="corner-decoration corner--br" />
      
      <div className="cyberpunk-avatar">
        {avatarImage ? (
          <GatsbyImage
            image={avatarImage}
            alt={author}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        ) : (
          <img
            src="/profile-pic.jpg"
            alt={author}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.style.background = 'var(--neon-cyan)';
              e.target.parentElement.style.display = 'flex';
              e.target.parentElement.style.alignItems = 'center';
              e.target.parentElement.style.justifyContent = 'center';
              e.target.parentElement.innerHTML = '<span style="color: var(--dark-bg); font-weight: bold; font-size: 24px;">L</span>';
            }}
          />
        )}
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
