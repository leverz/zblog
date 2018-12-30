---
title: 「译」从不同的抽象层次理解单一职责原则
date: '2017-06-03T16:35:00.000Z'
---

在二十世纪初的某个地方，广为人知的 Uncle Bob —— 罗伯特·马丁（Robert C. Martin）第一次提出了面向对象设计的五大原则 —— **SOLID** 原则。SOLID 是这五大原则单词首字母的缩略词，其中的每个字母代表着不同的原则：

 - S - Single Responsibility Principle - 单一职责原则
 - O - Open Close Principle - 开闭原则
 - L - Liskov Principle of Substitution - 里式替换原则
 - I - Interface Segregation Principle - 接口隔离原则
 - D - Dependency Inversion Principle - 依赖倒置原则

这些原则是面向对象程序设计的骨架，并且是制定高品质和可维护代码的关键。在五大原则的第一条 —— 单一职责原则中，Uncle Bob 将 [《关于将系统分解为模块的标准》][1]和[《关于科学思想的作用》][2] 两篇论文的观点结合起来，得出了关于 SRP (单一职责原则) 的定义：

> The Single Responsibility Principle (SRP) states that each software
> module should have one and only one reason to change.
> ​单一职责原则(SRP)​指出，每一个软件模块都应当只做一件事（只对某一个因素敏感）。

![image.png!thumbnail][3]

在这段定义中，"**Reason to change**" 并不好理解，我更愿意把它理解成 **responsibility** (职责)。这意味着软件的每一个模块或者类都应当只提供一项职能。现在看来，这个观点十分简单合理，然而多年以来，业界却很难按照这一原则实践。造成这一现象的原因可能有很多：比如有大量的遗留代码，比如缺乏改变的动力，又比如缺少相关领域的知识，更有甚者认为这一原则背离了自然趋势。软件设计的关键，其实在于将相互耦合的各种职能分离，并找到一种方式让这些互相独立的模块共存于一个系统中。

SRP是一个十分抽象并且适用性很强的概念，只要你仔细观察就会发现，做为一名开发者，我们已经将其用于软件开发的各个方面。因此我想更深入的了解这一原则以及它的各种变化，并探索这一概念的各种应用。

面向对象编程
------

实践中，这一原则会如何应用呢？让我们看下边这个例子：

```C#
using (var sqlConnection = new SqlConnection(connectionString))
{
  sqlConnection.Open();
  try
  {
    using (var readCommand = new SqlCommand("select * from Entity", sqlConnection))
    {
      var reader = readCommand.ExecuteReader();
      while (reader.Read())
      {
        currenValue = reader.GetInt32(0);
        type = reader.GetInt32(0);
      }
      reader.Close();
    }
    using (var updateCommand = new SqlCommand(String.Format("update Entity set Data = {0} where Data = {1}", newValue, currenValue), sqlConnection))
    {
      updateCommand.ExecuteNonQuery();
    }

    Console.WriteLine("Data successfuly modified!");
    Console.ReadLine();
  }
  catch(Exception e)
  {
    Console.WriteLine("Failed to modify data");
  }
}
```
上述代码的逻辑可以分为三个步骤：
 - 连接数据库
 - 从Entity表中读取数据并缓存第一个Entity的值
 - 将新值写入到第一个Entity

当我们不阅读所有的代码，我们真的能明白这段代码在做什么吗？并不能。这是一段很常见的代码，所有的职责都扔到一个函数里执行：处理SQL连接，获取数据，修改数据，这些功能都是这一大段代码的一部分。

如果代码写成这样呢：

```C#
using (var sqlDataHandler = new SqlDataHandler())
{
  var entity = sqlDataHandler.ReadEntity();
  sqlDataHandler.UpdateDataFieldInEntity(entity, modificationValue);
}

Console.WriteLine("Data successfuly modified!");
Console.ReadLine();
```


现在看上去，代码更精简了，它需要完成什么样的功能一目了然。我们将大量复杂的逻辑从这个函数移到了 **SqlDataHandler** 类，这个类的代码如下：

```C#
public class SqlDataHandler : IDisposable
{
    private string _connectionString;
    private SqlConnection _sqlConnection;

    public SqlDataHandler()
    {
        _connectionString = ConfigurationManager.AppSettings["connectionString"];
        _sqlConnection = new SqlConnection(_connectionString);
        _sqlConnection.Open();
    }

    public Entity ReadEntity()
    {
        var entity = new Entity();

        try
        {
            using (var readCommand = new SqlCommand("select * from Entity", _sqlConnection))
            {
                var reader = readCommand.ExecuteReader();
                while (reader.Read())
                {
                    entity.CurrentValue = reader.GetInt32(0);
                    entity.Type = (EntityType)reader.GetInt32(1);
                }
                reader.Close();
            }
        }
        catch(Exception e)
        {
            Console.WriteLine("Failed to read the data!");
        }

        return entity;
      }

   public void UpdateDataFieldInEntity(Entity entity, int newValue)
   {
        var toValue = entity.GetNewValueBasedOnType(newValue);

        try
        {
            using (var updateCommand = new SqlCommand(String.Format("update Entity set Data = {0} where Data = {1}", toValue, entity.CurrentValue), _sqlConnection))
            {
                updateCommand.ExecuteNonQuery();
            }
        }
        catch (Exception e)
        {
            Console.WriteLine("Failed to modify data");
        }
    }

    public void Dispose()
    {
        _sqlConnection.Close();
    }
}

```


我们把与数据库操作相关的代码移到了这个新类中，在原始代码中只留下了一些用来驱动整个工作流的代码。我们将职责分离出来，让我们的代码变得更易读，更容易维护，也让我们的代码更加灵活。

现在我们应该能更好的理解每个类应该只维护一个功能的原则了。你也许会觉得 SRP 和 ISP （接口隔离原则）两者有一些相似性。ISP 认为不应当要求使用者依赖他不需要的方法。在实践中，这意味着类不应当实现接口中不需要的方法。这就需要我们将臃肿的接口切分的更小更合理，将相似的方法抽象到一个接口中（译者注：关于 ISP 可以通过这篇文章了解 —— http://blog.csdn.net/zhengzhb/article/details/7296921）。这个定义是不是听起来跟 SRP 的定义很像？有的人认为，ISP 就是 SRP 应用于接口的抽象概念。

让我们想的更多一些。定义一个对象，通常要为其赋予多个数据和不同行为。如果不断的采用 SRP 原则去尽可能的分离行为，让我们看看还留下些什么 —— 函数以及该函数所依赖的数据。这不就是闭包么？（译者注：关于[闭包的定义][4]）

函数式编程
-----

闭包是函数式编程的基础。他们其实就是拥有自己的运行环境的 function 。它具有稍后执行的特性，它还能访问创建它时所在的环境。为了证明这一点，可以看看下面的C#代码：

```C#
using System;

namespace ClosureExample
{
    class Program
    {
        static void Main(string[] args)
        {
            Action counterIncrementAction = CounterIncrementAction();
            counterIncrementAction();
            counterIncrementAction();
            Console.ReadLine();

        }

        static Action CounterIncrementAction()
        {
            int counter = 0;
            return delegate
            {
                counter++;
                Console.WriteLine("Counter value is {0}", counter);
            };
        }
    }
}
```

输出结果如下：

```C#
Counter value is 1
Counter value is 2
```

正如我们所见 **counterIncrementAction** 可以一直访问局部变量 **counter**。

**CounterIncrementAction** 的函数体看上去与对象很类似。那么对象和闭包之间真正的区别又是什么呢？为了回答这个问题，我想分享一个有趣的段子，这个段子能够在很多讲函数式编程的书和文章中找到：

> 大师 Qc Na 和他的学生 Anton 一同在路上走着。Anton 说：“大师，我听说 Object 是一样很棒的设计，这是真的么？”Qc
> Na 怜悯的看着他的学生，并回复到：“傻学生，对象不过是能力不足的人使用的闭包罢了。”
>
> Anton 离开大师回到他的房间，打算深入研究闭包。他仔细阅读了全部的“终极 Lambda
> ”等一系列的论文，以及一些相关的文章，并着手实现了一个具有封闭式对象系统的小型 Scheme
> 解释器。他觉得自己学到了很多东西，十分想要跟大师汇报他的进度。
>
> 在他与 Qc Na 大师的又一次步行中，Anton
> 试图引起大师的注意，就说：“大师，我一直在研究这件事，现在终于明白，对象真的是能力不足的人使用的类似闭包的东西。” 结果 Qc Na
> 用棍子敲打 Anton 并说：“你学什么啦？闭包是能力不足的使用的类似对象的东西。”这一刻，Anton 终于想明白了。

这条段子想要揭示的道理是闭包和对象其实是一件相同的事情：组合数据和行为。他们只是同一件事的两种表现形式。

我试图在这里展示一个像 SRP 一样直观的概念，为我们的软件开发开辟了一条新的道路。闭包使用起来十分方便，它也十分流行，尤其是在 web 开发中（JavaScript 天生就有闭包这个概念，C# 则通过 lambdas 和 匿名函数 实现）。

让我们再来换个角度。到目前为止，我们试图将它应用于微观。接下来我们用 SRP 观察一下宏观的东西。我们在各种服务上如何应用 SRP ？如果我们将一个大型服务切分成数个微小的服务，又会怎样呢？于是，我们得到了当前最大的趋势之一 —— 微服务。

微服务
---

如果你去看任何一个关于微服务的讨论，很可能会见到类似于下面这样的图像：

![image.png!thumbnail][5]

总的来说，所谓微服务就是将巨大而混乱的大型服务拆分成一个个更小型的服务。这些小型服务专注于解决某个专门的业务需求，并且他们都是能够自治的独立个体。微服务几乎采取了与我们之前处理面向对象中的问题一样的解决方案，通过切分服务的方式，增加了整体的灵活性。我们现在能够独立部署每一个独立的业务，或者采用不同的技术实现，使用最恰当的技术解决某一部分的问题。这样的系统当然十分灵活，容易组装。

我们再次看到了 SRP 在不同层次上的抽象，最终得到了一个全新的东西。

结论
--

有时候，我看起来像个外星人，总是在试图让每一个计算机科学的突破都与 SRP 发生关系。

当然不是这样的， 但是分离职责的概念确实是有一些强大的东西，它对我们工作的不同领域都有影响。 快去找找，你可能会发现这个概念出现在其他我还没有找到的地方。你一定能够找到的。

原文地址：https://rubikscode.net/2017/05/07/single-responsibility-principle-on-different-levels-of-abstraction/


  [1]: https://www.cs.umd.edu/class/spring2003/cmsc838p/Design/criteria.pdf
  [2]: http://www.cs.utexas.edu/users/EWD/ewd04xx/EWD447.PDF
  [3]: https://segmentfault.com/img/bVOCun?w=500&h=233
  [4]: https://zh.wikipedia.org/wiki/%E9%97%AD%E5%8C%85_%28%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%A7%91%E5%AD%A6%29
  [5]: https://segmentfault.com/img/bVOCuF?w=863&h=569
