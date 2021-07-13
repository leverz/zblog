---
title: 并查集
date: '2021-07-14T00:45:00.000Z'
---

[关于并查集的维基百科文章](https://zh.wikipedia.org/wiki/%E5%B9%B6%E6%9F%A5%E9%9B%86)

今天学习了一下并查集这种数据结构。主要可以用于：

* 维护无向图的连通性，判断两个节点是否在一个集合内
* 判断无向图中是否有环，或者增加一条边是否形成环



相关的编程题：[684. 冗余连接](https://leetcode-cn.com/problems/redundant-connection/)

并查集一般会有 2 个操作：

* 查询：查询某个元素在哪个集合里
* 合并：将两个集合合并成一个
## 不交集森林

这是一种常见的并查集实现方式。

本质上是将节点之间的关系用树的方式维护起来，每个节点维护一个 parent，通过 parent 把相关的节点划到一颗树上。

查询的时候就一直往根节点查，最终返回根节点。

如果每次查询都要查到根，效率会非常低，最坏的情况下，树会变成链表，查询的时间复杂度是 O(n)。有一种常用的优化方式叫**路径****压缩****优化。**本质上就是把每个节点原来存的 parent 改成 root，每次触发合并时，把整个链路上的节点的root 都更新一遍，而查询的时候大概率往上查一次就好了。

## 684 题解

使用并查集的数据结构，当有环时，成环的边将会在同一集合中。

```go
func findRedundantConnection(edges [][]int) []int {
    // 如果每个节点都连同，有环的话，就有 n 个节点，无环的话，就有 n+1 个节点
    // 这里为了兼容无环的情况，将数组的长度设为 n+1
    nodeIDToRootID := make([]int, len(edges) + 1)
    // 初始化，每个节点的根是自身
    for i := 1; i <= len(edges); i++ {
        // 节点 id 是从 1 开始的
        nodeIDToRootID[i] = i
    }
    for _, edge := range edges {
        if findRoot(edge[0], nodeIDToRootID) == findRoot(edge[1], nodeIDToRootID) {
            return edge
        }
        nodeIDToRootID = merge(edge[0], edge[1], nodeIDToRootID)
    }
    return []int{}
}
func findRoot(nodeID int, nodeIDToRootID []int) int {
    if nodeIDToRootID[nodeID] == nodeID {
        return nodeID
    }
    return findRoot(nodeIDToRootID[nodeID], nodeIDToRootID)
}
func merge(nodeID1, nodeID2 int, nodeIDToRootID []int) []int {
    parent := nodeIDToRootID[nodeID1]
    if parent == nodeIDToRootID[nodeID2] {
        return nodeIDToRootID
    }
    nodeIDToRootID[nodeID1] = nodeIDToRootID[nodeID2]
    return merge(parent, nodeIDToRootID[nodeID2], nodeIDToRootID)
}
```
