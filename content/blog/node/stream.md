---
title: 「译」Node.js Streams 你应该知道的事情
date: '2017-09-08T16:45:00.000Z'
---

阅读本文需要一定的 Node.js 基础，如果文中出现了一些不太理解的地方，记得用搜索引擎或者 Node 官方文档来解惑。

生产者消费者问题：https://zh.wikipedia.org/zh-hans/%E7%94%9F%E4%BA%A7%E8%80%85%E6%B6%88%E8%B4%B9%E8%80%85%E9%97%AE%E9%A2%98

小胡子哥的文章：http://www.barretlee.com/blog/2017/06/06/dive-to-nodejs-at-stream-module/

发现这篇文章也不错：https://github.com/zhengweikeng/blog/issues/4

[阅读原文][1]

大家都觉得 Node.js streams 很难用，更难理解。那么我有一个好消息告诉你，现在已经不再这样了。

这些年来，开发者为了让 streams 更好用造了很多轮子。在这篇文章中，我把重点放在原生的 [Node.js stream API][2]。

Streams 是 Node 里最好的也是被误解最深的主意。

# streams 到底是啥？

streams 是类似于数组或者字符串那样的数据集合。不同之处在于，streams 有些时候不会一次性拿出所有数据，因此也不必担心其大小超过内存。 当处理大量数据时，streams 真的很强大。

streams 不仅被用在大数据量的处理上，使用 streams 还能让我们的代码更具组合型。就像在 Linux 上可以通过管道符将其他较小的命令组成强大的命令一样，我们可以在 Node 中使用 streams 实现一样的效果。
![image.png!thumbnail][3]

```JavaScript
const grep = ... // A stream for the grep output
const wc = ... // A stream for the wc input
grep.pipe(wc)
```

Node.js 中许多内置模块都实现了 streams 接口。

![image.png!thumbnail][4]

上面的列表中罗列了一些原生 Node.js 对象，这些对象也是可读或者可写的 streams。在这些对象中，有些既是可读流，也是可写流，比如 TCP sockets，zlib 和 crypto 。

这些对象是紧密相关的。虽然 HTTP 响应流在客户端上是可读的，但它在服务器上是可写的。这是因为在 HTTP 情况下，我们是从一个对象（http.IncomingMessage）读取，从另一个对象写入（http.ServerResponse）。

还要注意，父进程中 stdin 是可读流，stdout 和 stderr 是可写流。而在子进程中，正好与父进程相反，stdin 是可写流，而 stdout 和 stderr 是可读流。这方便了我们管理来自主进程的 stdio 流。（译者注：我的理解是，子进程的 stdin 一般需要接收来自父进程的输入，所以应当设计成可写的，子进程的输出，一般需要导回到父进程中，所以应当设计成可读的）

# streams 的实际使用示例

理论都是美好的，但其实往往不具有足够的说服力。我们来看一个能够彰显 streams 在内存消耗上的不同之处的例子。

我们先要制造一个大文件来充当测试用例：

```JavaScript
const fs = require('fs');
const file = fs.createWriteStream('./big.file');

for(let i=0; i<= 1e6; i++) {
  file.write('Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n');
}

file.end();
```

我用了可写流来制造这个大文件。

fs 模块实现了 streams 的接口，使其既可以被用来读取文件，又可以用来执行写入的操作。在上面的例子中，我们通过循环的调用可写流，在该文件中写入了 100 万行。

跑一下上面的脚本将会生成一个大小 400 MB 左右的文件。

这是一个简单的 Node web 服务器，专门为 big.file 提供服务：

```JavaScript
const fs = require('fs');
const server = require('http').createServer();

server.on('request', (req, res) => {
  fs.readFile('./big.file', (err, data) => {
    if (err) throw err;

    res.end(data);
  });
});

server.listen(8000);
```

当服务器获得请求时，它将使用异步方法 fs.readFile 读取大文件并返回给客户端。很简单的几行代码，看上去其表现不会跟一大堆事件循环或者其他复杂的代码那样。

那么，让我们运行服务器，并在请求这个文件时监视内存，看看会发生什么。

当我启动服务时，它开始处于一个正常的内存量，8.7 MB：

![image.png!thumbnail][5]

然后我发起请求，注意看内存用量发生了什么变化：

![gif][6]

内存用量居然涨到了 434.8 MB。

我们基本上把整个 big.file 的内容都放在内存中了，然后再把它写到响应对象中。这是非常低效的。

HTTP 响应对象（上面的代码中的 res ）也是可写的流。这意味着如果我们有一个代表 big.file 的内容的可读流，我们可以直接让这两个对象通过 pipe 连接，不用耗费 400 MB 的内存就能实现相同的功能。

fs 模块可以使用 createReadStream 方法为任何文件提供可读的流。 我们可以将其传递给响应对象：

```JavaScript
const fs = require('fs');
const server = require('http').createServer();

server.on('request', (req, res) => {
  const src = fs.createReadStream('./big.file');
  src.pipe(res);
});

server.listen(8000);
```
现在，当你再次发出请求，会发生一个神奇的事情（看内存消耗）：

![gif][7]

发生了什么？

当客户端请求这个大文件时，我们每次流式传输一个块，这意味着我们不会在内存中缓存该文件。内存的使用量大约增长了25 MB，就是这样。

你可以将此示例推到极限。 重新生成 500 万行而不是 100 万行的 big.file 文件，这将使文件占用超过 2 GB，实际上超过了 Node 中的默认缓冲区限制。

默认情况下（你可以更改限制），你是没办法用 fs.readFile 来向客户端提供该文件的。但是使用 fs.createReadStream，将2 GB的数据传输给请求者完全没问题，最重要的是，进程内存使用量也跟之前大致相同。

现在，你准备好学习 streams 了么？

# Streams 101

Node.js 中有四种基本流类型：Readable（可读流）, Writeable（可写流）, Duplex（双工流）, Transform（转换流）

 - 可读流是可以从中消费数据的数据源的抽象。fs.createReadStream 方法就是个例子。
 - 可写流是可以被写入数据的目标的抽象。fs.createWriteStream 方法就是个例子。
 - 双工流既可读又可写。TCP socket 就是个例子。
 - 转换流基本上是一个双工流，可以用于在写入和读取数据时修改或转换数据。 一个例子是使用 gzip 压缩数据的 zlib.createGzip 流。你可以将转换流视为函数，其中输入是可写入流部分，输出是可读流部分。你也可能会听转换流被称为 ”through streams” 。

所有流都是 EventEmitter 的实例。它们发出可用于读取和写入数据的事件。但其实我们有更简单的处理流数据的办法 —— pipe。

## pipe 方法

下面这个魔法公式你应该记住：

```JavaScript
readableSrc.pipe(writableDest)
```

这行简单的代码中，我们将可读流的输出（数据源）作为可写流的输入。源必须是可读流，目标必须是可写流。当然，它们也可以是双工/转换流。实际上，如果我们正在处理一个双工流，那我们就可以像在Linux中一样将 pipe 链式调用：

```JavaScript
readableSrc
  .pipe(transformStream1)
  .pipe(transformStream2)
  .pipe(finalWrtitableDest)
```

管道方法返回目标流，这使我们能够在上面进行连续调用。 对于流 a（可读），b和c（双工）和d（可写），我们可以这样做：

```JavaScript
a.pipe(b).pipe(c).pipe(d)

# Which is equivalent to:
a.pipe(b)
b.pipe(c)
c.pipe(d)

# Which, in Linux, is equivalent to:
$ a | b | c | d
```


pipe 方法是最简单的消费流的方法。一般比较建议使用 pipe 方法或使用事件来消费流，但应该避免混合使用这两种方式。通常当你使用 pipe 方法时，不需要使用事件，但是如果你需要以自定义的方式使用 streams，那么使用事件可能有些必要。

## Stream events

除了从可读流源读取并写入可写流目的地之外，pipe 方法还会自动管理一些事情。例如，错误处理，文件结尾以及一个流比另一个流慢或快的情况。

然而，流也可以直接与事件一起使用。以下是 pipe 方法主要用于读取和写入数据的简化事件等效代码：

```JavaScript
# readable.pipe(writable)

readable.on('data', (chunk) => {
  writable.write(chunk);
});

readable.on('end', () => {
  writable.end();
});
```

以下是可以被用来处理可读流和可写流重要事件和函数列表：

![image.png!thumbnail][8]

事件和函数在某种程度上是相关的，因为它们通常被一起使用。

可读流中最重要的事件是：
 - data 事件：当流将一块数据传递给消费者时，该事件被触发
 - end 事件：当 streams 中没有数据时，该事件被触发
可写流中最重要的事件是：
 - drain 事件：可写入流可以接收更多数据的信号。
 - finish 事件：当所有数据写入完毕时会触发该事件。
事件和函数可以结合起来使用，以便定制和优化流。要使用可读流，我们可以使用 pipe/unpipe ，或者 read/unshift/resume 方法。要使用可写流，我们可以将其作为 pipe/unpipe 的目标，或者用 write 方法写入它，并在完成后调用 end 方法。

## 可读流的暂停和流动模式

可读流具有两种主要模式会影响我们消费数据的方式：
 - 可读流可能处于暂停模式
 - 也可能处于流动模式
这两种模式也常被称为 pull 和 push 模式。

默认情况下，所有可读流可在暂停模式下启动，在需要时也可以轻松切换到流动状态或者返回到暂停状态。 有时这两种模式会自动切换。

当可读流处于暂停模式时，我们可以使用 read() 方法从流按需读取，然而，对于流模式中的可读流，数据持续流动，我们必须监听事件不断消耗它。

在流动模式下，如果没有消费者在处理它，数据实际上可能会丢失（译者注：生产者一直向缓冲区导入数据，等到缓冲区满了，却一直没有人来消费他，这块空间可能会被释放掉）。这就是为什么在流动模式下有可读流时，需要一个 data 事件处理程序。事实上，只需添加一个 data 事件处理程序即可将暂停的流转换为流模式，而删除 data 事件的处理程序将把流切换回暂停模式。这么做的一部分原因是为了兼容旧的 Node Streams 接口。

要手动切换这两种流模式，可以使用 resume() 和 pause() 方法。

![image.png!thumbnail][9]

当使用管道方法消耗可读流时，我们不必担心管道自动管理这些模式。

# 实现 Streams

当我们在 Node 中使用 streams 时，主要有两种不同的任务：
 - 一个任务是实现 streams
 - 另一个是消费 streams
到目前为止，我们一直都在讨论怎么消耗流。接下来，让我们实现一些 streams！

stream 的实现者通常是需要依赖 stream 模块。

## 实现一个可写流

要实现可写流，我们需要使用 stream 模块中的 Writable 构造函数。

```JavaScript
const { Writable } = require('stream');
```

我们可以通过很多方式实现一个可写流。 例如，我们可以继承 Writable

```JavaScript
class myWritableStream extends Writable {
}
```
然而，我喜欢更简单的构造方法。我们只是从 Writable 构造函数创建一个对象，并传递一些选项。 唯一必需的选项是 write 函数，它要处理写入的数据块。

```JavaScript
const { Writable } = require('stream');
const outStream = new Writable({
  write(chunk, encoding, callback) {
    console.log(chunk.toString());
    callback();
  }
});

process.stdin.pipe(outStream);
```

write 函数接受三个参数：
 - chunk 参数通常是 buffer ，当然也可以通过配置修改参数的类型。
 - encoding 在某种情况下是必须的，但通常我们可以忽略它。
 - callback 是处理完数据块后我们需要调用的函数。这是写操作是否成功的信号。要发出失败信号，只要把 error 对象传入回调即可。

在 outStream 中，我们只是将 chunk 作为一个字符串进行 console.log，然后在没有错误的情况下调用回调来表示成功。这是一个很简单的 echo 流，它会输出任何收到的东西。

要消费这个流，我们可以直接使用 process.stdin，这是一个可读流，所以我们可以将 process.stdin 通过 pipe 传入 outstream。

当我们运行上面的代码时，我们输入到 process.stdin 的任何内容都将会使用 outStream 中的  console.log 来输出。

这个例子其实没啥用，实际上 node 已经内置了这个功能 —— process.stdout。我们可以将stdin 通过 pipe 输入到 stdout 中，我们可以用一行代码实现刚刚的 echo 功能：

```JavaScript
process.stdin.pipe(process.stdout);
```

## 实现一个可读流
为了实现可读流，我们需要 Readable 接口并从中构造一个对象：
```JavaScript
const { Readable } = require('stream');

const inStream = new Readable({});
```
有一种实现可读流的简单方法，我们可以直接 push 我们想要消费者消费的数据。

```JavaScript
const { Readable } = require('stream');

const inStream = new Readable();

inStream.push('ABCDEFGHIJKLM');
inStream.push('NOPQRSTUVWXYZ');

inStream.push(null); // No more data

inStream.pipe(process.stdout);
```
当我们向 inStream 中 push null 时，意味着没有数据要继续 push 了。

为了消费这些数据，我们用 pipe 把他们导入到了 process.stdout 中。

当我们运行上面的代码时，我们将从 inStream 读取所有数据，并将其输出到标准输出流中。 很简单，但不高效。

我们基本上将流中的所有数据推送到 process.stdout 。更好的方法是在消费者要求时按需推送数据。我们可以通过在可读流配置中实现 read() 方法：

```JavaScript
const inStream = new Readable({
  read(size) {
    // there is a demand on the data... Someone wants to read it.
  }
});
```

当读取方法在可读流上被调用时，该实现可以将部分数据推送到队列。例如，我们可以一次推一个字母，从字符代码 65（表示A）开始，并在每次推送时递增：

```JavaScript
const inStream = new Readable({
  read(size) {
    this.push(String.fromCharCode(this.currentCharCode++));
    if (this.currentCharCode > 90) {
      this.push(null);
    }
  }
});

inStream.currentCharCode = 65;

inStream.pipe(process.stdout);
```

当消费者正在消费可读流时，read 方法将被持续触发，每次触发，又会有新的流进入缓冲区。 我们要在某个地方停止这个循环，这就是为什么当 currentCharCode 大于90（表示Z）时，if 语句推送 null 。

此代码的效果等同于我们刚开始使用的那段代码，不同之处在于，现在可以按需推送数据。这么做永远不会错~

## 实现双工/转换流

双工流可以让一个对象既可读又可写。就好像这个对象继承了两个接口。

下面这个例子通过双工流实现了上面那两个可读流和可写流的功能：

```JavaScript
const { Duplex } = require('stream');

const inoutStream = new Duplex({
  write(chunk, encoding, callback) {
    console.log(chunk.toString());
    callback();
  },

  read(size) {
    this.push(String.fromCharCode(this.currentCharCode++));
    if (this.currentCharCode > 90) {
      this.push(null);
    }
  }
});

inoutStream.currentCharCode = 65;
process.stdin.pipe(inoutStream).pipe(process.stdout);
```

通过组合这些方法，我们可以使用这个双工流来读取从 A 到 Z 的字母，我们还能利用它能够输出的特征。我们将可读的 stdin 流通过 pipe 导入到这个双工流中以使用 echo 功能，并将双工流本身通过 pipe 导入到可写入的 stdout 流中，以查看字母 A 到 Z 。

重要的是要了解双工流的可读和可写是完全独立运行的。双工流只是将两个特征组合到了一个对象上。

转换流是更有趣的双工流，因为它的输出是从其输入计算的。

对于一个转换流，我们不需要实现 read 或者 write 方法，只需要实现一个结合二者的 transform 方法。我们既可以通过 write 方法写入，也可以使用它来 push 数据。

下面这个例子是一个简单的转换流，它将你的输入转换为大写格式后再输出：

```JavaScript
const { Transform } = require('stream');

const upperCaseTr = new Transform({
  transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
});

process.stdin.pipe(upperCaseTr).pipe(process.stdout);
```

在这个转换流中，我们正在消费的数据与之前的双工流示例的数据一样，我们只实现了一个transform() 方法。 在该方法中，我们将 chunk 转换为大写版本，然后将该版本推送为可读部分。

## 流对象模式

默认情况下，流期望处理的值是 Buffer/String 类型。 有一个 objectMode 标志，我们可以设置为让流接受任何 JavaScript 对象。

可以用一个简单的例子来演示一下。以下转换流的组合使得将逗号分隔值的字符串映射为 JavaScript 对象的功能。 所以 “a，b，c，d” 成为 {a：b，c：d} 。

```JavaScript
const { Transform } = require('stream');

const commaSplitter = new Transform({
  readableObjectMode: true,

  transform(chunk, encoding, callback) {
    this.push(chunk.toString().trim().split(','));
    callback();
  }
});

const arrayToObject = new Transform({
  readableObjectMode: true,
  writableObjectMode: true,

  transform(chunk, encoding, callback) {
    const obj = {};
    for (let i=0; i < chunk.length; i+=2) {
      obj[chunk[i]] = chunk[i+1];
    }
    this.push(obj);
    callback();
  }
});

const objectToString = new Transform({
  writableObjectMode: true,

  transform(chunk, encoding, callback) {
    this.push(JSON.stringify(chunk) + '\n');
    callback();
  }
});

process.stdin
  .pipe(commaSplitter)
  .pipe(arrayToObject)
  .pipe(objectToString)
  .pipe(process.stdout)
```

我们通过 commaSplitter 传递输入字符串（例如，“a，b，c，d”），它将输入转换为数组并将其作为可读数据（[“a”，“b”，“c”，“d”]）。readableObjectMode 这个属性的配置必不可少，因为我们是要把一个 JavaScript 对象 push 进来。

然后我们把数组用 pipe 导入到 arrayToObject 数据流中。我们需要配置一个 writableObjectMode 属性来使该流接受一个对象。我们还需要把最后的结果 push 到可读流中，因此 readableObjectMode 这个属性也是必要的。最后一个 objectToString 流接受一个对象但是导出的结果是一个字符串，所以我们需要 writableObjectMode 属性来处理输入的对象，但是因为输出到可读流的是字符串，所以不需要配置 readableObjectMode 属性。（译者注：所以，如果是要让可读流支持 js 对象，要设置 readableObjectMode，要让可写流支持 js 对象，要设置 writeableObjectMode）

![image.png!thumbnail][10]

## Node 内置 transform streams
Node 内置了一些非常有用的转换流。即 zlib 和 crypto。

下面是一个使用 zlib.createGzip() 流结合 fs 可读/可写流创建文件压缩脚本的示例：

```JavaScript
const fs = require('fs');
const zlib = require('zlib');
const file = process.argv[2];

fs.createReadStream(file)
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream(file + '.gz'));
```
你可以用这个脚本指定的文件进行 gzip 压缩。我们将该文件处理成一个可读流并使用 pipe 输入到 zlib 内置的转换流中，然后将新的 gzip 压缩文件转换可写流写入文件。

使用 pipe 很酷的地方在于，只要我们需要，就可以把它们跟事件结合起来。例如，我希望用户在脚本运行时能够看到一个进度条，并且在脚本工作完成时能够显示 “Done” 消息。由于 pipe 方法恰好能够返回目标流，我们可以链式调用事件处理程序的注册程序：

```JavaScript
const fs = require('fs');
const zlib = require('zlib');
const file = process.argv[2];

fs.createReadStream(file)
  .pipe(zlib.createGzip())
  .on('data', () => process.stdout.write('.'))
  .pipe(fs.createWriteStream(file + '.gz'))
  .on('finish', () => console.log('Done'));
```

使用 pipe 方法，我们可以很轻松地消费流，我们还能够使用需要的事件进一步定制与这些流的交互。

pipe 方法能够把我们的程序解构成一步一步的方式，让我们的程序更具可读性。例如，我们可以创建一个简单的转换流来报告进度，而不用像上面那样监听 data 事件，可以直接拿 pipe() 替换 on() ：

```JavaScript
const fs = require('fs');
const zlib = require('zlib');
const file = process.argv[2];

const { Transform } = require('stream');

const reportProgress = new Transform({
  transform(chunk, encoding, callback) {
    process.stdout.write('.');
    callback(null, chunk);
  }
});

fs.createReadStream(file)
  .pipe(zlib.createGzip())
  .pipe(reportProgress)
  .pipe(fs.createWriteStream(file + '.gz'))
  .on('finish', () => console.log('Done'));
```
reportProgress 流是一个简单的直通流，同时它也将进度标准化。注意我如何在回调函数中使用第二个参数来推送 transform() 方法中的数据。 这相当于 push 数据。

把各种流组合起来可以完成很多事，例如，如果我们需要在 gzip 之前或之后加密文件，需要做的就是按照需求的顺序来管理另一个转换流。我们可以使用 Node 的 crypto 模块：

```JavaScript
const crypto = require('crypto');
// ...

fs.createReadStream(file)
  .pipe(zlib.createGzip())
  .pipe(crypto.createCipher('aes192', 'a_secret'))
  .pipe(reportProgress)
  .pipe(fs.createWriteStream(file + '.gz'))
  .on('finish', () => console.log('Done'));
```
上面的脚本压缩然后加密传递的文件，只有知道秘钥的人才可以使用输出的文件。我们无法使用正常的解压工具来解压这个文件，因为它已被加密。

为了能够解压以上脚本压缩的文件，我们需要以相反的顺序使用 crypto 的解密功能和 zlib 的解压缩功能：
```JavaScript
fs.createReadStream(file)
  .pipe(crypto.createDecipher('aes192', 'a_secret'))
  .pipe(zlib.createGunzip())
  .pipe(reportProgress)
  .pipe(fs.createWriteStream(file.slice(0, -3)))
  .on('finish', () => console.log('Done'));
```
假设传递的文件是压缩版本，上面的代码先创建了一个可读流，将该文件传输到 crypto.createDecipher() 流中（使用相同的秘钥），将结果通过 pipe 输入到 zlib.createGunzip() 流中， 然后将最终结果写到文件中。

感谢阅读~

  [1]: https://medium.freecodecamp.org/node-js-streams-everything-you-need-to-know-c9141306be93
  [2]: https://nodejs.org/api/stream.html
  [3]: https://segmentfault.com/img/bVUFOY?w=1426&h=182
  [4]: https://segmentfault.com/img/bVUFPm?w=1600&h=947
  [5]: https://segmentfault.com/img/bVUFPR?w=1600&h=844
  [6]: https://segmentfault.com/img/bVUFQh?w=899&h=691
  [7]: https://segmentfault.com/img/bVUFSX?w=900&h=692
  [8]: https://segmentfault.com/img/bVUFUf?w=1600&h=919
  [9]: https://segmentfault.com/img/bVUFUD?w=1600&h=891
  [10]: https://segmentfault.com/img/bVUFVY?w=482&h=210
