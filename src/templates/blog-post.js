import React from 'react'
import { Link, graphql } from 'gatsby'

import Bio from '../components/Bio'
import Layout from '../components/Layout'
import SEO from '../components/seo'
import GlitchText from '../components/GlitchText'
import TerminalCard from '../components/TerminalCard'
import { rhythm, scale } from '../utils/typography'

class BlogPostTemplate extends React.Component {
  render() {
    const post = this.props.data.markdownRemark
    const siteTitle = this.props.data.site.siteMetadata.title
    const { previous, next } = this.props.pageContext

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO title={post.frontmatter.title} description={post.excerpt} />
        
        <article>
          <header>
            <h1 className="cyberpunk-article-title">
              <GlitchText text={post.frontmatter.title} />
            </h1>
            <small className="cyberpunk-article-date">
              {post.frontmatter.date}
            </small>
          </header>

          <TerminalCard title="DATA.DECODED">
            <section 
              className="cyberpunk-content"
              dangerouslySetInnerHTML={{ __html: post.html }} 
            />
          </TerminalCard>

          <div className="cyberpunk-divider" />
          
          <Bio />

          <nav className="cyberpunk-nav">
            <div>
              {previous && (
                <Link 
                  to={previous.fields.slug} 
                  rel="prev"
                  className="nav-prev"
                >
                  <span>←</span>
                  <span>
                    <span style={{ 
                      display: 'block', 
                      fontSize: '10px', 
                      color: 'var(--text-secondary)',
                      marginBottom: '2px'
                    }}>
                      PREVIOUS
                    </span>
                    {previous.frontmatter.title}
                  </span>
                </Link>
              )}
            </div>
            <div>
              {next && (
                <Link 
                  to={next.fields.slug} 
                  rel="next"
                >
                  <span>
                    <span style={{ 
                      display: 'block', 
                      fontSize: '10px', 
                      color: 'var(--text-secondary)',
                      marginBottom: '2px'
                    }}>
                      NEXT
                    </span>
                    {next.frontmatter.title}
                  </span>
                  <span>→</span>
                </Link>
              )}
            </div>
          </nav>
        </article>
      </Layout>
    )
  }
}

export default BlogPostTemplate

export const pageQuery = graphql`
  query BlogPostBySlug($slug: String!) {
    site {
      siteMetadata {
        title
        author
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      excerpt(pruneLength: 160)
      html
      frontmatter {
        title
        date(formatString: "YYYY.MM.DD HH:mm")
      }
    }
  }
`
