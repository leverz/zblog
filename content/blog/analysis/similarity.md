---
title: 相似度分析
date: '2017-11-23T16:48:00.000Z'
---

最近了解了几个相似度分析相关的算法，整理一下。

## 曼哈顿距离(Manhattan Distance)

曼哈顿距离又叫城市街区距离，形象的理解一下就是你要从城市的一个地方到另一个地方，怎么计算你行驶的距离。如下图，想象一下，两个点之间是无数的高楼大厦。。。

![image](https://user-images.githubusercontent.com/10726701/33137191-3bf05858-cfe2-11e7-917f-751ef829a884.png)

那么怎么计算这两个点的距离呢？

放在坐标系里，我们很快就能算出这两个点的曼哈顿距离：(以下代码均为 Haskell 风格的伪代码)

```Haskell
-- 假设：A (x1, y1), B (x2, y2)
d = abs(x1 - x2) + abs(y1 - y2)
```
这是二维平面上两个点的计算方式，我们再扩展一下到 N 维世界：

```Haskell
-- 假设：A (x1, x2, ..., xn), B (y1, y2, ..., yn), A/B 的坐标集用列表表示
d = sum $ zipWith (\x y -> abs(x - y)) A B
```

## 欧式距离(Euclidean Distance)

这个距离如果放在二维世界来看的话，说的就是两点之间的直线距离：

![image](https://user-images.githubusercontent.com/10726701/33137207-4ae06c9a-cfe2-11e7-8d92-98d93d2a0d04.png)

至于这个距离的计算，都已经算是常识了：

```Haskell
-- A (x1, y1), B (x2, y2)
d = sqrt ((x1 - x2)^2 + (y1 - y2)^2)
```

脱离二维到 N 维：

```Haskell
-- A (x1, x2, ..., xn), B (y1, y2, ..., yn), A/B 的坐标集用列表表示
d = sqrt $ sum $ zipWith (\x y -> (x - y)^2) A B
```

## 余弦相似度(Cosine Similarity)

余弦相似度，是指通过夹角的余弦大小来判断两个数据集的差异程度

![image](https://user-images.githubusercontent.com/10726701/33137224-55a9d454-cfe2-11e7-912f-32c9862f7afc.png)

A (41, 43), B (82, 86) -> 向量 l (x1, y1)
C (43, 41), D (86, 82) -> 向量 m (x2, y2)

```Haskell
-- l 和 m 的夹角余弦计算
cosLM = (x1 * x2 + y1 * y2) / (sqrt (x1^2 + y1^2) * sqrt (x2^2 + y2^2))
```

升级到 N 维空间后：

```Haskell
-- l (x1, x2, ..., xn), m (y1, y2, ..., yn), l/m 用列表表示
cosLM = (sum $ zipWith (*) l m) /
          ((sqrt $ sum $ zipWith (*) l l) *
            (sqrt $ sum $ zipWith (*) m m))
```

余弦值的取值范围是 [-1, 1]，该值越大，表示两个向量的夹角越小，数据越相似。两个向量方向重合时，值为1，相反时值为 -1。

很多人用余弦相似度来比较文本是否相似，比如：
http://www.ruanyifeng.com/blog/2013/03/cosine_similarity.html

## 皮尔逊积矩相关系数(Pearson correlation coefficient)

https://segmentfault.com/q/1010000000094674
https://www.zhihu.com/question/19734616

看完上面两个链接里面的回答，我再说说我的理解。
皮尔逊相关系数，是要在做余弦相似度计算之前，先把数据进行一次“中心化”

![image](https://user-images.githubusercontent.com/10726701/33137077-e3675c86-cfe1-11e7-91b7-bfc79da794ae.png)

与上面的余弦相似度的计算对比一下，发现分子分母都多剪了一个平均值。
为什么要减这个平均值呢？
当我们在大量数据中挖掘信息时，很多数据可能在不同维度上会有不同情况的缺失，那我们在计算相似度时怎么处理这些缺失呢？皮尔逊相关系数的方式是，把这些缺失都当做 0 ，然后让所有其他维度减去该向量个维度的平均值

```Haskell
pearson xs ys = (n * sumXY - sumX * sumY) /
                sqrt ( (n * sumX2 - sumX * sumX) *
                       (n * sumY2 - sumY * sumY) )
                where n = fromIntegral (length xs)
                      sumX = sum xs
                      sumY = sum ys
                      sumX2 = sum $ zipWith (*) xs xs
                      sumY2 = sum $ zipWith (*) ys ys
                      sumXY = sum $ zipWith (*) xs ys
```

相似度算法太多了，先简单介绍一下这几个。现在有了这几个锤子，我要去项目里找找有没有合适的钉子了 🤣 🤣 🤣
