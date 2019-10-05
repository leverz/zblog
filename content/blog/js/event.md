---
title: 「译」理解 Node.js 事件驱动机制
date: '2017-08-15T16:44:00.000Z'
---

学习 Node.js 一定要理解的内容之一，文中主要涉及到了 EventEmitter 的使用和一些异步情况的处理，比较偏基础，值得一读。

[阅读原文][1]

大多数 Node.js 对象都依赖了 EventEmitter 模块来监听和响应事件，比如我们常用的 HTTP requests, responses, 以及 streams。
```JavaScript
const EventEmitter = require('events');
```
事件驱动机制的最简单形式，是在 Node.js 中十分流行的回调函数，例如 fs.readFile。 在回调函数这种形式中，事件每被触发一次，回调就会被触发一次。

我们先来探索下这个最基本的方式。

## 你准备好了就叫我哈，Node！

很久很久以前，在 js 里还没有原生支持 Promise，async/await 还只是一个遥远的梦想，回调函数是处理异步问题的最原始的方式。

回调从本质上讲是传递给其他函数的函数，在 JavaScript 中函数是第一类对象，这也让回调的存在成为可能。

一定要搞清楚的是，回调在代码中的并不表示异步调用。 回调既可以是同步调用的，也可以是异步调用的。

举个例子，这里有一个宿主函数 fileSize，它接受一个回调函数 cb，并且可以通过条件判断来同步或者异步地调用该回调函数：

```JavaScript
function fileSize (fileName, cb) {
  if (typeof fileName !== 'string') {
    // Sync
    return cb(new TypeError('argument should be string'));
  }
  fs.stat(fileName, (err, stats) => {
    if (err) {
      // Async
      return cb(err);
     }
     // Async
    cb(null, stats.size);
  });
}
```

这其实也是个反例，这样写经常会引起一些意外的错误，在设计宿主函数的时候，应当尽可能的使用同一种风格，要么始终都是同步的使用回调，要么始终都是异步的。

我们来研究下一个典型的异步 Node 函数的简单示例，它用回调样式编写：
```JavaScript
const readFileAsArray = function(file, cb) {
  fs.readFile(file, function(err, data) {
    if (err) {
      return cb(err);
    }
    const lines = data.toString().trim().split('\n');
    cb(null, lines);
  });
};
```
readFileAsArray 函数接受两个参数：一个文件路径和一个回调函数。它读取文件内容，将其拆分成行数组，并将该数组作为回调函数的参数传入，调用回调函数。

现在设计一个用例，假设我们在同一目录中的文件 numbers.txt 包含如下内容：
```txt
10
11
12
13
14
15
```
如果我们有一个需求，要求统计该文件中的奇数数量，我们可以使用 readFileAsArray 来简化代码：
```JavaScript
readFileAsArray('./numbers.txt', (err, lines) => {
  if (err) throw err;
  const numbers = lines.map(Number);
  const oddNumbers = numbers.filter(n => n%2 === 1);
  console.log('Odd numbers count:', oddNumbers.length);
});
```
这段代码将文件内容读入字符串数组中，回调函数将其解析为数字，并计算奇数的个数。

这才是最纯粹的 Node 回调风格。回调的第一个参数要遵循错误优先的原则，err 可以为空，我们要将回调作为宿主函数的最后一个参数传递。你应该一直用这种方式这样设计你的函数，因为用户可能会假设。让宿主函数把回调当做其最后一个参数，并让回调函数以一个可能为空的错误对象作为其第一个参数。

## 回调在现代 JavaScript 中的替代品
在现代 JavaScript 中，我们有 Promise，Promise 可以用来替代异步 API 的回调。回调函数需要作为宿主函数的一个参数进行传递（多个宿主回调进行嵌套就形成了回调地狱），而且错误和成功都只能在其中进行处理。而 Promise 对象可以让我们分开处理成功和错误，还允许我们链式调用多个异步事件。

如果 readFileAsArray 函数支持 Promise，我们可以这样使用它，如下所示：
```JavaScript
readFileAsArray('./numbers.txt')
  .then(lines => {
    const numbers = lines.map(Number);
    const oddNumbers = numbers.filter(n => n%2 === 1);
    console.log('Odd numbers count:', oddNumbers.length);
  })
  .catch(console.error);
```
我们在宿主函数的返回值上调用了一个函数来处理我们的需求，这个 .then 函数会把刚刚在回调版本中的那个行数组传递给这里的匿名函数。为了处理错误，我们在结果上添加一个 .catch 调用，当发生错误时，它会捕捉到错误并让我们访问到这个错误。

在现代 JavaScript 中已经支持了 Promise 对象，因此我们可以很容易的将其使用在宿主函数之中。下面是支持 Promise 版本的 readFileAsArray 函数（同时支持旧有的回调函数方式）：
```JavaScript
const readFileAsArray = function(file, cb = () => {}) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, function(err, data) {
      if (err) {
        reject(err);
        return cb(err);
      }
      const lines = data.toString().trim().split('\n');
      resolve(lines);
      cb(null, lines);
    });
  });
};
```
我们使该函数返回一个 Promise 对象，该对象包裹了 fs.readFile 的异步调用。Promise 对象暴露了两个参数，一个 resolve 函数和一个 reject 函数。

当有异常抛出时，我们可以通过向回调函数传递 error 来处理错误，也同样可以使用 Promise 的 reject 函数。每当我们将数据交给回调函数处理时，我们同样也可以用 Promise 的 resolve 函数。

在这种同时可以使用回调和 Promise 的情况下，我们需要做的唯一一件事情就是为这个回调参数设置默认值，防止在没有传递回调函数参数时，其被执行然后报错的情况。 在这个例子中使用了一个简单的默认空函数：（）=> {}。

## 通过 async/await 使用 Promise
当需要连续调用异步函数时，使用 Promise 会让你的代码更容易编写。不断的使用回调会让事情变得越来越复杂，最终陷入回调地狱。

Promise 的出现改善了一点，Generator 的出现又改善了一点。 处理异步问题的最新解决方式是使用 async 函数，它允许我们将异步代码视为同步代码，使其整体上更加可读。

以下是使用 async/await 版本的调用 readFileAsArray 的例子：
```JavaScript
async function countOdd () {
  try {
    const lines = await readFileAsArray('./numbers');
    const numbers = lines.map(Number);
    const oddCount = numbers.filter(n => n%2 === 1).length;
    console.log('Odd numbers count:', oddCount);
  } catch(err) {
    console.error(err);
  }
}
countOdd();
```
首先，我们创建了一个 async 函数 —— 就是一个普通的函数声明之前，加了个 async 关键字。在 async 函数内部，我们调用了 readFileAsArray 函数，就像把它的返回值赋值给变量 lines 一样，为了真的拿到 readFileAsArray 处理生成的行数组，我们使用关键字 await。之后，我们继续执行代码，就好像 readFileAsArray 的调用是同步的一样。

要让代码运行，我们可以直接调用 async 函数。这让我们的代码变得更加简单和易读。为了处理异常，我们需要将异步调用包装在一个 try/catch 语句中。

有了 async/await 这个特性，我们不必使用任何特殊的API（如 .then 和 .catch ）。我们只是把这种函数标记出来，然后使用纯粹的 JavaScript 写代码。

我们可以把 async/await 这个特性用在支持使用 Promise 处理后续逻辑的函数上。但是，它无法用在只支持回调的异步函数上（例如setTimeout）。

## EventEmitter 模块
EventEmitter 是一个处理 Node 中各个对象之间通信的模块。 EventEmitter 是 Node 异步事件驱动架构的核心。 Node 的许多内置模块都继承自 EventEmitter。

它的概念其实很简单：emitter 对象会发出被定义过的事件，导致之前注册的所有监听该事件的函数被调用。所以，emitter 对象基本上有两个主要特征：

 - 触发定义过的事件
 - 注册或者取消注册监听函数

为了使用 EventEmitter，我们需要创建一个继承自 EventEmitter 的类。
```JavaScript
class MyEmitter extends EventEmitter {
}
```
我们从 EventEmitter 的子类实例化的对象，就是 emitter 对象：
```JavaScript
const myEmitter = new MyEmitter();
```
在这些 emitter 对象的生命周期里，我们可以调用 emit 函数来触发我们想要的触发的任何被命名过的事件。
```JavaScript
myEmitter.emit('something-happened');
```
emit 函数的使用表示发生某种情况发生了，让大家去做该做的事情。 这种情况通常是某些状态变化引起的。

我们可以使用 on 方法添加监听器函数，并且每次 emitter 对象触发其关联的事件时，将执行这些监听器函数。

## 事件 !== 异步
先看看这个例子：
```JavaScript
const EventEmitter = require('events');

class WithLog extends EventEmitter {
  execute(taskFunc) {
    console.log('Before executing');
    this.emit('begin');
    taskFunc();
    this.emit('end');
    console.log('After executing');
  }
}

const withLog = new WithLog();

withLog.on('begin', () => console.log('About to execute'));
withLog.on('end', () => console.log('Done with execute'));

withLog.execute(() => console.log('*** Executing task ***'));
```
WithLog 是一个事件触发器，它有一个方法 —— execute，该方法接受一个参数，即具体要处理的任务函数，并在其前后包裹 log 以输出其执行日志。

为了看到这里会以什么顺序执行，我们在两个命名的事件上都注册了监听器，最后执行一个简单的任务来触发事件。

下面是上面程序的输出结果：
```log
Before executing
About to execute
*** Executing task ***
Done with execute
After executing
```
这里我想证实的是以上的输出都是同步发生的，这段代码里没有什么异步的成分。
 - 第一行输出了 "Before executing"
 - begin 事件被触发，输出 "About to execute"
 - 真正应该被执行的任务函数被调用，输出 "*** Executing task ***"
 - end 事件被触发，输出 "Done with execute"
 - 最后输出 "After executing"

就像普通的回调一样，不要以为事件意味着同步或异步代码。

跟之前的回调一样，不要一提到事件就认为它是异步的或者同步的，还要具体分析。

如果我们传递 taskFunc 是一个异步函数，会发生什么呢？
```JavaScript
// ...

withLog.execute(() => {
  setImmediate(() => {
    console.log('*** Executing task ***')
  });
});
```
输出结果变成了这样：
```log
Before executing
About to execute
Done with execute
After executing
*** Executing task ***
```
这样就有问题了，异步函数的调用导致 "Done with execute" 和 "After executing" 的输出并不准确。

要在异步函数完成后发出事件，我们需要将回调（或 Promise）与基于事件的通信相结合。 下面的例子说明了这一点。

使用事件而不是常规回调的一个好处是，我们可以通过定义多个监听器对相同的信号做出多个不同的反应。如果使用回调来完成这件事，我们要在单个回调中写更多的处理逻辑。事件是应用程序允许多个外部插件在应用程序核心之上构建功能的好办法。你可以把它们当成钩子来挂一些由于状态变化而引发执行的程序。

## 异步事件
我们把刚刚那些同步代码的示例改成异步的：
```JavaScript
const fs = require('fs');
const EventEmitter = require('events');

class WithTime extends EventEmitter {
  execute(asyncFunc, ...args) {
    this.emit('begin');
    console.time('execute');
    asyncFunc(...args, (err, data) => {
      if (err) {
        return this.emit('error', err);
      }

      this.emit('data', data);
      console.timeEnd('execute');
      this.emit('end');
    });
  }
}

const withTime = new WithTime();

withTime.on('begin', () => console.log('About to execute'));
withTime.on('end', () => console.log('Done with execute'));

withTime.execute(fs.readFile, __filename);

```

用 WithTime 类执行 asyncFunc 函数，并通过调用 console.time 和 console.timeEnd 报告该asyncFunc 所花费的时间。它在执行之前和之后都将以正确的顺序触发相应的事件，并且还会发出 error/data 事件作为处理异步调用的信号。

我们传递一个异步的 fs.readFile 函数来测试一下 withTime emitter。 我们现在可以直接通过监听 data 事件来处理读取到的文件数据，而不用把这套处理逻辑写到 fs.readFile 的回调函数中。

执行这段代码，我们以预期的顺序执行了一系列事件，并且得到异步函数的执行时间，这些是十分重要的。
```log
About to execute
execute: 4.507ms
Done with execute
```
请注意，我们是将回调与事件触发器 emitter 相结合实现的这部分功能。 如果 asynFunc 支持Promise，我们可以使用 async/await 函数来做同样的事情：
```JavaScript
class WithTime extends EventEmitter {
  async execute(asyncFunc, ...args) {
    this.emit('begin');
    try {
      console.time('execute');
      const data = await asyncFunc(...args);
      this.emit('data', data);
      console.timeEnd('execute');
      this.emit('end');
    } catch(err) {
      this.emit('error', err);
    }
  }
}
```
我认为这段代码比之前的回调风格的代码以及使用 .then/.catch 风格的代码更具可读性。async/await 让我们更加接近 JavaScript 语言本身（不必再使用 .then/.catch 这些 api）。
## 事件参数和错误
在之前的例子中，有两个事件被发出时还携带了别的参数。

error 事件被触发时会携带一个 error 对象。
```JavaScript
this.emit('error', err);
```
data 事件被触发时会携带一个 data 对象。
```JavaScript
this.emit('data', data);
```
我们可以在 emit 函数中不断的添加参数，当然第一个参数一定是事件的名称，除去第一个参数之外的所有参数都可以在该事件注册的监听器中使用。

例如，要处理 data 事件，我们注册的监听器函数将访问传递给 emit 函数的 data 参数，而这个 data 也正是由 asyncFunc 返回的数据。
```JavaScript
withTime.on('data', (data) => {
  // do something with data
});
```
error 事件比较特殊。在我们基于回调的那个示例中，如果不使用监听器处理 error 事件，node 进程将会退出。

举个由于错误使用参数而造成程序崩溃的例子：
```JavaScript
class WithTime extends EventEmitter {
  execute(asyncFunc, ...args) {
    console.time('execute');
    asyncFunc(...args, (err, data) => {
      if (err) {
        return this.emit('error', err); // Not Handled
      }

      console.timeEnd('execute');
    });
  }
}

const withTime = new WithTime();

withTime.execute(fs.readFile, ''); // BAD CALL
withTime.execute(fs.readFile, __filename);
```
第一次调用 execute 将会触发 error 事件，由于没有处理 error ，Node 程序随之崩溃：
```log
events.js:163
      throw er; // Unhandled 'error' event
      ^
Error: ENOENT: no such file or directory, open ''
```
第二次执行调用将受到此崩溃的影响，并且可能根本不会被执行。

如果我们为这个 error 事件注册一个监听器函数来处理 error，结果将大不相同：
```JavaScript
withTime.on('error', (err) => {
  // do something with err, for example log it somewhere
  console.log(err)
});
```
如果我们执行上述操作，将会报告第一次执行 execute 时发送的错误，但是这次 node 进程不会崩溃退出，其他程序的调用也都能正常完成：
```log
{ Error: ENOENT: no such file or directory, open '' errno: -2, code: 'ENOENT', syscall: 'open', path: '' }
execute: 4.276ms
```
需要注意的是，基于 Promise 的函数有些不同，它们暂时只是输出一个警告:
```log
UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): Error: ENOENT: no such file or directory, open ''

DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
```
另一种处理异常的方式是在监听全局的 uncaughtException 进程事件。 然而，使用该事件全局捕获错误并不是一个好办法。

关于 uncaughtException，一般都会建议你避免使用它，但是如果必须用它，你应该让进程退出：
```JavaScript
process.on('uncaughtException', (err) => {
  // something went unhandled.
  // Do any cleanup and exit anyway!

  console.error(err); // don't do just that.

  // FORCE exit the process too.
  process.exit(1);
});
```
但是，假设在同一时间发生多个错误事件，这意味着上面的 uncaughtException 监听器将被多次触发，这可能会引起一些问题。

EventEmitter 模块暴露了 once 方法，这个方法发出的信号只会调用一次监听器。所以，这个方法常与 uncaughtException 一起使用。
## 监听器的顺序
如果针对一个事件注册多个监听器函数，当事件被触发时，这些监听器函数将按其注册的顺序被触发。
```JavaScript
// first
withTime.on('data', (data) => {
  console.log(`Length: ${data.length}`);
});

// second
withTime.on('data', (data) => {
  console.log(`Characters: ${data.toString().length}`);
});

withTime.execute(fs.readFile, __filename);
```
上述代码会先输出 Length 信息，再输出 Characters 信息，执行的顺序与注册的顺序保持一致。

如果你想定义一个新的监听函数，但是希望它能够第一个被执行，你还可以使用 prependListener 方法：
```JavaScript
withTime.on('data', (data) => {
  console.log(`Length: ${data.length}`);
});

withTime.prependListener('data', (data) => {
  console.log(`Characters: ${data.toString().length}`);
});

withTime.execute(fs.readFile, __filename);
```
上述代码中，Charaters 信息将首先被输出。

最后，你可以用 removeListener 函数来删除某个监听器函数。


  [1]: https://medium.freecodecamp.org/understanding-node-js-event-driven-architecture-223292fcbc2d
