import Typography from 'typography'
import CodePlugin from 'typography-plugin-code'
import SternGroveTheme from 'typography-theme-stern-grove'

SternGroveTheme.overrideThemeStyles = () => {
  return {
    'a.gatsby-resp-image-link': {
      boxShadow: `none`,
    },
  }
}

SternGroveTheme.plugins = [
  new CodePlugin(),
]

const typography = new Typography(SternGroveTheme)

// Hot reload typography in development.
if (process.env.NODE_ENV !== `production`) {
  typography.injectStyles()
}

export default typography
export const rhythm = typography.rhythm
export const scale = typography.scale
