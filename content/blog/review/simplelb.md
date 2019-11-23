---
title: Let's Create a Simple Load Balancer With Go
date: '2019-11-23T17:47:00.000Z'
---

原文：[https://kasvith.github.io/posts/lets-create-a-simple-lb-go/](https://kasvith.github.io/posts/lets-create-a-simple-lb-go/)

在互联网架构中，负载均衡处于一个举足轻重的地位。它能够帮助我们平衡每个后端服务节点的负载。此外，当某些节点出现问题时，负载均衡还可以根据策略将流量更多的分配给正常的节点，以此来保证服务的稳定性。

在使用过 nginx 之后，我决定造一个简单的负载均衡轮子。我将使用 Go 来实现它，Go 是一种以并发作为第一公民的现代语言。Go 拥有丰富的标准库，能够用较少的代码编写高性能的应用程序。它还能生成一个静态链接的单二进制文件，以方便分发。

## 这个简单的负载均衡是如何工作的？
常见的负载均衡器提供了多种策略来分配负载，比如说：

* Round Robin —— 假定后端节点具有相同的处理能力，将流量平均分配到每个节点上
* Weighted Round Robin —— 根据后端节点的处理能力，调整每个节点承担流量的权重
* Least Connections —— 将流量分配到活跃连接最少的节点上

我们这里只实现这些策略中最简单的一个 —— Round Robin。

![图片](https://uploader.shimo.im/f/sxeYfNfUppIT8BB4.png!thumbnail)
## Round Robin 负载分配机制
Round Robin 机制简单明了，它后面的每个后端节点都有平等的机会来处理负载。

![图片](https://uploader.shimo.im/f/6yFpQtxQK1suQHy5.png!thumbnail)

如图所示，负载均衡会将请求挨个分配到每个后端节点。但我们并不能直接使用它 —— 如果后端某个节点出现故障，我们不希望请求继续打到这个节点上。因此针对这个负载分配机制，我们需要增加一些条件 —— 只将流量分配到健康的节点上。

## 结构定义
按照制定好的负载均衡策略，我们需要追踪每个后端节点的详细情况，以便根据其健康状况，将请求打到对应的地址上。

我们先定义一个结构体来保存后端节点的相关信息：

```Go
type Backend struct {
  URL          *url.URL
  Alive        bool
  mux          sync.RWMutex
  ReverseProxy *httputil.ReverseProxy
}
```
接下来，我们需要把所有后端节点集中管理起来，于是就有了 ServerPool：

```Go
type ServerPool struct {
  backends []*Backend
  current  uint64
}
```
## 使用 ReverseProxy
正如我们之前已经明确过的，负载均衡的真实目的是将流量路由到不同的后端节点，并将结果返回给发起请求的客户端。

根据 Go 文档中的描述：

>ReverseProxy 是一个用来代理 HTTP 请求到另一个服务的处理程序。

这正是我们想要的东西。这里没必要造轮子，ReverseProxy 能够满足我们的需求。

```Go
u, _ := url.Parse("http://localhost:8080")
rp := httputil.NewSingleHostReverseProxy(u)
  
// initialize your server and add this as handler
http.HandlerFunc(rp.ServeHTTP)
```
我们使用 httputil.NewSingleHostReverseProxy(url) 初始化一个反向代理，将请求转发给参数中的 url。

我们看一下 ServeHTTP 方法的定义：

```Go
func (p *ReverseProxy) ServeHTTP(rw http.ResponseWriter, req *http.Request)
```
再看一下 net/http 中对 HandlerFunc 的定义：

```Go
type HandlerFunc func(ResponseWriter, *Request)
```
就这样，我们很自然的实现了一个反向代理。

你可以在文档中找到更多的例子：[https://golang.org/pkg/net/http/httputil/#ReverseProxy](https://golang.org/pkg/net/http/httputil/#ReverseProxy)。

## 挑选程序
在选择代理到哪个后端节点时，需要跳过出问题的节点。要实现这一点，我们的程序需要做一些特殊的处理。

当多个客户端并发的对负载均衡器发起请求时，我们的负载均衡器就会面临资源竞争的问题了。为了防止多个请求并发的操作 ServerPool，我们可以使用互斥锁来锁定 ServerPool。但引入锁之后会让我们的程序变的复杂，并且并发性能也会有所损失，还有更好的办法吗？我们实际上只是想要知道下一个连接代理到哪个后端去，因此我们只要找到下一个连接对应的后端节点索引就可以了。实际上，我们只需要实现一个支持原子操作的计数器就能满足我们的需求了。

```Go
func (s *ServerPool) NextIndex() int {
  return int(atomic.AddUint64(&s.current, uint64(1)) % uint64(len(s.backends)))
}
```
上面的程序中，我们对当前值进行原子递增操作。我们使用递增后的结果对 backends 的数量求余数，就可以将这次请求，分配到对应的 backend 上。

## 获取一个活跃的后端节点
我们已经知道，在我们实现的负载均衡器中，通过不断地循环后端节点列表，来把请求分配到不同的节点上。在这个过程中，我们的程序需要跳过不健康的节点。

**NextIndex** 总是返回一个介于 0 - 后端节点数量之间的值，我们拿到一个后端节点后，先判断其健康状态，如果它不健康，则重复以上流程。

![图片](https://uploader.shimo.im/f/JUvifojWRW0KyGAo.png!thumbnail)

以循环的方式遍历切片。

如上图所示，我们希望从下一个位置开始，遍历整个后端节点列表，直到找到一个正常的节点。我们可以通过 next+length 来保证我们的循环能够遍历到每个节点而又不会重复。找到正常的节点之后，顺便把 current 标记为该节点：

```Go
// GetNextPeer returns next active peer to take a connection
func (s *ServerPool) GetNextPeer() *Backend {
  // loop entire backends to find out an Alive backend
  next := s.NextIndex()
  l := len(s.backends) + next // start from next and move a full cycle
  for i := next; i < l; i++ {
    idx := i % len(s.backends) // take an index by modding with length
    // if we have an alive backend, use it and store if its not the original one
    if s.backends[idx].IsAlive() {
      if i != next {
        atomic.StoreUint64(&s.current, uint64(idx)) // mark the current one
      }
      return s.backends[idx]
    }
  }
  return nil
}
```
## 避免 Backend 资源产生竞争冲突
有一个很严重的问题我们还没考虑到 —— 我们的 Backend 保存在一个变量中，而这个变量可以被多个 goroutine 同时访问或修改，我们希望同一时间只有一个 goroutine 在修改这个变量，而在修改中的变量不能被其他 goroutine 访问到，不在修改中的变量允许多个 goroutine 并发访问。从这个场景看，我们需要使用读写锁 —— RWMutex 。

```Go
// SetAlive for this backend
func (b *Backend) SetAlive(alive bool) {
  b.mux.Lock()
  b.Alive = alive
  b.mux.Unlock()
}

// IsAlive returns true when backend is alive
func (b *Backend) IsAlive() (alive bool) {
  b.mux.RLock()
  alive = b.Alive
  b.mux.RUnlock()
  return
}
```
## 让负载均衡发起请求
有了上面的逻辑，我们就能通过下面的方式来平衡收到的请求。只有当所有后端节点都无法访问时，它才会失败。

```Go
// lb load balances the incoming request
func lb(w http.ResponseWriter, r *http.Request) {
  peer := serverPool.GetNextPeer()
  if peer != nil {
    peer.ReverseProxy.ServeHTTP(w, r)
    return
  }
  http.Error(w, "Service not available", http.StatusServiceUnavailable)
}
```
这个方法可以作为一个 HandlerFunc 传入 http server 中。

```Go
server := http.Server{
  Addr:    fmt.Sprintf(":%d", port),
  Handler: http.HandlerFunc(lb),
}
```
## 只将流量路由到健康的后端节点
我们目前的 lb 有个严重的问题 —— 我们不知道节点的健康状况。要知道这一信息，只能尝试访问后端节点，检查它是否还活着。

我们有两种方法可以选择：

* 在执行当前请求时，发现后端节点无法正常响应，就把它标记为 down
* 后端节点提供一个健康检查接口，负载均衡器每隔一段时间访问这个接口来确认节点的健康状况
## 主动检查后端节点的情况
ReverseProxy 会触发一个回调函数，ErrorHandler 是用来处理异常的回调函数。我们可以使用这个函数来检测故障。下面是实现方法：

```Go
proxy.ErrorHandler = func(writer http.ResponseWriter, request *http.Request, e error) {
  log.Printf("[%s] %s\n", serverUrl.Host, e.Error())
  retries := GetRetryFromContext(request)
  if retries < 3 {
    select {
      case <-time.After(10 * time.Millisecond):
        ctx := context.WithValue(request.Context(), Retry, retries+1)
        proxy.ServeHTTP(writer, request.WithContext(ctx))
      }
      return
    }

  // after 3 retries, mark this backend as down
  serverPool.MarkBackendStatus(serverUrl, false)

  // if the same request routing for few attempts with different backends, increase the count
  attempts := GetAttemptsFromContext(request)
  log.Printf("%s(%s) Attempting retry %d\n", request.RemoteAddr, request.URL.Path, attempts)
  ctx := context.WithValue(request.Context(), Attempts, attempts+1)
  lb(writer, request.WithContext(ctx))
}
```
在这里，我们利用了闭包的力量来设计这个错误处理程序。它允许我们在方法中捕获外部变量，比如 server url。这个程序会检查重试次数，如果小于 3 我们会再次向同一个后端节点发起相同的请求。这是因为，我们没办法断定这次请求失败的原因，也许只是因为客户端的连接数太多，后端节点没有足够的 socket 来承载连接导致的。因此，我们设置了一个计时器，将重试延迟 10 毫秒。每次重试，我们都会记录重试次数。

超过 3 次重试仍然失败，我们就会把这个后端节点标记为 down。

接下来，我们不能把这个失败的请求丢弃掉，我们会将这个请求分配到别的后端节点上再次尝试，我们将该请求的尝试次数也记录下来，并将这个请求传入 lb 函数，来分配一个新的节点。

我们不能这样无休止的尝试下去，因此需要设置一个最大尝试次数。

我们直接从 context 中获取尝试次数，如果超过了最大尝试次数，就放弃该请求。

```Go
// lb load balances the incoming request
func lb(w http.ResponseWriter, r *http.Request) {
  attempts := GetAttemptsFromContext(r)
  if attempts > 3 {
    log.Printf("%s(%s) Max attempts reached, terminating\n", r.RemoteAddr, r.URL.Path)
    http.Error(w, "Service not available", http.StatusServiceUnavailable)
    return
  }

  peer := serverPool.GetNextPeer()
  if peer != nil {
    peer.ReverseProxy.ServeHTTP(w, r)
    return
  }
  http.Error(w, "Service not available", http.StatusServiceUnavailable)
}
```
这个实现是递归的。

## 使用 Context
Context 包允许我们在整个生命周期中存储有用的数据。我们大量使用这种方法来追踪特定数据，比如尝试次数和重试次数。

首先我们要给 Context 指定一个特殊的键。这里建议使用全局唯一的整数键，而不是字符串。Go 语言提供了 iota 关键字来实现递增常量，每个常量包含一个唯一的整数值。这是一个定义整数键的完美解决方案。

```Go
const (
  Attempts int = iota
  Retry
)
```
然后我们可以像 HashMap 那样检索值，如下所示。默认返回值取决于用例。

```Go
// GetAttemptsFromContext returns the attempts for request
func GetRetryFromContext(r *http.Request) int {
  if retry, ok := r.Context().Value(Retry).(int); ok {
    return retry
  }
  return 0
}
```
## 被动健康检查
被动健康检查，可以不断地检查后端节点的状态来确认它的状况。我们通过固定间隔的 ping 来检查后端节点的存活情况。

我们需要先建立一个 TCP 连接来完成 ping 操作。如果后端节点响应，我们就把它标记为正常节点。当然我们也可以访问一个特定的路由（比如：/status）来完成健康检查。确保在连接建立之后关闭它，以减少服务器中的额外负载。否则，服务器会一直尝试维持连接，最终耗尽资源。

```Go
// isAlive checks whether a backend is Alive by establishing a TCP connection
func isBackendAlive(u *url.URL) bool {
  timeout := 2 * time.Second
  conn, err := net.DialTimeout("tcp", u.Host, timeout)
  if err != nil {
    log.Println("Site unreachable, error: ", err)
    return false
  }
  _ = conn.Close() // close it, we dont need to maintain this connection
  return true
}
```
现在我们可以挨个遍历后端节点，并更新他们的状态了。

```Go
// HealthCheck pings the backends and update the status
func (s *ServerPool) HealthCheck() {
  for _, b := range s.backends {
    status := "up"
    alive := isBackendAlive(b.URL)
    b.SetAlive(alive)
    if !alive {
      status = "down"
    }
    log.Printf("%s [%s]\n", b.URL, status)
  }
}
```
为了定期做健康检查，我们需要在 Go 程序中起一个定时器。定时器会在指定时间到达时，通过 channel 通知做具体处理的 goroutine。

```Go
// healthCheck runs a routine for check status of the backends every 2 mins
func healthCheck() {
  t := time.NewTicker(time.Second * 20)
  for {
    select {
    case <-t.C:
      log.Println("Starting health check...")
      serverPool.HealthCheck()
      log.Println("Health check completed")
    }
  }
}
```
在上面的代码中，<- t.C 通道将每隔 20s 返回一个值。select 会一直等待下面的 case 中有匹配事件的发生。

最后，起一个单独的 goroutine 中做健康检查。

```Go
go healthCheck()
```
## 总结
在这篇文章中，我们涉及到很多内容：

* Round Robin 选择策略
* Go 标准库中的 ReverseProxy
* 互斥锁 Mutex
* 原子操作
* 闭包
* 回调
* Select 语句

这个简化的负载均衡器还有很多地方可以进行优化：

* 使用堆来对后端节点排序，以减少搜索范围
* 收集统计数据
* 支持 Least Connections 和 Weighted Round Robin
* 支持配置文件

等等。

你可以在这里查看源代码：[https://github.com/kasvith/simplelb/](https://github.com/kasvith/simplelb/)

感谢阅读~
