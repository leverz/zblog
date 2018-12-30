---
title: 「译」用 Node.js 搭建 API Gateway
date: '2017-08-09T16:42:00.000Z'
---

我们团队的后端服务中，一开始只有一个大服务，所有的东西都往里面写，可以想象下，当这个服务变得不断的庞大，将会变得多么难以维护。后来逐渐把一些数据服务抽离成单独的 API 服务，在原有的服务里，就还剩一些模板渲染，数据聚合还有一些耦合的业务逻辑。目前来说拆的还不够干净，我们的目标其实是希望这个旧的服务充当一个 API Gateway，或者说一个给前端用的中间层。单一职责原则，其实是一个很重要的解耦方式，一个服务干好一件事就好了。偶然间看到下面的文章，虽然只是一些很简单的介绍，也让我了解到很多东西。也分享给 大家看看。

[阅读原文](https://blog.risingstack.com/building-an-api-gateway-using-nodejs/?utm_source=RisingStack+Engineering&utm_campaign=cf6ea5b2e0-EMAIL_CAMPAIGN_2017_08_03&utm_medium=email&utm_term=0_02a6a69990-cf6ea5b2e0-475054665)

客户端一般都需要经过一些认证以及满足在数据传输时的安全要求，才能获得访问微服务架构中的服务的权利。不同的服务在认证上都会或多或少存在一些差异，API Gateway 就像一个集线器，用它来抹平各种服务协议之间的差异，并满足对特定客户端的特殊处理。他的存在，方便了客户端对各类服务的享用。

## 微服务和消费者

微服务适合用在团队可以独立设计、开发、运行服务的架构体系中。它允许系统中的各个服务存在技术多样性，团队可以在适合的场景使用合适的开发语言、数据库和网络协议。例如，一个团队中使用 JSON 和 HTTP REST，而另一个团队则可能使用 gRPC 和 HTTP/2 或者像 [RabbitMQ](http://blog.csdn.net/anzhsoft/article/details/19563091) 这样的消息代理。

有些场景中使用不同的数据序列化方式和协议可能收益巨大，但是需要使用我们服务的客户端可能会有不同的需求。由于存在各种各样的客户端，需要我们支持的数据格式也是多种多样，比如一个客户端可能希望拿到的数据是 XML 格式的，而另一个客户端则希望数据是 JSON。另一个你可能需要面对的问题是，可能不同服务之间存在着一些公共的逻辑(比如权限认证之类)，总不能在每个服务里都实现一遍吧？

总结：我们不想把一些支持多个客户端等相关的公用逻辑重复实现在微服务中，我们需要一个 API Gateway 来提供一个中间层来处理服务协议之间的差异，并满足特定客户端的需求。

## 什么是 API Gateway

API 网关是微服务架构中的一种服务，它为客户端提供共享层和 API，以便与内部服务进行通信。 API 网关可以路由请求，转换协议，聚合数据，并实现一些共享逻辑，如身份验证和速率限制器等。

你可以将 API Gateway 看做是一个享用各种微服务的入口。

我们的系统可以有一个或多个 API Gateway，这具体取决于客户端的需求。例如，我们可以为桌面浏览器，移动应用程序和公共API提供单独的网关。

![image](https://user-images.githubusercontent.com/10726701/29126700-ad9c5a62-7d51-11e7-9596-5553ab6d5564.png)


## 前端团队的Node.js API Gateway

由于 API Gateway 为客户端应用程序（如浏览器）提供了支持，它可以由负责前端应用程序的团队来实现和管理。

这也意味着 API Gateway 的实现语言应由负责客户端的团队选择。由于 JavaScript 是开发浏览器应用程序的主要语言，即使你的微服务架构用不同的语言开发，Node.js 也可以成为实现 API Gateway 的绝佳选择。
Netflix 成功地使用 Node.js API Gateway 及其 Java 后端来支持广泛的客户端, [了解更多](https://www.infoq.com/news/2017/06/paved-paas-netflix)。

![image](https://user-images.githubusercontent.com/10726701/29126733-c142ea4a-7d51-11e7-81a7-4ea0c09d9137.png)


## API Gateway 的实用性

我们之前讨论过，可以将通用共享逻辑放入 API Gateway，本节将介绍其常见用法。

### 路由和版本控制

我们将 API Gateway 定义为微服务的入口。 在你的 API Gateway 中，你可以将请求从客户端路由到指定的服务。 你甚至可以在路由期间对服务程序的版本进行选择或更改后端接口，而公开的接口可以保持不变。你还可以在你的 API Gateway 中集合多个微服务到一点。

![image](https://user-images.githubusercontent.com/10726701/29126877-1c80a168-7d52-11e7-833a-9f8f7f9cda96.png)


### 迭代设计

API Gateway 可以帮助你分解臃肿的应用程序。由于业务的不断迭代，从头开始把整个应用重写成一个微服务架构的系统似乎不太可行。

在这种情况下，我们可以将代理或 API Gateway 置于我们的整体应用之前，并将新功能作为微服务实现，只需要保证 API Gateway 能将新接口路由到新服务，同时保证旧接口依然能够访问。慢慢的我们要把这些旧的服务迁移成微服务以达到分解臃肿应用程序的目的。
通过小步迭代设计，我们能够平滑的从庞大的整体过渡到微服务架构。

![image](https://user-images.githubusercontent.com/10726701/29127001-60dfaf84-7d52-11e7-897a-3a79a6afdb77.png)


### 认证

大多数微服务是需要通过认证才可以使用的。将类似身份验证的共享逻辑放在 API Gateway 上可以让你的微服务更加专注。

在微服务架构中，您可以通过网络配置将服务放置于 DMZ（非军事区域）中，并通过API Gateway 将其暴露给客户端。该网关还可以处理多个身份验证方法，例如，可以支持基于cookie和基于 token 的身份验证。

### 数据聚合

在微服务架构中，客户端可能会需要不同聚合程度的数据。 在这种情况下，我们可以使用 API Gateway 来解决这些依赖关系并从多个服务收集数据。

![image](https://user-images.githubusercontent.com/10726701/29127015-6d2a8d04-7d52-11e7-99e5-1688eedf9154.png)


### 序列化格式转换

这种问题发生在不同客户端需要不同格式数据的需求中。

想象一下，在微服务中如果我们使用了 JSON，但是在某个客户端中只支持 XML 的 API，这个时候怎么办？我们完全可以把 JSON 转换 XML 这一过程放在 API Gateway 中，而不是在每个微服务中实现。

![image](https://user-images.githubusercontent.com/10726701/29127033-7b15bf06-7d52-11e7-819f-95c18e4eafa5.png)


### 协议转换

微服务架构允许使用不同的协议以便于获得使用不同技术的优势。然而，大多数客户端只支持一种协议。在这种情况下，我们需要转换客户端的服务协议。

API Gateway 也可以成为介于客户端和微服务之间的一个协议转换层。

下面的图片中你可以看到，客户端只使用 HTTP REST 来和各种服务交换信息，而实际上我们内部的各种微服务可以基于不同的规范、协议来进行信息传递。

![image](https://user-images.githubusercontent.com/10726701/29127043-837b7186-7d52-11e7-85d3-a01b1723293c.png)


### 速率控制和缓存

除了身份验证之外，你还可以在 API Gateway 中实现速率限制，缓存和各种可靠性相关的功能。

### 过于庞大的 API Gateway

在实现 API Gateway 时，应当避免将非通用逻辑（如领域特定数据转换）放入其中。

服务应始终对其数据域拥有完全的所有权。 构建一个过于庞大的 API Gateway，从服务团队争夺控制权，这违反了微服务的理念。

这就是为什么你应该注意你的API网关中的数据聚合 —— 如果你明确它的职责，它可以是很强大的，应当避免在 API Gateway 中处理业务逻辑，是谁的事情就交给谁干，一定要明确其在整个架构中的角色。

## Node.js Gateways

如果你希望在 API Gateway 中执行一些简单的操作，例如将请求路由到特定的服务，你可以使用像nginx这样的反向代理。 但在某些时候，你可能需要实现一般代理不支持的逻辑。 在这种情况下，你可以在 Node.js 中实现自己的 API Gateway。

在 Node.js 中，你可以使用 http-proxy 完成一些简单的代理请求的服务，当然也可以使用具有更多功能的 express-gateway。

在第一个 API Gateway 示例中，我们在其代理请求到真实的服务之前，先进行权限认证。

```JavaScript
const express = require('express')
const httpProxy = require('express-http-proxy')
const app = express()

const userServiceProxy = httpProxy('https://user-service')

// Authentication
app.use((req, res, next) => {
  // TODO: my authentication logic
  next()
})
// Proxy request
app.get('/users/:userId', (req, res, next) => {
  userServiceProxy(req, res, next)
})
```
另一种方式是由 API Gateway 向微服务发送请求，再将响应回馈给客户端：

```JavaScript
const express = require('express')
const request = require('request-promise-native')
const app = express()
// Resolve: GET /users/me
app.get('/users/me', async (req, res) => {
  const userId = req.session.userId
  const uri = `https://user-service/users/${userId}`
  const user = await request(uri)
  res.json(user)
})
```

## 总结：
API Gateway 提供了一个中间层来协调客户端和微服务架构。它有助于帮助我们完成单一职责原则，让我们的应用或者服务持续的关注一件事。你可以将通用逻辑放入 API Gateway 中，但是也应该注意不要过度的使用 API Gateway。

