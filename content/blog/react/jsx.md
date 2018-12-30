---
title: `[译]JSX：硬币的另一面`
date: '2016-02-23T22:12:03.284Z'
---

  React框架刚刚发布的时候，JSX颠覆了很多人的想法。习惯了HTML标签与JavaScript代码分离的前端工程师们，看到JSX大概都会不禁吐槽：“这些奇怪的标签出现在JavaScript里是要干啥?！”我们一向贯彻的关注点分离原则呢？Facebook的工程师难道一点都不了解这些社区中已经默认的规范？

  像很多人一样，我一开始对JSX这种语法是持怀疑态度的。甚至当我爱上JSX后，每次我向别的开发者推荐这种语法，我都会觉得我是在向别人展示我丑陋的孩子。

从一开始的怀疑到爱上JSX，我渐渐意识到JSX其实并没有那么激进。它不过是硬币的另一面。JSX其实是前端开发中自然进化的一个过渡。为什么这么说呢，我们有必要回顾一下前端这几年的发展历程了。

##第一阶段：非侵入式JavaScript（Unobtrusive JavaScript）
还记得那个jQuery盛行的时代么？非侵入式的JavaScript被各种提倡。我们的HTML是纯HTML，我们的JavaScript是纯JavaScript。我们开发时是严格贯彻所谓的关注点分离的。

我们像下面这样写HTML：
```HTML
<a class="hide">Click to hide me</a>
```
而我们的JavaScript会这样写：
```JavaScript
$(".hide").click(function() { $(this).hide(); }
```
按照之前的理解，这样做是真的做到了关注点分离对吧？然而我觉得并不是这样。

这样写看起来像是一个好主意。我们的HTML是绝对纯净的，完全不参合任何逻辑代码。但是我们会慢慢发现一个问题：我怎么知道哪行JavaScript代码在控制我的HTML呢？答案是：除非我阅读了整个JavaScript文件，我才能明白，哪段JavaScript代码在控制哪段HTML。（译者注：这样的情况很常见，尤其是在大型项目中，我们有无数的还有可能重复的DOM节点，HTML和JavaScript文件不在一起，要修改起来简直太复杂了）。在这种模式中，你不能仅仅简单的修改一个标签而不去检查对应的JavaScript代码以确保你的修改没有破换选择器执行。你看，这里实际上并没有实现关注点分离，我们还是要不断的关注HTML和JavaScript之间的联系。我们做到的仅仅是把JS和HTML分离到了两个不同的文件中。在本质上这两种技术是密不可分的，他们必须保持步调一致，否则就会导致我们的应用崩溃。

直接分割HTML和JS导致我们的应用更加难以维护和调试。每次你想修改一个标签，总是会担心破坏一个jQuery选择器。如果我们对关注点的分离不那么严格，也许可以减轻一些痛苦。于是，我们迎来了第二阶段...

##第二阶段：双向绑定（Two-way Binding）
在Knockout和Angular中出现的双向绑定，让所有前端开发者眼前一亮。许多开发者开始抛弃之前信奉的关注点分离，并全力拥抱这种在HTML标签中声明式绑定的力量。当数据发生改变，UI也自动发生变动。当UI发生变动，数据也随之变动。如此清晰，如此简单。（译者注：我认为这是另一种意义上的关注点分离，我们不再需要关注HTML与JavaScript之间的联系，我们需要做的就是维护好数据。）

这些框架的实现的确大不相同，但他们都在试图做相同的事情。试想使用这几个流行框架实现迭代数组这个例子：
```JavaScript
//Angular
<div ng-repeat=”user in users”>
//Ember
{{#each user in users}}
//Knockout
data-bind=”foreach: users”
```

但是这里出现了一些有意思的事情————很少有人意识到一个非常显著的问题：我们实际上在把JavaScript放到HTML中。这并不是我们所理解的那种关注点分离。我们可以发现这些框架都在处理同一件事：通过为HTML添加额外的特殊标记使其更强大。这些标记可以被解析为JavaScript。因此，既然我们能够接受JavaScript与HTML通过这种方式混合在一块儿，那么是时候让React介入并向我们展示硬币的另一面了...

##第三阶段：JSX
React的JSX并不是一个激进的改变，是因为我们这个行业从一开始就注定HTML和JavaScript应该是在一起的。

只有当你体验过React和JSX之后，才能体会到这样做有多少好处。React的JSX完全优于所有的“第二阶段”风格的框架的原因有以下几点：

###编译时错误（Compile-time Errors）
当你的HTML中出现输入错误时，你很难知道自己是哪里写错了。在很多情况下这是一种无声的运行时错误。比如，如果你在写Angular应用时输入n-repeat而不是ng-repeat，什么都不会发生。当你在写Knockout应用时把data-bind写成data-bnd，也同样什么都不会发生。在出现这些错误时，你的应用会悄无声息的运行时失败。这太令人沮丧了。

相比之下，当你在JSX中发生类似的输入错误时，它是不会被编译的。忘记闭合`<li>`标签了？难道你不想在你输入错误的HTML时得到丰富的反馈么？
```JavaScript
ReactifyError: /components/header.js: Parse Error: Line 23: Expected corresponding JSX closing tag for li while parsing file: /components/header.js
```

有了JSX，这样**丰富的错误反馈**终于成为现实！靠这一点JSX绝对完胜。如此快速而又丰富的反馈极大的提高了生产效率。正如我在我的Clean Code课程中讨论的那样————[良好的工程解决方案遵循速错原则][1]。（译者注：原文是：well- engineered solutions fail fast，关于fail fast可以查看http://geeklu.com/2010/07/fail-fast/ 进行了解）

###充分利用JavaScript（Leverage the Full Power of JavaScript）
使用JavaScript编写你的标记，意味着这些标记可以借助JavaScript的全部能力，而不是像Angular或者Knockout这种以HTML为中心的框架只能提供有限的特殊标记。（译者注：我认为这里作者的表述并不准确，Angular也同样可以自由扩展HTML，只不过没有React那么灵巧方便）。

> Client-side frameworks shouldn’t require you to learn a proprietary syntax for declaring loops and conditionals.
客户端框架不应当要求使用者学习特殊的语法来声明循环或者条件语句。

React减少了使用者学习另一种特殊的声明循环和基本条件语句的成本。你可以看看第二阶段中提到的几个框架，他们实现双向绑定的方式都是依靠一些属于他们自己的特殊语法。相反，JSX看上去和HTML几乎一样，像循环和条件语句，完全依赖原生的JavaScript。与众多的JavaScript框架相比，**不需要去学习类似于数据绑定等特殊语法**，这一点又让React和JSX脱颖而出。

并且，由于你将这些标记与相关联的JavaScript数据写在一个文件中，当你引用函数时，许多IDE能够提供一些**智能提示**。想想当你使用那些以HTML为中心的框架时，调用一个function却总是输入错误时的苦恼吧！

##Final Thoughts
JSX并不一个疯狂的主意，它就是一段很正常的程序，因此不要再反感它了。

> JSX isn’t revolutionary. It’s evolutionary.
JSX不是革命，它只是进化发展的结果。

像很多进化、演变一样，它给我们带来的是一种改善。


原文链接：https://medium.com/@housecor/react-s-jsx-the-other-side-of-the-coin-2ace7ab62b98#.8qys8o3pq


  [1]: https://www.pluralsight.com/courses/writing-clean-code-humans
