---
title: 「译」React应用性能优化
date: '2016-10-30T22:12:03.284Z'
---

这段时间对自己写的React应用的性能做了一些分析以及优化，发现项目中产生性能问题的原因主要来自两个方面：

> 1.  大量的数据渲染使组件进行不必要的diff过程，导致应用卡顿；
> 2. 部分交互操作频繁的组件中使用了一些不必要的DOM操作，以及在处理比如scroll事件，resize事件等这类容易导致浏览器不停重新渲染的操作时，混杂了大量的计算以及混乱的DOM操作，导致浏览器卡顿。

今天主要想讨论的是关于第一点的优化，至于第二点，这并不是React为我们带来的问题，而是我们对浏览器的渲染机制理解和思考还有所欠缺的表现，下次我们再去深入的探讨这个问题。

这篇文章是我在探查原因的时候，在[Medium](https://medium.com/@384094206wz)上看到的。原文地址：[Performance optimisations for React applications
](https://medium.com/@alexandereardon/performance-optimisations-for-react-applications-b453c597b191#.gcb8xamj3)

先声明，作者的观点并不是完全可取的，他在文章中的阐述是基于React与Redux的，但事实上他并没有完全使用Redux的connect()函数，这一点Dan也在Tweet上指出了。不过即使这样，对我们单纯的使用React来说，也是很有意义的。针对Dan的观点，作者也在文章的评论中进行了补充。

**TL;DR;**
React应用主要的的性能瓶颈来自于一些冗余的程序处理以及组件中的DOM diff的过程。为了避免这种情况，在你的应用中尽可能多的让**shouldComponentUpdate**返回**false**。

**_并且你还要加快这个过程：_**
1. shouldComponentUpdate中的条件判断应该尽可能的快
2. shouldComponentUpdate中的条件判断要尽可能的简单

以下是正文

---
## 是什么造成了React应用的性能瓶颈？
1. 不需要更新DOM的冗余处理
2. 对大量不需要更新的DOM节点进行diff计算（虽然Diff算法是使React应用表现良好的关键，但这些计算并不能够完全忽略不计）
## React中默认的渲染方式是什么？

让我来研究下React是如何渲染一个组件的
### 首次render

对于首次渲染来说，所有的节点都应当被渲染（绿色的表示被渲染的节点）
![](https://github.com/leverz/leverz.github.io/blob/master/images/1-XrroFmim-Re3pHBiEP55oQ.png?raw=true)
图中的每个节点都被渲染了，我们的应用目前处于初始状态。
### 发起改变

我们想要更新一段数据，而跟这个数据相关的只有一个节点。
![](https://github.com/leverz/leverz.github.io/blob/master/images/1--FwLxuiJMqM9FQVuGFzsRw.png?raw=true)
### 理想中的更新

我们只想渲染到达叶子节点的关键路径。
![](https://github.com/leverz/leverz.github.io/blob/master/images/1-rcrPNpUXbejyrt0DTPCPuQ.png?raw=true)
### 默认的渲染行为

如果我们什么都不做的话，React默认会这样做：（orange = waste）
![](https://github.com/leverz/leverz.github.io/blob/master/images/1-9Hh4ghZzo96qGc3_aIkonA.png?raw=true)
所有的节点都被渲染了。

每个React组件中都有一个**shouldComponentUpdate(nextProps, nextState)**方法。它返回一个Bool值，当组件应当被渲染时返回true，不应当被渲染时返回false。当return false时，组件中的render方法压根不会被执行。然而在React中，即便你没有明确的定义shouldComponentUpdate方法，shouldComponentUpdate还是会默认返回True。

``` JavaScript
// default behaviour
shouldComponentUpdate(nextProps, nextState) {
    return true;
}
```

这意味着，当我们对默认行为不做任何修改时，每次改动顶层的props，整个应用的所有组件都会执行其render方法。这就是产生性能问题的原因。

---
## 那么我们如何实现理想化的更新操作呢？

在你的应用中尽可能多的让**shouldComponentUpdate**返回**false**。

**_并且你还要加快这个过程：_**
1. shouldComponentUpdate中的条件判断应该尽可能的快
2. shouldComponentUpdate中的条件判断要尽可能的简单
## 加快shouldComponentUpdate中的条件判断

理想化的情况中，我们不应该在shouldComponentUpdate函数中进行深度比较，因为深度比较是比较消耗资源的一件事，特别是我们的数据结构嵌套特别深，数据量特别大的时候。

``` JavaScript
class Item extends React.Component {
    shouldComponentUpdate(nextProps) {
      // expensive!
      return isDeepEqual(this.props, nextProps);
    }
    // ...
}
```

一个可供替代的方法是在一个数据发生改变时，修改对象的引用而不是它的值。

``` JavaScript
const newValue = {
    ...oldValue
    // any modifications you want to do
};


// fast check - only need to check references
newValue === oldValue; // false

// you can also use the Object.assign syntax if you prefer
const newValue2 = Object.assign({}, oldValue);

newValue2 === oldValue; // false
```

可以把这个技巧用在Redux中的reducer中：

``` JavaScript
// in this Redux reducer we are going to change the description of an item
export default (state, action) => {

    if(action.type === 'ITEM_DESCRIPTION_UPDATE') {

        const {itemId, description} = action;

        const items = state.items.map(item => {
            // action is not relevant to this item - we can return the old item unmodified
            if(item.id !== itemId) {
              return item;
            }

            // we want to change this item
            // this will keep the 'value' of the old item but
            // return a new object with an updated description
            return {
              ...item,
              description
            };
        });

        return {
          ...state,
          items
        };
    }

    return state;
}
```

如果你采用了这种方式，那么在你的shouldComponentUpdate方法中只需要检查对象的引用就可以。

``` JavaScript

// super fast - all you are doing is checking references!
shouldComponentUpdate(nextProps) {
    return !isObjectEqual(this.props, nextProps);
}
```

下面是isObjectEqual函数的一种简易实现：

``` JavaScript
const isObjectEqual = (obj1, obj2) => {
    if(!isObject(obj1) || !isObject(obj2)) {
        return false;
    }

    // are the references the same?
    if (obj1 === obj2) {
       return true;
    }

   // does it contain objects with the same keys?
   const item1Keys = Object.keys(obj1).sort();
   const item2Keys = Object.keys(obj2).sort();

   if (!isArrayEqual(item1Keys, item2Keys)) {
        return false;
   }

   // does every object in props have the same reference?
   return item2Keys.every(key => {
       const value = obj1[key];
       const nextValue = obj2[key];

       if (value === nextValue) {
           return true;
       }

       // special case for arrays - check one level deep
       return Array.isArray(value) &&
           Array.isArray(nextValue) &&
           isArrayEqual(value, nextValue);
   });
};

const isArrayEqual = (array1 = [], array2 = []) => {
    if (array1 === array2) {
        return true;
    }

    // check one level deep
    return array1.length === array2.length &&
        array1.every((item, index) => item === array2[index]);
};
```
## 让shouldComponentUpdate中的条件判断更简单

下面是一个比较复杂的shouldComponentUpdate函数：

``` JavaScript
// Data structure with good separation of concerns (normalised data)
const state = {
    items: [
        {
            id: 5,
            description: 'some really cool item'
        }
    ],

    // an object to represent the users interaction with the system
    interaction: {
        selectedId: 5
    }
};
```

这样的数据结构让你的shouldComponentUpdate函数变得复杂：

``` JavaScript

import React, {Component, PropTypes} from 'react';

class List extends Component {

    propTypes = {
        items: PropTypes.array.isRequired,
        interaction: PropTypes.object.isRequired
    }

    shouldComponentUpdate (nextProps) {
        // have any of the items changed?
        if(!isArrayEqual(this.props.items, nextProps.items)){
            return true;
        }
        // everything from here is horrible.

        // if interaction has not changed at all then when can return false (yay!)
        if(isObjectEqual(this.props.interaction, nextProps.interaction)){
            return false;
        }

        // at this point we know:
        //      1. the items have not changed
        //      2. the interaction has changed
        // we need to find out if the interaction change was relevant for us

        const wasItemSelected = this.props.items.any(item => {
            return item.id === this.props.interaction.selectedId
        });
        const isItemSelected = nextProps.items.any(item => {
            return item.id === nextProps.interaction.selectedId
        });

        // return true when something has changed
        // return false when nothing has changed
        return wasItemSelected !== isItemSelected;
    }

    render() {
        <div>
            {this.props.items.map(item => {
                const isSelected = this.props.interaction.selectedId === item.id;
                return (<Item item={item} isSelected={isSelected} />);
            })}
        </div>
    }
}
```
### 问题1：庞大的shouldComponentUpdate函数

从上面的例子就可以看出来，即便是那么一小段很简单的数据结构，shouldConponentUpdate函数依然有如此繁杂的处理。这是因为这个函数需要了解数据结构，以及每个数据之间又怎样的关联。所以说，shouldComponentUpdate函数的大小和复杂度，是由数据结构决定的。

这很容易引起两个错误：
1. 不该返回false时，返回了false（状态在程序中没有被正确处理，导致视图不更新）
2. 不该返回true时，返回了true（视图每次都更新，引起了性能问题）

何必为难自己呢？你想要让你的程序足够简单，而不需要仔细考虑这些数据之间的关系。（所以，想要让程序变得简单，一定要设计好数据结构）
### 问题2：高度耦合的父子组件

应用普遍都是耦合度越低越好（组件之间要尽可能的不互相依赖）。父组件不应该试图去理解子组件是如何运行的。这允许你修改子组件的行为，而父组件不需要知道更改（假定子组件的PropTypes不变）。这同样意味着子组件可以独立运行，而不需要父组件严格的控制它的行为。
### 规范化你的数据结构

通过规范化你的数据结构，你可以很方便的只通过判断引用是否更改来判断视图是否需要更新。

``` JavaScript
const state = {
    items: [
        {
            id: 5,
            description: 'some really cool item',

            // interaction now lives on the item itself
            interaction: {
                isSelected: true
            }
        }
    ]
};
```

这样的数据结构让你在shouldComponentUpdate函数中的更新检测更加简单。

``` JavaScript

import React, {Component, PropTypes} from 'react';

class List extends Component {

    propTypes = {
        items: PropTypes.array.isRequired
    }

    shouldComponentUpdate (nextProps) {
        // so easy
        return isObjectEqual(this.props, nextProps);
    }

    render() {
            <div>
                {this.props.items.map(item => {

                    return (
                    <Item item={item}
                        isSelected={item.interaction.isSelected} />);
                })}
            </div>
        }
}
```

如果你想要更新其中的一个数据，比如**interaction**，你只需要更新整个对象的引用就可以了。

``` JavaScript
// redux reducer
export default (state, action) => {

    if(action.type === 'ITEM_SELECT') {

        const {itemId} = action;

        const items = state.items.map(item => {
            if(item.id !== itemId) {
                return item;
            }

            // changing the reference to the whole object
            return {
                ...item,
                interaction: {
                    isSelected: true
                }
            }

        });

        return {
          ...state,
          items
        };
    }

    return state;
};
```
## 引用检查和动态props

先看一个创建动态props的例子

``` JavaScript
class Foo extends React.Component {
    render() {
        const {items} = this.props;

        // this object will have a new reference every time
        const newData = { hello: 'world' };


        return <Item name={name} data={newData} />
    }
}

class Item extends React.Component {

    // this will always return true as `data` will have a new reference every time
    // even if the objects have the same value
    shouldComponentUpdate(nextProps) {
        return isObjectEqual(this.props, nextProps);
    }
}
```

通常我们不在组件中创建新的props，只是将它传递下去。
然而下面这种内部循环的方式却越来越普遍了：

``` JavaScript
class List extends React.Component {
    render() {
        const {items} = this.props;

        <div>
            {items.map((item, index) => {
                 // this object will have a new reference every time
                const newData = {
                    hello: 'world',
                    isFirst: index === 0
                };


                return <Item name={name} data={newData} />
            })}
        </div>
    }
}
```

这是在创建函数中经常使用的。

``` JavaScript

import myActionCreator from './my-action-creator';

class List extends React.Component {
    render() {
        const {items, dispatch} = this.props;

        <div>
            {items.map(item => {
                 // this function will have a new reference every time
                const callback = () => {
                    dispatch(myActionCreator(item));
                }

                return <Item name={name} onUpdate={callback} />
            })}
        </div>
    }
}
```
### 解决这个问题的策略
1. 避免在组件内部创建动态props（改善你的数据结构，使props可以被直接用来传递）
2. 将动态props当做满足===不等式的类型传递（eg: Bool, Number, String）

``` JavaScript

const bool1 = true;
const bool2 = true;

bool1 === bool2; // true

const string1 = 'hello';
const string2 = 'hello';

string1 === string2; // true
```

如果你真的需要传递一个动态对象，你可以传递一个对象的字符串表示，并且这个字符串应当可以在子组件中重新解读为相应的对象。

``` JavaScript

render() {
    const {items} = this.props;

    <div>
        {items.map(item => {
            // will have a new reference every time
            const bad = {
                id: item.id,
                type: item.type
            };

            // equal values will satify strict equality '==='
            const good = `${item.id}::${item.type}`;

            return <Item identifier={good} />
        })}
    </div>
}
```
### 特例：函数
1. 尽量不要传递函数。在子组件需要时才去触发相应的actions。这样做还有一个好处是将业务逻辑与组件分离开来。
2. 忽略shouldComponentUpdate函数中对functions的检查，因为我们无法知晓函数的值是否发生改变。
3. 创建一个不可变数据与函数的映射。你可以在执行**componentWillReveiveProps**函数时，把这个映射放到**state**中。这样的话每次render时将不会得到一个新的引用，便于执行在shouldComponentUpdate时的引用检查。这个方法比较麻烦，因为需要维护和更新函数列表。
4. 创建一个有正确this绑定的中间组件。这样也并不理想，因为在组件的层次结构中引入了冗余层。（实际上作者的意思是将函数的定义从render函数中移出，这样每次的render就不会创建新的引用了）
5. 避免每次执行render函数时，都创建一个新的函数。

关于第四点的例子：

``` JavaScript
// introduce another layer 'ListItem'
<List>
    <ListItem> // you can create the correct this bindings in here
        <Item />
    </ListItem>
</List>

class ListItem extends React.Component {

    // this will always have the correct this binding as it is tied to the instance
    // thanks es7!
    const callback = () => {
          dispatch(doSomething(item));
    }

    render() {
        return <Item callback={this.callback} item={this.props.item} />
    }
}
```
## 工具

上面列出的所有规则和技术都是通过使用性能测量工具发现的。 使用工具将帮助你找到应用程序中特定的性能问题。
### console.time

这个工具相当简单。
1. 开始计时
2. 程序运行
3. 结束计时

一个很棒的方式是用Redux的中间件来测试性能。

``` JavaScript

export default store => next => action => {
    console.time(action.type);

    // `next` is a function that takes an 'action' and sends it through to the 'reducers'
    // this will result in a re-render of your application
    const result = next(action);

    // how long did the render take?
    console.timeEnd(action.type);

    return result;
};
```

用这个方法，你可以记录每个操作及其在应用程序中渲染所花费的时间。 你可以快速查看是哪些操作需要耗费很多时间来执行，这给我们提供了解决性能问题的一个起点。 有了这个时间值，还有助于我们查看我们对代码的更改对应用程序产生的影响。
### React.perf

这个工具跟console.time用起来很像，但是它是专门用来检测React应用性能的。
1. Perf.start
2. 程序运行
3. Perf.stop

依然是用Redux的中间件举个例子

``` JavaScript
import Perf from 'react-addons-perf';

export default store => next => action => {
    const key = `performance:${action.type}`;
    Perf.start();

    // will re-render the application with new state
    const result = next(action);
    Perf.stop();

    console.group(key);
    console.info('wasted');
    Perf.printWasted();
    // any other Perf measurements you are interested in

    console.groupEnd(key);
    return result;
};
```

与console.time方法类似，您可以查看每个操作的表现数据。 有关React性能插件的更多信息，请参阅[此处](https://facebook.github.io/react/docs/perf.html)
### 浏览器开发者工具

CPU分析器的Flame图也有助于在应用程序中查找性能问题。

> Flame图显示性能展示文件中每毫秒代码的JavaScript堆栈的状态。 这给你一个方法来确切地知道哪个函数在记录期间的哪个点执行，运行了多长时间，以及是从哪里被调用的 - Mozilla

Firefox: [see here](https://developer.mozilla.org/en-US/docs/Tools/Performance/Flame_Chart)
Chrome: [see here](https://addyosmani.com/blog/devtools-flame-charts/)

---

感谢阅读以及一切能让React应用性能提高的方式！

---
## 作者的补充：

> 在检查每个子组件的列表组件上使用shouldComponentUpdate（），并不是非常有用。

当你有很多大列表的时候，这个方法是很有用的。能够完全跳过列表的重新渲染时一个巨大的胜利。但是如果你的应用中只有一个大列表，那么这样做其实没有任何效果，因为你的任何操作都是基于这个列表的，意味着列表中的数据肯定会有所改变，那么你完全可以跳过对更新条件的检查。

