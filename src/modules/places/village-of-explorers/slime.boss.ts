import { system, world } from '@minecraft/server'
import { MinecraftEntityTypes } from '@minecraft/vanilla-data'
import { Loot, ms } from 'lib'
import { Boss } from 'lib/rpg/boss'
import { Group } from 'lib/rpg/place'
import { BossSlimeBall } from './village-of-explorers'

export function createBossSlime(group: Group) {
  const boss = Boss.create()
    .group(group)
    .id('slime')
    .name('Магический Слайм')
    .typeId(MinecraftEntityTypes.Slime)
    .loot(
      new Loot('slime boss')
        .itemStack(BossSlimeBall)
        .amount({
          '40...64': '2%',
          '65...128': '1%',
        })

        .item('SlimeBall')
        .amount({
          '0...10': '10%',
          '11...64': '40%',
          '65...256': '50%',
        }).build,
    )
    .respawnTime(ms.from('min', 10))
    .spawnEvent(true)

  system.runJobInterval(() => {
    if (!boss.location.valid || !boss.region || !boss.entity?.isValid()) return

    const slimes = world.overworld.getEntities({
      location: boss.location,
      maxDistance: boss.region.radius,
      type: boss.entity.typeId,
    })
    if (!slimes.length) return

    const frogs = world.overworld.getEntities({
      location: boss.location,
      maxDistance: boss.region.radius + 10,
      type: MinecraftEntityTypes.Frog,
    })
    for (const frog of frogs) frog.remove()
  }, 10)

  world.afterEvents.entityHurt.subscribe(({ hurtEntity }) => {
    if (!boss.location.valid || !boss.region || !boss.entity?.isValid()) return
    if (hurtEntity.id !== boss.entity.id) return

    const health = hurtEntity.getComponent('health')
    if (!health) return

    const { currentValue: hp, effectiveMax: max } = health
    const half = max / 2
    if (hp < half) {
      const quarter = half / 2
      const level = hp < quarter ? 'big' : 'normal'

      const spawn = () =>
        hurtEntity.dimension.spawnEntity(`${MinecraftEntityTypes.Slime}<lw:slime_${level}>`, hurtEntity.location)

      spawn()
      if (level === 'big') spawn()
    }
  })

  return boss
}