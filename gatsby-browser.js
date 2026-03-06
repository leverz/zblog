// 赛博朋克主题字体
import 'typeface-montserrat'
import 'typeface-merriweather'

// 自定义字体加载完成后隐藏默认光标（在赛博朋克主题中）
export const onInitialClientRender = () => {
  // 检测是否为触摸设备
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
  
  if (!isTouchDevice) {
    document.body.style.cursor = 'none'
  }
}
