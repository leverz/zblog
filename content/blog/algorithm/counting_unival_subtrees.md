---
title: Counting Unival Subtrees
date: '2020-09-25T14:46:00.000Z'
---

This problem was asked by Google.

A unival tree (which stands for "universal value") is a tree where all nodes under it have the same value.

Given the root to a binary tree, count the number of unival subtrees.

For example, the following tree has 5 unival subtrees:

```plain
   0
  / \
 1   0
    / \
   1   0
  / \
 1   1
```

统计唯一值子树个数

上面的例子中，满足条件的子树如下：

```plain
1
1
1
   1  
  / \
 1   1
 0
```
```Go
/**
* Definition for a binary tree node.
* type TreeNode struct {
*     Val int
*     Left *TreeNode
*     Right *TreeNode
* }
*/

/**
* @param root: the given tree
* @return: the number of uni-value subtrees.
*/
func countUnivalSubtrees (root *TreeNode) int {
    count, _ := _countUnivalSubtrees(root)
    return count
}

func _countUnivalSubtrees (root *TreeNode) (count int, isUnival bool) {
    if root == nil {
    return 0, true
    }
    if root.Left == nil && root.Right == nil {
        return 1, true
    }
    cl, isUnivalL := _countUnivalSubtrees(root.Left)
    cr, isUnivalR := _countUnivalSubtrees(root.Right)
    if isUnivalL && isUnivalR {
        if root.Left == nil && root.Val == root.Right.Val {
            return cl + 1 + cr, true
        } else if root.Right == nil && root.Val == root.Left.Val {
            return cl + 1 + cr, true
        } else if root.Left != nil && root.Right != nil && root.Val == root.Left.Val && root.Val == root.Right.Val {
            return cl + 1 + cr, true
        }
    }
    return cl + cr, false
}
```

题目比较简单，叶子节点一定是满足条件的子树，从叶子节点往上，左右根 3 个节点值一致，也是一颗满足条件的子树。还需要注意的是，有些子树只有左子树，有些子树只有右子树，针对这些情况再做下特殊处理即可。
