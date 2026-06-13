import React from 'react'
import { Link, graphql } from 'gatsby'

import Bio from '../components/Bio'
import Layout from '../components/Layout'
import SEO from '../components/seo'
import GlitchText from '../components/GlitchText'
import TerminalCard from '../components/TerminalCard'
import { rhythm } from '../utils/typography'

const INITIAL_POSTS = 10
const LOAD_MORE_STEP = 10

class BlogIndex extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      visibleCount: INITIAL_POSTS,
    }
    this.handleLoadMore = this.handleLoadMore.bind(this)
  }

  handleLoadMore() {
    const { data } = this.props
    const posts = data.allMarkdownRemark.edges
    this.setState(prevState => ({
      visibleCount: Math.min(
        prevState.visibleCount + LOAD_MORE_STEP,
        posts.length
      ),
    }))
  }

  render() {
    const { data } = this.props
    const siteTitle = data.site.siteMetadata.title
    const posts = data.allMarkdownRemark.edges
    const { visibleCount } = this.state
    const visiblePosts = posts.slice(0, visibleCount)
    const hasMore = visibleCount < posts.length

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO
          title="All posts"
          keywords={[`blog`, `lever`, `javascript`, `react`, `mysql`, `golang`, `cyberpunk`]}
        />
        <Bio />
        
        <TerminalCard title="DATA.LOGS">
          <div style={{ 
            fontSize: '12px', 
            color: 'var(--neon-cyan)',
            marginBottom: '15px',
            fontFamily: "'Share Tech Mono', monospace"
          }}>
            {'>'} LOADING ARCHIVES... [{visiblePosts.length}/{posts.length}] ENTRIES FOUND
          </div>
          
          {visiblePosts.map(({ node }, index) => {
            const title = node.frontmatter.title || node.fields.slug
            const postNumber = String(posts.length - index).padStart(3, '0')
            
            return (
              <div key={node.fields.slug} className="cyberpunk-post-item">
                <h3 className="post-title">
                  <Link 
                    style={{ boxShadow: `none`, color: 'inherit', textDecoration: 'none' }} 
                    to={node.fields.slug}
                    className="cyberpunk-link"
                  >
                    <span style={{ 
                      color: 'var(--neon-pink)', 
                      marginRight: '10px',
                      fontSize: '0.8rem'
                    }}>
                      [{postNumber}]
                    </span>
                    {title}
                  </Link>
                </h3>
                <small className="post-date">
                  {node.frontmatter.date}
                </small>
                <p 
                  className="post-excerpt"
                  dangerouslySetInnerHTML={{ __html: node.excerpt }} 
                />
              </div>
            )
          })}
          
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button
                type="button"
                className="neon-button"
                onClick={this.handleLoadMore}
              >
                LOAD MORE [{posts.length - visibleCount} REMAINING]
              </button>
            </div>
          )}
        </TerminalCard>
      </Layout>
    )
  }
}

export default BlogIndex

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
      edges {
        node {
          excerpt
          fields {
            slug
          }
          frontmatter {
            date(formatString: "YYYY.MM.DD")
            title
          }
        }
      }
    }
  }
`
