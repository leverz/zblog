---
title: GOPATH 是用来干嘛的？
date: '2019-06-10T20:04:00.000Z'
---


GOPATH 是 Go 语言的工作目录，他的值可以是一个目录路径，也可以是多个目录路径，每个目录都代表 go 语言的一个工作区。

我们开发 Golang 项目时，需要依赖一些别的代码包，这些包的存放路径就与 GOPATH 有关。

在 v1.11 版本之前，所有的代码包都要放到 $GOPATH/src 目录下，那个时候 go 官方还没有支持依赖管理，包括我们自己项目的代码，依赖的代码包，都被放到这个路径下，十分混乱，不利于管理。

而在 v1.11 之后，官方终于支持了包管理，除了能够自动下载依赖包，项目也不再需要放到 $GOPATH/src 下了，项目中会维护一个 go.mod 的文件记录依赖包及其版本，所有依赖的代码包都被放到了 $GOPATH/pkg/mod 下了，src 目录不复存在。

```Golang
import "github.com/labstack/echo"
```

上面这条语句，就在我们的 go 文件中导入了 echo 这个依赖，而这个 import 的位置，实际上就是 $GOPATH/pkg/mod/github.com/labstack/echo 。
