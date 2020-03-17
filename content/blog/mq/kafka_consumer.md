---
title: kafka 消费模型要点
date: '2020-02-29T10:08:00.000Z'
---

1. 一个消费者实例一定属于一个 ConsumerGroup
2. ConsumerGroup 中的 consumer 实例可以消费一个或多个 Partition
3. 在同一个 ConsumerGroup 中，同一时刻每个 Partition 只能有一个 consumer 实例在消费
4. 每个 ConsumerGroup 中都有一个 Coordinator 来负责维护 Consumer 与 partition 的对应关系，当 Consumer 或者 Partition 发生变更时，会触发 Coordinator 进行 rebalance，重新分配 Consumer 与 Partition 的对应关系
5. Consumer 中维护与 Coordinator 的心跳，这样 Coordinator 就能感知到 Consumer 的状态，在 Consumer 故障时及时进行 rebalance

kafka 消费机制：先订阅，再拉取
