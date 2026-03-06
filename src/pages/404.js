import React from 'react'

import Layout from '../components/Layout'
import SEO from '../components/seo'
import GlitchText from '../components/GlitchText'
import NeonButton from '../components/NeonButton'

class NotFoundPage extends React.Component {
  render() {
    return (
      <Layout location={this.props.location}>
        <SEO title="404: Not Found" />
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
        }}>
          <div style={{
            fontSize: '120px',
            fontFamily: "'Share Tech Mono', monospace",
            color: 'var(--neon-red)',
            textShadow: '0 0 20px var(--neon-red)',
            marginBottom: '20px',
            lineHeight: 1,
          }}>
            <GlitchText text="404" />
          </div>
          
          <h2 style={{
            color: 'var(--neon-cyan)',
            fontFamily: "'Share Tech Mono', monospace",
            marginBottom: '20px',
          }}>
            SYSTEM ERROR // PAGE NOT FOUND
          </h2>
          
          <p style={{
            color: 'var(--text-secondary)',
            marginBottom: '30px',
            fontSize: '14px',
          }}>
            {'>'} 无法定位请求的资源...<br/>
            {'>'} 数据可能在传输过程中丢失或被腐蚀
          </p>
          
          <NeonButton to="/" variant="pink">
            RETURN TO BASE
          </NeonButton>
        </div>
      </Layout>
    )
  }
}

export default NotFoundPage
