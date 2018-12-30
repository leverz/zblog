---
title: 奇怪的querySelector和querySelectorAll
date: '2017-02-15T22:12:03.284Z'
---

W3C在07年的Selectors API中新增了两个API —— **querySelector**和**querySelectorAll**。这两个API在文档中的描述如下：

```c++
    partial interface Document {
      Element?  querySelector(DOMString selectors);
      NodeList  querySelectorAll(DOMString selectors);
    };

    partial interface DocumentFragment {
      Element?  querySelector(DOMString selectors);
      NodeList  querySelectorAll(DOMString selectors);
    };

    partial interface Element {
      Element?  querySelector(DOMString selectors);
      NodeList  querySelectorAll(DOMString selectors);
    };
```

从接口定义中就可以看出，**Document**，**DocumentFragment**和**Element**都支持**querySelector**和**querySelectorAll**。其中**querySelector**返回的是单个元素，而**querySelectorAll**返回的是匹配到的所有DOM组成的NodeList。

构想一下下面的HTML结构：

```HTML
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width">
      <title>JS Bin</title>
    </head>
    <body>
      <div id="container" class="container">
        <div class="name">Lever</div>
        <div class="content">
          <div>Hello World!</div>
        </div>
      </div>
    </body>
    </html>
```

现在试着用querySelector和querySelectorAll来处理DOM。

```JavaScript
const container = document.querySelector("#container")
const name1 = container.querySelector(".name").innerText
const name2 = document.querySelector("#container > .name").innerText
console.log(name1, name2) // Lever Lever
```

这里分别在"#container"这个元素和document上调用了querySelector,可以看出，使用在Element上的querySelector是被限制在该Element的范围内的，而在document上调用的querySelector则会在全局中寻找符合条件的元素。

```JavaScript
const name3 = container.querySelector(".container > .name").innerText
```
现在猜猜，name3会输出什么。如果经常使用jQuery的话，很容易认为这样的选择器不会匹配到任何DOM，因为在“#container”的子元素中没有匹配的DOM。但结果其实是选择器正确的拿到了我们要找的DOM，name3的值为“Lever”。

不要怀疑，这不是浏览器的bug，规范中是这样描述的：

> Even though the method is invoked on an element, selectors are still evaluated in the context of the entire document. In the following example, the method will still match the div element's child p element, even though the body element is not a descendant of the div element itself.
```JavaScript
var div = document.getElementById("bar");
var p = div.querySelector("body p");
```

按照规范的意思，在Element下的querySelector同样会在整个document下寻找符合条件的选择器，然后才会将结果中属于Element子树的DOM截取出来。

这样看来，也就能解释为什么获取name3的选择器仍然会起作用了。

还需要注意的是，通过querySelectorAll选取出来的NodeList是静态的，因此任何对DOM的增删改的操作，不会影响到已经查询出来的NodeList的结果。

与本文的相关代码都放到了[JSBin][1]上。

参考资料：[Selectors API Level 1][2]


  [1]: https://jsbin.com/digapejuga/edit?html,js,output
  [2]: https://www.w3.org/TR/2013/REC-selectors-api-20130221/#SELECT
