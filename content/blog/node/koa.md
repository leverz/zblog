---
title: 从 Generator 开始学习 Koa
date: '2017-05-21T22:12:03.284Z'
---

Koa是最近比较火的一款基于Node的web开发框架。说他是一个框架，其实他更像是一个函数库，通过某种思想（或者说某种约定），将众多的中间件联系在一起，从而提供你所需要的web服务。

Koa做了两件很重要的事：

 1. 封装node的request和response对象到Context上，还提供了一些开发web应用以及api常用的方法
 2. 提供了一套流程控制方式，将众多中间件级联在一起

而我现在想讨论的就是Koa的这套流程控制的思想。

先看一段从官方文档上搬下来的代码：

```Javascript
var koa = require('koa');
var app = koa();

// x-response-time

app.use(function *(next){
  var start = new Date;
  yield next;
  var ms = new Date - start;
  this.set('X-Response-Time', ms + 'ms');
});

// logger

app.use(function *(next){
  var start = new Date;
  yield next;
  var ms = new Date - start;
  console.log('%s %s - %s', this.method, this.url, ms);
});

// response

app.use(function *(){
  this.body = 'Hello World';
});

app.listen(3000);
```

app是Koa的一个实例，通过调用**app.use**，向Koa内部维护的一个middlewares数组中，添加中间件。而我们所说的中间件，其实就是那个作为app.use参数的，使用奇怪方式声明的function。

在Koa中，我们约定所有的中间件都是以这种方式声明的，如果你了解ES6，那你一定见过这种声明方式。没错，这就是ES6中的generator function。Koa中，真正的中间件其实就是一个generator对象。


什么是Generator？
-------------


Generator是ES6新引进的一个概念，使用Generator可以将函数的控制权交给函数外部。也就是说，你可以控制函数的执行进程。

举个例子：

```Javascript
function *sayHello(){
  console.log("before say");
  yield console.log("hello!");
  console.log("end say");
}

var a = sayHello();
a.next(); // 输出before say 输出hello!
a.next(); // 输出end say

```

首先我们定义了一个叫做sayHello的generator function，它跟普通的function不同，执行sayHello()，并不会执行函数体内部的程序，但是会返回一个generator对象。因此a的值实际上长这样：

```Javascript
sayHello {[[GeneratorStatus]]: "suspended"}
```

对generator function来说，执行函数只是生成了一个generator对象，不会执行函数的内在逻辑，而使用者却可以通过这个generator对象来达到控制函数执行的目的。就比如说这个sayHello函数，我可以在需要的时候，执行**a\.next\(\)**方法，来执行函数的内部逻辑。第一次执行a\.next()，函数开始执行，直到它遇到**yield**指令，它会执行yield之后的表达式，并返回一个值，然后中断函数的运行。因此，我们看到，第一次执行a.next()后，函数输出了"before say"和"hello!"。需要说明的是，每次执行完next函数之后，都会返回一个对象：

```Javascript
Object {value: undefined, done: false}
```

这个返回值有两个属性：**value**和**done**，generator对象通过这个返回值来告诉外界函数的执行情况。value的值是yield之后的表达式的值，done则是函数执行的状态，如果函数未执行完，则其值为false，否则是true。在sayHello中，yield之后是console语句，因此返回的对象中value为undefined。

这个时候，我们再次调用a.next()，程序输出"end say"。next函数的返回值变成这样：

```Javascript
Object {value: undefined, done: true}
```

可以发现done的值变为了true，因为函数已经执行完了。

Generator可以被用来作迭代器。

首先了解一下**迭代器**。在ES6规范中，新增了两个协议：[可迭代协议和迭代器协议][1]。在迭代器协议中指明，一个实现了next方法并且该方法的返回值有done和value两个属性的对象，可以被当做迭代器。这些要求正好符合我们的Generator对象。举一个被当做迭代器使用的例子：

```Javascript
function *range(start, end){
  for (let i = start; i < end; i++) {
    yield i;
  }
}
var a = range(0, 10);
// 输出0...9
for (let i of a) {
  console.log(i);
}
```

其实道理是一样的，Generator把程序的控制权交给了外部，哪里调用next，程序就在哪里执行。可想而知**for...of**的实现原理也一定是在内部循环执行了next方法，直到返回值的done属性变成true才停止。

为什么中间件必须是个Generator function？
-----------------------------

了解了Generator，回头再去看那段官方文档上搬来的代码。


```Javascript
var koa = require('koa');
var app = koa();

// x-response-time

app.use(function *(next){
  var start = new Date;
  yield next;
  var ms = new Date - start;
  this.set('X-Response-Time', ms + 'ms');
});

// logger

app.use(function *(next){
  var start = new Date;
  yield next;
  var ms = new Date - start;
  console.log('%s %s - %s', this.method, this.url, ms);
});

// response

app.use(function *(){
  this.body = 'Hello World';
});

app.listen(3000);
```

我们来分析代码。app.use将一个个中间件放入middlewares数组中，而app.listen启动了一个3000端口来监听http服务。实际上app.listen这个方法，底层是这样实现的：

```Javascript
var http = require('http');
var koa = require('koa');
var app = koa();
http.createServer(app.callback()).listen(3000);
```

这样你就明白了，当请求来临时，会触发在createServer时注册的回调函数（app.callback()的返回值），这个回调函数的执行其实就引发了一连串的中间件的执行。

先说结果，在探索原理。

middlewares数组中的这些中间件顺序执行，先开始进入第一个中间件 —— x-response-time，遇到yield中断执行，转而进入第二个中间件 —— logger，同样遇到yield中断执行，进入第三个中间件 —— response，这次没有遇到yield，第三个中间件执行完毕，页面输出"Hello World"，done的值变为true。这个时候，再返回去执行第二个中间件刚刚中断的地方，直到第二个中间件的done也变为true，返回第一个中间件刚刚中断的位置。

是不是很神奇？这些中间件就像洋葱一样，一层一层的深入进去，又一层一层的走出来。


![image](https://cloud.githubusercontent.com/assets/10726701/26280696/651c091a-3e11-11e7-939c-00a0329e4c6b.png)



那么Koa是如何实现这般神奇的流程控制的呢？

Koa内部依赖了一个叫co的流程控制库。

首先，Koa实现了一个叫Koa-compose的中间件，这个中间件用来将middlewares中的所有中间件串联起来。其实现代码如下：

```Javascript
/**
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 *
 * @param {Array} middleware
 * @return {Function}
 * @api public
 */
function compose(middleware){
  return function *(next){
    if (!next) next = noop();
    var i = middleware.length;
    while (i--) {
      next = middleware[i].call(this, next);
    }
    return yield *next;
  }
}
/**
 * Noop.
 *
 * @api private
 */
function *noop(){}
```

compose函数会返回一个能将众多中间件串联起来的Generator函数。这个函数从最后一个中间件开始执行，将生成的Generator对象扔给它的上一个中间件，依次类推，直到第一个中间件。这个结构真的很像一颗洋葱，从最后一个中间件开始，一层一层往上面包。

这样生成一个Generator对象之后，Koa把它交给了co这个流程控制库。co其实是个很抽象的东西。为了理解它的原理，我们可以先思考一下，如果把这个Generator对象交给我们，我们怎么类似于实现刚刚那个图所展示的效果？

从洋葱的最外层皮开始往里剥。执行第一次.next()函数，第一层中间件yield之前的程序执行完毕，通过yield next，我们拿到了第二层中间件的Generator对象。这个时候怎么办呢？按照刚刚那幅图，第一层中间件，必须要等到第二层中间件的done状态变为true之后，才可以继续执行之后的程序，即只有在第二层中间件的done状态变为true之后，才能再次执行第一层中间件Generator对象的.next()函数。同样的，之后所有的中间件都要重复这样的过程，第一层等待第二层，第二层等待第三层......那么当状态改变的时候，是不是应该有个人来通知我们？对，这个时候Promise就该出场了。

co将每个中间件.next()的运行结果的value属性都封装成一个Promise，在其done状态变为true时，resolve()这个Promise，对于洋葱里面的部分，每一层resolve之后，都会触发上一层中间件的.next()函数，并检查其状态。直到洋葱的最外面一层也resolve了，控制权就交还给Koa，而Koa会在这个时候，发起**response**。

co的大体思想就是这样，如果想继续深入，可以去看co的源码，自己实现一下应该也不会太难。

理解了洋葱模型，就不难明白，**yield**和**Promise**在其中所起的作用了。

关于Koa
-----

关于Koa，还有太多值得拿出来讨论的话题，我现在只是对Koa1.x中对Generator的使用做了一次整理，别的话题就慢慢再讨论吧。

最后，如果你有什么建议，欢迎不吝赐教~


  [1]: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Iteration_protocols
