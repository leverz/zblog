---
title: js 中的 Number 类型
date: '2019-10-05T22:41:00.000Z'
---

## 0.1 + 0.2 !== 0.3 ？
在初学编程的时候，数字类型总是把我整的一头雾水，C 里的各种 int, float, double 等等用起来好麻烦，数字就是数字，分那么细干嘛，写代码太累了。当我开始接触 js，简直开心坏了，终于不用关心到底是啥类型了，终于可以裸奔了，开心！然鹅，奔着奔着发现有点不太对劲，0.1 + 0.2 === 0.3 居然是 false，当时我就崩溃了，鉴于水平有限，把这个定性成 js 浮点运算的 bug，现在再回头来看看是怎么回事：

在 js 中 Number 类型实际上都是浮点数，是按照 [IEEE 754 标准](https://en.wikipedia.org/wiki/IEEE_754)实现的。从 wiki 上看，这个标准定义了几种内存存储格式：

![图片](https://uploader.shimo.im/f/6yAVhN8BmjY5q6jb.png!thumbnail)

而 js 的版本使用了 binary64 即双精度实型。在 binary64 格式中，数字以 64 位二进制存储，其存储格式如下所示：

![图片](https://uploader.shimo.im/f/HSHAW5zzjuAGGaHu.png!thumbnail)

0 - 51 为分数位，52 - 62 为指数位，63 为符号位。
按照 IEEE 754 的描述，在分数位之前，默认会有个隐藏位 1，有效数字将会被表示为 1.f，其中 f 就是 52 位分数，在 js 中整个浮点数可以用以下公式来表示：

![图片](https://uploader.shimo.im/f/MCWUD9W2cCoeVRk1.png!thumbnail)

指数部分有 11 位，在 JavaScript 中是从 1-2^{(11-1)} 即 -1023 开始的，所以指数位的十进制取值范围为 (-1023, 1024)。11 位二进制可以表示的数字范围 0 - 2047，因此在实现中，会用 1023 表示 0，用 2046 表示 1023。即公式中的指数值其实是 exponent - 1023 得到的。

有两个 exponent 值比较特殊：0 和 2047。

当 exponent = 2047，并且 f 值为 0 时，该值表示为无穷大，但如果 f > 0，该值则为 NaN。

当 exponent = 0，f 也为 0 时，该值可能为 +0 也可能为 -0，因为符号是单独用一个位去存的。

到这里 0.1 + 0.2 !== 0.3 也就可以知道原因了：0.1 和 0.2 都不能用 binary64 精确表示，精度的丢失导致最终计算结果产生了误差。
## 遇到 int64 怎么办？
int64 表示值介于	-2^63 ( -9,223,372,036,854,775,808) 到 2^63-1 (+9,223,372,036,854,775,807 )之间的整数。

而 js 中的 Number 虽然能够表示很大的数，但是一旦超过最大安全整数，就无法再保证精度了。这个最大安全整数和最小安全整数可以通过 Number.MAX_SAFE_INTEGER 和 Number.MIN_SAFE_INTEGER 拿到，其值分别为 9007199254740991 和 -9007199254740991，即 (2^53) - 1。

很明显，没办法精确的将 int64 中的全部数字转换到 js 的 Number 中，这可怎么办呢？

不要慌，遇到问题总是有办法解决的，我们先看看 protobufjs 是怎么解决这个问题的。
### longbits in protobufjs
protocol buffers 是一种序列化数据结构的协议，我们会在 proto 文件中定义好将要被使用的数据结构或接口。你可以把 protocol buffers 理解成类似于 json 或者 xml 之类的东西，他们都是语言无关的，不同语言只要基于协议的规范，把数据按照 proto 文件的定义进行序列化和反序列化即可。而 protobufjs 就是在 js 中用来序列化和反序列化 protocol buffers 数据的一个实现。

当我们基于 protocol buffers 协议在 nodejs 程序和程序传递数据时，就会遇到 int64 的问题，看下面这个例子：

```
// a.proto
...
message User {
  int64 id = 1;
}
...
```

在 proto 文件中定义了一个 User 数据结构，其 id 为 int64，按照之前的了解，js 中的数字一旦超过最大安全整数，就会丢失精度，因此 protobufjs 提供了一个配置项，来控制程序如何处理这种大数：
```

var object = UserMessage.toObject(message, {
  longs: String,  // longs as strings (requires long.js)
});
```

依据这里的参数，会把 user message 中所有的大整数转成对应的字符串。

有些情况，这个参数是没办法控制的：

```
// a.proto
...
message ListCustomLoginIDsByUserIDsResponse {
  map<int64,string> external_ids = 1;
}
...

// 在 nodejs 中拿到的经过 protobufjs 处理过后的数据长这样:
{
  "\u0001\u0000\u0000\u0000\u0000\u0000\u0000\u0000": "test"
}

```

说好的 map<int64, string> key 是 int64 咋变成这样了？咱也不知道这堆奇怪的字符串是个啥。

带着无数疑问翻了翻 protobufjs 的文档，发现一些端倪：
>Map fields are Object.<string,T> with the key being the string representation of the respective value or an 8 characters long binary hash string for Long-likes.

protobufjs 会把 protobuf 中的 map 类型的 key 的值转成字符串或者 8 字符长的二进制 hash 字符串。

数了一下，还真是 8 段，不过实在想不明白为什么不直接转成对应的字符串，翻了一遍提交历史也没找到原因，作者肯定有他自己的考虑吧，我的猜测是为了跟 proto 中定义的类型保持一致，而 js 中又没有 int64，所以作者用了这样一组特殊的 hash 来表示。

知道了这个字符串是怎么来的，再把它解回去就很简单了，protobufjs 也暴露了相关的 API 来处理：

```
const { LongBits } = require('protobufjs').util
LongBits.fromHash("\u0001\u0000\u0000\u0000\u0000\u0000\u0000\u0000").toNumber() // 1
```

protobufjs 依赖了 longjs 来处理这种大数，会把大数拆成低 32 位和高 32 位两部分，longjs 中也通过各种位运算实现了字符串和 long 的相互转换，以及 long 数字之间的各种运算，有兴趣的话可以去了解下。
### ES2020
BigInt 现在处在 ECMAScript 标准化过程中的第四阶段，可以说已经确定了会新增这个内置对象来处理 Number 精度不够用的问题。

BigInt 会在数字后面加一个 ”n“ 来区分普通数字和 BigInt，举个例子：

```
typeof 123 // "number"
typeof 123n // "bigint"
```

使用起来也跟正常的 Number 一样，不过在做数字运算的时候，必须保证运算符号两边都是 BigInt。

想了解更多可以看下 v8 提供的新特性文档：[https://v8.dev/features/bigint](https://v8.dev/features/bigint)

标准都支持了 BigInt，终于不用为大整数发愁了。不过浮点数运算的精度依旧没办法保证，按照原文的说法，BigInt 会成为实现 BigDecimal 的基础，相信不远的将来，js 中也能放心大胆的做各种运算了。
